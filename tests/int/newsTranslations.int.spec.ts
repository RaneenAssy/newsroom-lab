// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { buildTranslationData, oppositeLang } from '@/collections/newsTranslations'

const source = {
  id: 'a1',
  uuid: 'group-1',
  lang: 'en' as const,
  title: 'Gulf stocks edge higher',
  description: '<p>Body</p>',
  url: 'no_url',
  source: 'Sample data',
  status: 'published',
  publishedAt: '2026-10-06T10:00:00.000Z',
  slug: 'gulf-stocks-edge-higher',
  mainCategory: { id: 'cat-1', name: 'Markets' },
  categories: ['cat-1', { id: 'cat-2' }],
  countries: [{ id: 'row1', code: 'ae', country: 'United Arab Emirates' }],
  tags: [{ id: 'row2', kind: 'country', key: 'ae', role: 'mentioned', score: 1, source: 'editor' }],
  mainAuthor: 'staff-1',
  scheduleTimezone: 'Asia/Dubai',
}

describe('oppositeLang', () => {
  it('flips en and ar', () => {
    expect(oppositeLang('en')).toBe('ar')
    expect(oppositeLang('ar')).toBe('en')
  })
})

describe('buildTranslationData', () => {
  const draft = buildTranslationData(source)

  it('keeps the story identity and flips the language', () => {
    expect(draft.uuid).toBe('group-1')
    expect(draft.lang).toBe('ar')
    expect(draft.title).toBe(source.title)
    expect(draft.description).toBe(source.description)
  })

  it('always starts as an unpublished draft with no slug or publish date', () => {
    expect(draft.status).toBe('draft')
    expect(draft).not.toHaveProperty('slug')
    expect(draft).not.toHaveProperty('publishedAt')
    expect(draft).not.toHaveProperty('id')
  })

  it('marks the provenance as a manual translation', () => {
    expect(draft.contentOrigin).toBe('TRANSLATION_MANUAL')
  })

  it('flattens populated relationships to ids and drops array row ids', () => {
    expect(draft.mainCategory).toBe('cat-1')
    expect(draft.categories).toEqual(['cat-1', 'cat-2'])
    expect(draft.countries).toEqual([{ code: 'ae', country: 'United Arab Emirates' }])
    expect(draft.tags).toEqual([{ kind: 'country', key: 'ae', role: 'mentioned', score: 1, source: 'editor' }])
    expect(draft.mainAuthor).toBe('staff-1')
  })

  it('works the other way round (Arabic → English)', () => {
    expect(buildTranslationData({ ...source, lang: 'ar' }).lang).toBe('en')
  })
})
