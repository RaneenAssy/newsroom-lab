import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { listCommentThreads, postComment } from '@/comments/comments'
import { COMMENT_MAX_LENGTH, COMMENT_RATE_LIMIT } from '@/comments/limits'

// Runs against the configured database; everything it creates is tagged with `run` and removed afterwards.
let payload: Payload
const run = `cmt-test-${Date.now().toString(36)}`
const ids = { category: '', article: '', draft: '', closed: '', other: '' }
const readers: string[] = []

const makeArticle = async (suffix: string, data: Record<string, unknown> = {}) =>
  (
    await payload.create({
      collection: 'news',
      data: {
        title: `${run} ${suffix}`,
        slug: `${run}-${suffix}`,
        status: 'published',
        lang: 'en',
        mainCategory: ids.category,
        scheduleTime: new Date().toISOString(),
        scheduleTimezone: 'UTC',
        publishedAt: new Date().toISOString(),
        ...data,
      } as never,
      overrideAccess: true,
    })
  ).id

/** A new reader per test, so the per-minute rate limit never carries over between tests. */
const makeReader = async (name: string) => {
  const email = `${name}-${readers.length}@${run}.test`
  const id = (await payload.create({ collection: 'users', data: { name, email, status: true, active: true }, overrideAccess: true })).id
  readers.push(id)
  return id
}

const post = (readerId: string, articleId: string, body: string, parentId?: string) => postComment(payload, { readerId, articleId, body, parentId })

describe('comments', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    ids.category = (await payload.create({ collection: 'news-categories', data: { name: run, slug: run, status: true } as never, overrideAccess: true })).id
    ids.article = await makeArticle('main')
    ids.other = await makeArticle('other')
    ids.draft = await makeArticle('draft', { status: 'draft' })
    ids.closed = await makeArticle('closed', { commentsEnabled: false })
  })

  afterAll(async () => {
    const articles = [ids.article, ids.other, ids.draft, ids.closed]
    await payload.delete({ collection: 'comments', where: { article: { in: articles } }, overrideAccess: true })
    await payload.delete({ collection: 'news', where: { id: { in: articles } }, overrideAccess: true })
    await payload.delete({ collection: 'users', where: { id: { in: readers } }, overrideAccess: true })
    await payload.delete({ collection: 'news-categories', id: ids.category, overrideAccess: true })
  })

  it('posts a comment and a reply, and lists them as one thread', async () => {
    const readerA = await makeReader('readera')
    const readerB = await makeReader('readerb')
    const top = await post(readerA, ids.article, '  First!  ')
    expect(top.ok).toBe(true)
    const reply = await post(readerB, ids.article, 'A reply', top.ok ? top.id : undefined)
    expect(reply.ok).toBe(true)

    const { threads, count } = await listCommentThreads(payload, ids.article)
    expect(count).toBe(2)
    expect(threads).toHaveLength(1)
    expect(threads[0]).toMatchObject({ body: 'First!', authorName: 'readera', removed: false })
    expect(threads[0]!.replies.map((r) => r.body)).toEqual(['A reply'])
    // Only public fields reach the page.
    expect(Object.keys(threads[0]!).sort()).toEqual(['authorName', 'body', 'createdAt', 'id', 'removed', 'replies'])
  })

  it('rejects empty, too long, and duplicate comments', async () => {
    const readerB = await makeReader('readerb')
    expect(await post(readerB, ids.other, '   ')).toEqual({ ok: false, error: 'Write a comment first.' })
    expect((await post(readerB, ids.other, 'x'.repeat(COMMENT_MAX_LENGTH + 1))).ok).toBe(false)
    expect((await post(readerB, ids.other, 'Same words')).ok).toBe(true)
    expect(await post(readerB, ids.other, 'Same words')).toEqual({ ok: false, error: 'You already posted this comment.' })
  })

  it('only allows comments on published articles that have comments turned on', async () => {
    const readerA = await makeReader('readera')
    expect(await post(readerA, ids.draft, 'Hello')).toEqual({ ok: false, error: 'This article is not available.' })
    expect(await post(readerA, ids.closed, 'Hello')).toEqual({ ok: false, error: 'Comments are turned off for this article.' })
  })

  it('keeps replies one level deep and on the same article', async () => {
    const readerA = await makeReader('readera')
    const top = await post(readerA, ids.other, 'Thread start')
    if (!top.ok) throw new Error(top.error)
    const reply = await post(readerA, ids.other, 'Level one', top.id)
    if (!reply.ok) throw new Error(reply.error)

    expect(await post(readerA, ids.other, 'Level two', reply.id)).toEqual({ ok: false, error: 'Replies cannot be replied to.' })
    expect(await post(readerA, ids.article, 'Wrong article', top.id)).toEqual({ ok: false, error: 'A reply must be on the same article.' })
  })

  it('limits how fast one reader can post', async () => {
    const reader = await makeReader('fastreader')
    for (let i = 0; i < COMMENT_RATE_LIMIT; i++) expect((await post(reader, ids.other, `Quick ${i}`)).ok).toBe(true)
    expect(await post(reader, ids.other, 'One too many')).toEqual({ ok: false, error: 'You are commenting too fast. Wait a minute and try again.' })
  })

  it('hides moderated comments, keeping a placeholder only when visible replies hang off them', async () => {
    const readerA = await makeReader('readera')
    const readerB = await makeReader('readerb')
    const lonely = await post(readerB, ids.article, 'Spam spam')
    if (!lonely.ok) throw new Error(lonely.error)
    await payload.update({ collection: 'comments', id: lonely.id, data: { status: 'hidden' }, overrideAccess: true })

    const { threads: before } = await listCommentThreads(payload, ids.article)
    expect(before.some((t) => t.id === lonely.id)).toBe(false)

    const parentId = before.find((t) => t.body === 'First!')!.id
    await payload.update({ collection: 'comments', id: parentId, data: { status: 'hidden' }, overrideAccess: true })
    const { threads, count } = await listCommentThreads(payload, ids.article)
    const placeholder = threads.find((t) => t.id === parentId)!
    expect(placeholder).toMatchObject({ removed: true, body: '', authorName: '' })
    expect(placeholder.replies).toHaveLength(1)
    expect(count).toBe(1)

    expect(await post(readerA, ids.article, 'Reply to removed', parentId)).toEqual({ ok: false, error: 'That comment was removed.' })
  })

  it('stamps the excerpt and the hide time', async () => {
    const readerA = await makeReader('readera')
    const created = await post(readerA, ids.article, 'Line one\n\nline two')
    if (!created.ok) throw new Error(created.error)
    const hidden = await payload.update({ collection: 'comments', id: created.id, data: { status: 'hidden' }, overrideAccess: true })
    expect(hidden.excerpt).toBe('Line one line two')
    expect(hidden.hiddenAt).toBeTruthy()
    const shown = await payload.update({ collection: 'comments', id: created.id, data: { status: 'visible' }, overrideAccess: true })
    expect(shown.hiddenAt).toBeNull()
  })

  it('does not accept new comments through the API', async () => {
    const readerA = await makeReader('readera')
    await expect(
      payload.create({ collection: 'comments', data: { article: ids.article, author: readerA, body: 'via API', status: 'visible' }, overrideAccess: false }),
    ).rejects.toThrow()
  })
})
