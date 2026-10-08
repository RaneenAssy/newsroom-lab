import { ValidationError, type Payload, type Where } from 'payload'

import { COMMENT_MAX_LENGTH, COMMENT_MIN_LENGTH, COMMENT_RATE_LIMIT } from './limits'
import type { Comment, News, User } from '../payload-types'

/** Where a public visitor may see an article: published and not soft-deleted. */
export const publicArticleWhere: Where = {
  and: [{ status: { equals: 'published' } }, { active: { not_equals: false } }],
}

export const findPublicArticle = async (payload: Payload, slug: string): Promise<News | null> => {
  const found = await payload.find({
    collection: 'news',
    where: { and: [{ slug: { equals: slug } }, publicArticleWhere] },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  return found.docs[0] ?? null
}

/** What the page receives for one comment: no emails or other customer fields. */
export type PublicComment = {
  id: string
  authorName: string
  body: string
  createdAt: string
  /** Hidden by staff but kept as a placeholder because it has visible replies. */
  removed: boolean
  replies: PublicComment[]
}

type CommentRow = Pick<Comment, 'id' | 'body' | 'status' | 'author' | 'createdAt'>

const toPublic = (comment: CommentRow, replies: PublicComment[] = []): PublicComment => {
  const removed = comment.status === 'hidden'
  return {
    id: comment.id,
    authorName: removed ? '' : typeof comment.author === 'object' ? (comment.author as User).name : 'Reader',
    body: removed ? '' : comment.body,
    createdAt: comment.createdAt,
    removed,
    replies,
  }
}

/** The article's comments as threads: newest conversations first, replies oldest first under each. */
export const listCommentThreads = async (payload: Payload, articleId: string): Promise<{ threads: PublicComment[]; count: number }> => {
  const { docs } = await payload.find({
    collection: 'comments',
    where: { article: { equals: articleId } },
    sort: 'createdAt',
    depth: 1,
    pagination: false,
    overrideAccess: true,
    select: { body: true, status: true, author: true, parent: true, createdAt: true },
    populate: { users: { name: true } },
  })

  const replies = new Map<string, PublicComment[]>()
  for (const c of docs) {
    const parentId = typeof c.parent === 'object' ? c.parent?.id : c.parent
    if (parentId && c.status === 'visible') replies.set(parentId, [...(replies.get(parentId) ?? []), toPublic(c)])
  }
  const threads = docs
    .filter((c) => !c.parent && (c.status === 'visible' || replies.has(c.id)))
    .map((c) => toPublic(c, replies.get(c.id)))
    .reverse()
  const count = docs.filter((c) => c.status === 'visible').length
  return { threads, count }
}

export type PostCommentInput = { readerId: string; articleId: string; body: string; parentId?: string | null }
export type PostCommentResult = { ok: true; id: string } | { ok: false; error: string }

/** All the rules for a reader posting a comment. The caller has already established who the reader is. */
export const postComment = async (payload: Payload, input: PostCommentInput): Promise<PostCommentResult> => {
  const body = input.body.replace(/\r\n/g, '\n').trim()
  if (body.length < COMMENT_MIN_LENGTH) return { ok: false, error: 'Write a comment first.' }
  if (body.length > COMMENT_MAX_LENGTH) return { ok: false, error: `Comments can be up to ${COMMENT_MAX_LENGTH} characters.` }

  const article = (
    await payload.find({
      collection: 'news',
      where: { and: [{ id: { equals: input.articleId } }, publicArticleWhere] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      select: { commentsEnabled: true },
    })
  ).docs[0]
  if (!article) return { ok: false, error: 'This article is not available.' }
  if (article.commentsEnabled === false) return { ok: false, error: 'Comments are turned off for this article.' }

  const recent = await payload.find({
    collection: 'comments',
    where: { and: [{ author: { equals: input.readerId } }, { createdAt: { greater_than: new Date(Date.now() - 60_000).toISOString() } }] },
    depth: 0,
    limit: COMMENT_RATE_LIMIT,
    overrideAccess: true,
    select: { body: true, article: true },
  })
  if (recent.totalDocs >= COMMENT_RATE_LIMIT) return { ok: false, error: 'You are commenting too fast. Wait a minute and try again.' }
  if (recent.docs.some((c) => c.body === body && (typeof c.article === 'object' ? c.article.id : c.article) === input.articleId)) {
    return { ok: false, error: 'You already posted this comment.' }
  }

  try {
    const created = await payload.create({
      collection: 'comments',
      data: { article: input.articleId, author: input.readerId, body, parent: input.parentId || undefined, status: 'visible' },
      overrideAccess: true,
      depth: 0,
    })
    return { ok: true, id: created.id }
  } catch (error) {
    if (error instanceof ValidationError) return { ok: false, error: error.data.errors[0]?.message ?? 'This comment could not be posted.' }
    throw error
  }
}
