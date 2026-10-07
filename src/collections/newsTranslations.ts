import type { Endpoint, PayloadRequest } from 'payload'

/**
 * English/Arabic linking. As in the legacy system, a story's language versions are separate articles
 * that share one `uuid` (the "translation group"). At most one article per language per group.
 */
export type NewsLang = 'en' | 'ar'
export const LANG_LABEL: Record<NewsLang, string> = { en: 'English', ar: 'Arabic' }
export const oppositeLang = (lang: NewsLang): NewsLang => (lang === 'en' ? 'ar' : 'en')

type NewsDoc = Record<string, any> & { id: string; uuid: string; lang: NewsLang; title: string }

const idOf = (value: unknown): string | undefined =>
  value && typeof value === 'object' ? String((value as { id: string }).id) : value ? String(value) : undefined

/**
 * The starting point for a translation: a draft in the other language that keeps the story's identity
 * (uuid, categories, countries, tags, authors) and carries the original text across for the translator
 * to replace. Publishing fields are left out so a copy never goes live by accident.
 */
export function buildTranslationData(source: NewsDoc): Record<string, unknown> {
  const strip = <T extends { id?: unknown }>(rows?: T[] | null) => (rows ?? []).map(({ id: _id, ...rest }) => rest)
  return {
    uuid: source.uuid,
    lang: oppositeLang(source.lang),
    status: 'draft',
    title: source.title,
    description: source.description,
    url: source.url ?? 'no_url',
    source: source.source,
    mainCategory: idOf(source.mainCategory),
    categories: (source.categories ?? []).map(idOf).filter(Boolean),
    countries: strip(source.countries),
    tags: strip(source.tags),
    mainAuthor: idOf(source.mainAuthor),
    contentReviewer: idOf(source.contentReviewer),
    urlToImage: idOf(source.urlToImage),
    imageSourceCredit: source.imageSourceCredit,
    imageCredit: source.imageCredit,
    isFeatured: source.isFeatured,
    scheduleTime: new Date().toISOString(),
    scheduleTimezone: source.scheduleTimezone ?? 'UTC',
    contentOrigin: 'TRANSLATION_MANUAL',
  }
}

const json = (body: unknown, status = 200) => Response.json(body, { status })
const fail = (error: unknown) => {
  const status = typeof (error as { status?: number })?.status === 'number' ? (error as { status: number }).status : 500
  return json({ message: error instanceof Error ? error.message : 'Unexpected error' }, status)
}

const requireUser = (req: PayloadRequest) => {
  if (!req.user) throw Object.assign(new Error('You must be logged in.'), { status: 401 })
}

/** Reads/writes go through the logged-in user's permissions (the local API bypasses access by default). */
const asUser = (req: PayloadRequest) => ({ req, overrideAccess: false as const })

const getArticle = async (req: PayloadRequest, id: string) =>
  (await req.payload.findByID({ collection: 'news', id, depth: 0, ...asUser(req) })) as unknown as NewsDoc

const siblingsOf = async (req: PayloadRequest, doc: NewsDoc) =>
  (
    await req.payload.find({
      collection: 'news',
      where: { and: [{ uuid: { equals: doc.uuid } }, { id: { not_equals: doc.id } }] },
      depth: 0,
      limit: 10,
      pagination: false,
      ...asUser(req),
    })
  ).docs as unknown as NewsDoc[]

const summary = (d: NewsDoc) => ({ id: d.id, title: d.title, lang: d.lang, status: d.status, slug: d.slug })
const conflict = (message: string) => Object.assign(new Error(message), { status: 409 })

export const newsTranslationEndpoints: Endpoint[] = [
  // GET /api/news/:id/translations — the article's language versions
  {
    path: '/:id/translations',
    method: 'get',
    handler: async (req) => {
      try {
        requireUser(req)
        const doc = await getArticle(req, String(req.routeParams?.id))
        return json({ current: summary(doc), translations: (await siblingsOf(req, doc)).map(summary) })
      } catch (e) {
        return fail(e)
      }
    },
  },

  // GET /api/news/:id/linkable — articles in the other language that could be linked as its translation
  {
    path: '/:id/linkable',
    method: 'get',
    handler: async (req) => {
      try {
        requireUser(req)
        const doc = await getArticle(req, String(req.routeParams?.id))
        if ((await siblingsOf(req, doc)).some((s) => s.lang === oppositeLang(doc.lang))) return json({ candidates: [] })
        const others = (
          await req.payload.find({
            collection: 'news',
            where: { and: [{ lang: { equals: oppositeLang(doc.lang) } }, { id: { not_equals: doc.id } }] },
            sort: '-updatedAt',
            depth: 0,
            limit: 200,
            pagination: false,
            ...asUser(req),
          })
        ).docs as unknown as NewsDoc[]
        // Only articles that are not already linked to something.
        const groups = await req.payload.find({
          collection: 'news',
          where: { uuid: { in: others.map((o) => o.uuid) } },
          depth: 0,
          limit: 1000,
          pagination: false,
          select: { uuid: true },
          ...asUser(req),
        })
        const size = new Map<string, number>()
        for (const g of groups.docs as unknown as NewsDoc[]) size.set(g.uuid, (size.get(g.uuid) ?? 0) + 1)
        return json({ candidates: others.filter((o) => size.get(o.uuid) === 1).map(summary) })
      } catch (e) {
        return fail(e)
      }
    },
  },

  // POST /api/news/:id/create-translation — new draft in the other language, linked to this article
  {
    path: '/:id/create-translation',
    method: 'post',
    handler: async (req) => {
      try {
        requireUser(req)
        const source = await getArticle(req, String(req.routeParams?.id))
        const target = oppositeLang(source.lang)
        if ((await siblingsOf(req, source)).some((s) => s.lang === target)) {
          throw conflict(`This article already has an ${LANG_LABEL[target]} version.`)
        }
        const created = await req.payload.create({
          collection: 'news',
          data: buildTranslationData(source) as never,
          depth: 0,
          ...asUser(req),
        })
        return json({ doc: summary(created as unknown as NewsDoc) }, 201)
      } catch (e) {
        return fail(e)
      }
    },
  },

  // POST /api/news/:id/link-translation { targetId } — link two existing articles
  {
    path: '/:id/link-translation',
    method: 'post',
    handler: async (req) => {
      try {
        requireUser(req)
        const body = (await req.json?.()) as { targetId?: string } | undefined
        if (!body?.targetId) throw Object.assign(new Error('targetId is required.'), { status: 400 })
        const source = await getArticle(req, String(req.routeParams?.id))
        const target = await getArticle(req, body.targetId)
        if (source.id === target.id) throw conflict('An article cannot be linked to itself.')
        if (source.lang === target.lang) throw conflict('A translation must be in the other language.')
        if ((await siblingsOf(req, source)).length) throw conflict('This article is already linked. Unlink it first.')
        if ((await siblingsOf(req, target)).length) throw conflict('That article is already linked to another one.')
        await req.payload.update({ collection: 'news', id: target.id, data: { uuid: source.uuid }, depth: 0, ...asUser(req) })
        return json({ linked: summary(target) })
      } catch (e) {
        return fail(e)
      }
    },
  },

  // POST /api/news/:id/unlink-translation — detach this article into its own group
  {
    path: '/:id/unlink-translation',
    method: 'post',
    handler: async (req) => {
      try {
        requireUser(req)
        const doc = await getArticle(req, String(req.routeParams?.id))
        if (!(await siblingsOf(req, doc)).length) throw conflict('This article is not linked to a translation.')
        await req.payload.update({ collection: 'news', id: doc.id, data: { uuid: crypto.randomUUID() }, depth: 0, ...asUser(req) })
        return json({ unlinked: true })
      } catch (e) {
        return fail(e)
      }
    },
  },
]
