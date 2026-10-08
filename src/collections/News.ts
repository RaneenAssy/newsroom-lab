import { ValidationError, type CollectionBeforeChangeHook, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'
import { hasPermission } from '../access'
import { articleAuditHooks, NEWS_TRACKED_FIELDS } from '../audit/articleAudit'
import { articleBodyField } from '../fields/articleBody'
import { newsPreviewUrl } from '../preview/previewUrl'
import { LANG_LABEL, newsTranslationEndpoints, type NewsLang } from './newsTranslations'

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)

/** Fills uuid + slug on create, and keeps the slug unique (suffixing on collision). */
const prepareIdentity: CollectionBeforeValidateHook = async ({ data, originalDoc, operation, req }) => {
  if (!data) return data
  const next = { ...data }

  if (operation === 'create' && !next.uuid) next.uuid = crypto.randomUUID()

  const wanted = typeof next.slug === 'string' && next.slug.trim() ? slugify(next.slug) : slugify(String(next.title ?? originalDoc?.title ?? ''))
  if (wanted && wanted !== originalDoc?.slug) {
    const clash = await req.payload.find({
      collection: 'news',
      where: { and: [{ slug: { equals: wanted } }, ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : [])] },
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    })
    next.slug = clash.totalDocs ? `${wanted}-${Math.random().toString(36).slice(2, 6)}` : wanted
  } else if (wanted) {
    next.slug = wanted
  }
  return next
}


/** One article per language within a translation group (same `uuid`). */
const onePerLanguage: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  const uuid = data?.uuid ?? originalDoc?.uuid
  const lang = (data?.lang ?? originalDoc?.lang) as NewsLang | undefined
  if (!uuid || !lang) return data
  const clash = await req.payload.find({
    collection: 'news',
    where: { and: [{ uuid: { equals: uuid } }, { lang: { equals: lang } }, ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : [])] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  if (clash.totalDocs) {
    throw new ValidationError({
      collection: 'news',
      errors: [{ path: 'lang', message: `This story already has an ${LANG_LABEL[lang]} version.` }],
    })
  }
  return data
}

/** Stamps the creator/byline, and flips `aiOrigin.humanEdited` the first time a human saves an AI draft. */
const stampAuthorship: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  const staff = req.user?.collection === 'staff' ? req.user : undefined
  if (operation === 'create') {
    if (staff && !data.createdBy) data.createdBy = staff.id
    if (staff && !data.newsBy) data.newsBy = (staff as { name?: string }).name ?? staff.email
  }
  if (operation === 'update' && staff && originalDoc?.aiOrigin?.generated) {
    data.aiOrigin = { ...(originalDoc.aiOrigin ?? {}), ...(data.aiOrigin ?? {}), humanEdited: true }
  }
  return data
}

const tagKinds = ['symbol', 'country', 'region', 'sector', 'industry', 'topic']
const contentOrigins = [
  'MANUAL_ORIGINAL',
  'MANUAL_AI_ASSISTED',
  'AI_GENERATED_EDITOR_TRIGGERED',
  'AUTOMATED_DATA_BRIEF',
  'TRANSLATION_MANUAL',
  'TRANSLATION_AI',
  'SYNDICATED_VERBATIM',
  'THIRD_PARTY_SUMMARY_OR_REWRITE',
  'MIXED',
  'UNKNOWN',
]
const licensingPermissions = [
  'verbatim_republication',
  'summarization',
  'adaptation',
  'rewriting',
  'translation',
  'headline_reuse',
  'quotation',
  'images',
  'charts',
  'search_indexing',
  'google_news',
  'monetization',
  'storage_retention',
]

export const News: CollectionConfig = {
  slug: 'news',
  labels: { singular: 'News Article', plural: 'News' },
  admin: {
    useAsTitle: 'title',
    group: 'News',
    defaultColumns: ['title', 'mainCategory', 'lang', 'status', 'publishedAt', 'postEnrichmentStatus'],
    listSearchableFields: ['title', 'slug', 'source'],
    // Live Preview: the article rendered as readers would see it, updating while staff type (see src/app/(preview)).
    // It needs a saved article, so a brand-new one shows no Preview tab until its first save.
    livePreview: {
      url: ({ data, req }) => newsPreviewUrl(req, data?.id),
      breakpoints: [
        { label: 'Mobile', name: 'mobile', width: 375, height: 667 },
        { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
        { label: 'Desktop', name: 'desktop', width: 1280, height: 800 },
      ],
    },
  },
  defaultSort: '-publishedAt',
  access: {
    read: hasPermission('view_all_news', 'edit_news'),
    create: hasPermission('add_news'),
    update: hasPermission('edit_news'),
    delete: hasPermission('delete_news'),
  },
  endpoints: newsTranslationEndpoints,
  hooks: {
    beforeValidate: [prepareIdentity, onePerLanguage],
    beforeChange: [stampAuthorship],
    ...articleAuditHooks('news', NEWS_TRACKED_FIELDS),
  },
  indexes: [
    { fields: ['uuid', 'url', 'lang'], unique: true },
    { fields: ['lang', 'status', 'publishedAt'] },
    { fields: ['mainAuthor', 'status', 'lang', 'publishedAt'] },
  ],
  fields: [
    // ───────────────────────────── Sidebar ─────────────────────────────
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Published', value: 'published' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'lang',
      type: 'select',
      required: true,
      defaultValue: 'en',
      options: [
        { label: 'English', value: 'en' },
        { label: 'Arabic', value: 'ar' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'isFeatured', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
    { name: 'commentsEnabled', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar', description: 'Untick to soft-delete (kept in the database and the audit log).' },
    },
    {
      name: 'translations',
      type: 'ui',
      admin: { position: 'sidebar', components: { Field: '/components/admin/TranslationsPanel#TranslationsPanel' } },
    },
    {
      name: 'auditHistory',
      type: 'ui',
      admin: { position: 'sidebar', components: { Field: '/components/admin/AuditHistoryLink#AuditHistoryLink' } },
    },
    {
      name: 'readerComments',
      type: 'ui',
      admin: { position: 'sidebar', components: { Field: '/components/admin/CommentsLink#CommentsLink' } },
    },

    {
      type: 'tabs',
      tabs: [
        // ───────────────────────────── Content ─────────────────────────────
        {
          label: 'Content',
          fields: [
            { name: 'title', type: 'text', required: true },
            {
              name: 'slug',
              type: 'text',
              unique: true,
              index: true,
              admin: { description: 'Generated from the title if left empty. Kept unique automatically.' },
            },
            articleBodyField({ name: 'description', required: false }),
            {
              type: 'row',
              fields: [
                { name: 'source', type: 'text' },
                { name: 'url', type: 'text', required: true, defaultValue: 'no_url', label: 'Source URL' },
                { name: 'canonicalUrl', type: 'text' },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'urlToImage', type: 'upload', relationTo: 'media', label: 'Image' },
                { name: 'altText', type: 'text' },
              ],
            },
            { name: 'imageSourceCredit', type: 'text' },
            {
              name: 'imageCredit',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'kind',
                      type: 'select',
                      options: [
                        { label: 'AI generated', value: 'ai' },
                        { label: 'Open source', value: 'open_source' },
                      ],
                    },
                    {
                      name: 'tool',
                      type: 'select',
                      options: ['google_gemini', 'openai_gpt', 'anthropic_claude', 'xai_grok'],
                      admin: { condition: (_d, sibling) => sibling?.kind === 'ai' },
                    },
                    {
                      name: 'author',
                      type: 'text',
                      admin: { condition: (_d, sibling) => sibling?.kind === 'open_source' },
                    },
                    {
                      name: 'site',
                      type: 'text',
                      admin: { condition: (_d, sibling) => sibling?.kind === 'open_source' },
                    },
                  ],
                },
              ],
            },
            { name: 'tocEnabled', type: 'checkbox', defaultValue: false, label: 'Show table of contents' },
          ],
        },

        // ───────────────────────────── Taxonomy ─────────────────────────────
        {
          label: 'Taxonomy & Tags',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'mainCategory', type: 'relationship', relationTo: 'news-categories', required: true },
                { name: 'categories', type: 'relationship', relationTo: 'news-categories', hasMany: true },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'mainAuthor', type: 'relationship', relationTo: 'staff' },
                { name: 'secondaryAuthor', type: 'relationship', relationTo: 'staff' },
                { name: 'contentReviewer', type: 'relationship', relationTo: 'staff' },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'newsBy', type: 'text', label: 'Byline', admin: { description: 'Defaults to the creating staff member.' } },
                { name: 'createdBy', type: 'relationship', relationTo: 'staff', admin: { readOnly: true } },
              ],
            },
            {
              name: 'countries',
              type: 'array',
              admin: { description: 'Countries the article is about.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'code', type: 'text', required: true },
                    { name: 'country', type: 'text', required: true },
                  ],
                },
              ],
            },
            {
              name: 'tags',
              type: 'array',
              admin: { description: 'Symbols, topics, countries etc. Machine-detected tags can be suppressed below.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'kind', type: 'select', required: true, options: tagKinds },
                    { name: 'key', type: 'text', required: true },
                    { name: 'role', type: 'select', defaultValue: 'mentioned', options: ['primary', 'mentioned'] },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'score', type: 'number', min: 0, max: 1, defaultValue: 0 },
                    {
                      name: 'source',
                      type: 'select',
                      required: true,
                      defaultValue: 'editor',
                      options: ['editor', 'newsroom', 'vendor', 'auto', 'derived'],
                    },
                  ],
                },
              ],
            },
            {
              name: 'suppressedTags',
              type: 'array',
              admin: { description: 'Machine tags a human rejected — never re-attached automatically.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'kind', type: 'select', required: true, options: tagKinds },
                    { name: 'key', type: 'text', required: true },
                  ],
                },
              ],
            },
            { name: 'tagsRev', type: 'number', defaultValue: 0, admin: { readOnly: true, description: 'Concurrency token for tag writers.' } },
          ],
        },

        // ───────────────────────────── SEO ─────────────────────────────
        {
          label: 'SEO',
          fields: [
            { name: 'metaTitle', type: 'text' },
            { name: 'metaDescription', type: 'textarea' },
            {
              type: 'row',
              fields: [
                { name: 'metaKeywords', type: 'text' },
                { name: 'keywords', type: 'text' },
              ],
            },
            { name: 'industry', type: 'text' },
            { name: 'schemaMarkup', type: 'json', defaultValue: [], admin: { description: 'JSON-LD blocks.' } },
          ],
        },

        // ───────────────────────────── Publishing ─────────────────────────────
        {
          label: 'Publishing',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'scheduleTime', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
                { name: 'scheduleTimezone', type: 'text', required: true, defaultValue: 'UTC', admin: { description: 'IANA name, e.g. Asia/Dubai' } },
                { name: 'publishedAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
              ],
            },
            {
              type: 'collapsible',
              label: 'Push notification',
              fields: [
                { name: 'notificationEnabled', type: 'checkbox', defaultValue: true },
                { name: 'customNotificationTitle', type: 'text' },
                { name: 'notificationPushedAt', type: 'date', admin: { readOnly: true } },
              ],
            },
          ],
        },

        // ───────────────────────────── Provenance ─────────────────────────────
        {
          label: 'Provenance',
          fields: [
            { name: 'contentOrigin', type: 'select', defaultValue: 'MANUAL_ORIGINAL', options: contentOrigins },
            { name: 'productionWorkflow', type: 'textarea' },
            { name: 'editorNotes', type: 'textarea' },
            {
              name: 'declaredSources',
              type: 'array',
              admin: { description: 'Sources an editor recorded by hand.' },
              fields: [
                { name: 'url', type: 'text', required: true },
                {
                  type: 'row',
                  fields: [
                    { name: 'publisher', type: 'text' },
                    { name: 'title', type: 'text' },
                    { name: 'publishedAt', type: 'date' },
                    { name: 'tier', type: 'number' },
                  ],
                },
                { name: 'quote', type: 'textarea' },
              ],
            },
            {
              name: 'licensing',
              type: 'group',
              fields: [
                {
                  name: 'status',
                  type: 'select',
                  defaultValue: 'NOT_APPLICABLE',
                  options: ['NOT_APPLICABLE', 'VERIFIED_PERMITTED', 'VERIFIED_PERMITTED_WITH_CONDITIONS', 'UNKNOWN', 'PROHIBITED'],
                },
                { name: 'vendor', type: 'text' },
                { name: 'termsSummary', type: 'textarea' },
                { name: 'attributionText', type: 'text' },
                { name: 'permissions', type: 'select', hasMany: true, options: licensingPermissions },
                { name: 'geoRestrictions', type: 'text', hasMany: true },
                {
                  type: 'row',
                  fields: [
                    { name: 'verifiedBy', type: 'relationship', relationTo: 'staff' },
                    { name: 'verifiedAt', type: 'date' },
                  ],
                },
              ],
            },
            {
              name: 'indexing',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'intent',
                      type: 'select',
                      defaultValue: 'INDEX',
                      options: ['INDEX', 'NOINDEX_SYNDICATED', 'NOINDEX_DERIVATIVE', 'NOINDEX_TEMPORARY'],
                    },
                    { name: 'googlebot', type: 'select', defaultValue: 'index', options: ['index', 'noindex'] },
                    { name: 'googlebotNews', type: 'select', defaultValue: 'index', options: ['index', 'noindex'] },
                  ],
                },
                { name: 'reason', type: 'text' },
                {
                  type: 'row',
                  fields: [
                    { name: 'decidedBy', type: 'relationship', relationTo: 'staff' },
                    { name: 'decidedAt', type: 'date' },
                  ],
                },
              ],
            },
            {
              name: 'editorialReview',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'reviewer', type: 'relationship', relationTo: 'staff' },
                    { name: 'reviewedAt', type: 'date' },
                  ],
                },
                { name: 'notes', type: 'textarea' },
              ],
            },
            {
              name: 'sponsored',
              type: 'group',
              fields: [
                { name: 'isSponsored', type: 'checkbox', defaultValue: false },
                {
                  type: 'row',
                  fields: [
                    { name: 'advertiser', type: 'text' },
                    { name: 'disclosureText', type: 'text' },
                  ],
                },
              ],
            },
            {
              name: 'updateHistory',
              type: 'array',
              admin: { description: 'Edits worth telling readers about. Only substantive ones advance the public modified date.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'at', type: 'date', required: true },
                    { name: 'by', type: 'relationship', relationTo: 'staff' },
                    { name: 'substantive', type: 'checkbox', defaultValue: false },
                  ],
                },
                { name: 'summary', type: 'text' },
              ],
            },
            { name: 'lastSubstantiveUpdateAt', type: 'date' },
          ],
        },

        // ───────────────────────────── AI & Enrichment ─────────────────────────────
        {
          label: 'AI & Enrichment',
          fields: [
            {
              name: 'postEnrichmentStatus',
              type: 'select',
              options: [
                { label: 'Enriching', value: 'enriching' },
                { label: 'Enriched', value: 'enriched' },
                { label: 'Partially enriched', value: 'partially_enriched' },
                { label: 'Error', value: 'error' },
              ],
            },
            { name: 'enrichmentStartedAt', type: 'date', admin: { readOnly: true } },
            {
              name: 'aiOrigin',
              type: 'group',
              admin: { description: 'Set by the AI newsroom. `humanEdited` flips automatically on the first staff save.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'generated', type: 'checkbox', defaultValue: false },
                    { name: 'humanEdited', type: 'checkbox', defaultValue: false },
                    { name: 'verificationBlockingClaims', type: 'number', defaultValue: 0 },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'provider', type: 'text' },
                    { name: 'model', type: 'text' },
                    { name: 'promptVersion', type: 'text' },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'costUsd', type: 'number' },
                    { name: 'generatedAt', type: 'date' },
                  ],
                },
                {
                  name: 'sourceCredits',
                  type: 'array',
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        { name: 'publisher', type: 'text', required: true },
                        { name: 'publisherAr', type: 'text' },
                        { name: 'title', type: 'text' },
                        { name: 'publishedAt', type: 'date' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    // Identity — kept out of the way, but unique together with url + lang (see `indexes`).
    {
      name: 'uuid',
      type: 'text',
      label: 'Translation group ID',
      index: true,
      admin: { position: 'sidebar', readOnly: true, description: 'Shared by an article and its other-language version. Use the Translations panel to link or unlink.' },
    },
  ],
}
