import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

export type ArticleType = 'news' | 'blog'
export type AuditAction = 'CREATE' | 'EDIT' | 'DELETE' | 'CHANGE_STATUS' | 'ENRICH' | 'ENRICH.EDIT' | 'ENRICH.DECLINE' | 'RE-ENRICH'
type JsonValue = string | number | boolean | unknown[] | { [key: string]: unknown } | null
export type ChangedField = { field: string; before: JsonValue; after: JsonValue }

export const AUDIT_ACTIONS: AuditAction[] = [
  'CREATE',
  'EDIT',
  'DELETE',
  'CHANGE_STATUS',
  'ENRICH',
  'ENRICH.EDIT',
  'ENRICH.DECLINE',
  'RE-ENRICH',
]

/** Only these fields are diffed — same idea as TRACKED_FIELDS in the legacy articleAuditLog.service. */
export const NEWS_TRACKED_FIELDS = [
  'title',
  'uuid', // translation group: changes when an article is linked/unlinked to its other-language version
  'slug',
  'description',
  'status',
  'categories',
  'mainCategory',
  'countries',
  'lang',
  'urlToImage',
  'altText',
  'imageSourceCredit',
  'imageCredit',
  'canonicalUrl',
  'tocEnabled',
  'isFeatured',
  'scheduleTime',
  'scheduleTimezone',
  'metaTitle',
  'metaDescription',
  'metaKeywords',
  'schemaMarkup',
  'notificationEnabled',
  'customNotificationTitle',
  'publishedAt',
  'newsBy',
  'source',
  'url',
  'active',
  'postEnrichmentStatus',
] as const

/** Makes two versions of a doc comparable: populated relations → ids, stable key order, no row ids. */
function normalize(value: unknown): unknown {
  if (value === undefined || value === null) return null
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalize)
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    // A populated relationship: keep only its id.
    if ('id' in record && ('createdAt' in record || 'updatedAt' in record)) return String(record.id)
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(record).sort()) {
      if (key === 'id') continue // array-row ids change without meaning
      out[key] = normalize(record[key])
    }
    return out
  }
  return value
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export function getChangedFields(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
  trackedFields: readonly string[],
): ChangedField[] {
  const changes: ChangedField[] = []
  for (const field of trackedFields) {
    const before = normalize(previous[field]) as JsonValue
    const after = normalize(next[field]) as JsonValue
    if (!same(before, after)) changes.push({ field, before, after })
  }
  return changes
}

type WriteParams = {
  req: PayloadRequest
  articleType: ArticleType
  doc: Record<string, unknown>
  action: AuditAction
  changedFields?: ChangedField[]
}

/**
 * Appends one audit entry. Best-effort by design: an audit failure is logged but never blocks the
 * article save, matching the legacy writeAuditLog.
 */
export async function writeAuditLog({ req, articleType, doc, action, changedFields }: WriteParams) {
  try {
    const staffId = req.user?.collection === 'staff' ? req.user.id : undefined
    const isSystemAction = !staffId || Boolean(req.context.systemAction)
    await req.payload.create({
      collection: 'article-audit-logs',
      data: {
        articleType,
        articleId: String(doc.id),
        articleTitle: typeof doc.title === 'string' ? doc.title : undefined,
        articleSlug: typeof doc.slug === 'string' ? doc.slug : undefined,
        articleLang: typeof doc.lang === 'string' ? doc.lang : undefined,
        action,
        actionBy: isSystemAction ? undefined : staffId,
        isSystemAction,
        changedFields: changedFields?.length
          ? changedFields.map((c) => ({ field: c.field, before: JSON.stringify(c.before), after: JSON.stringify(c.after) }))
          : undefined,
      },
      overrideAccess: true,
      req,
    })
  } catch (error) {
    req.payload.logger.error({ err: error, articleType, articleId: doc.id, action }, '[ArticleAudit] failed to write audit log')
  }
}

/**
 * Audit hooks for an article collection. `softDeleteField` is the boolean that stands in for
 * deletion (the legacy API sets `active: false` rather than removing the row).
 */
export function articleAuditHooks(articleType: ArticleType, trackedFields: readonly string[], softDeleteField = 'active') {
  const afterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
    if (req.context.skipAudit) return doc

    if (operation === 'create') {
      await writeAuditLog({ req, articleType, doc, action: 'CREATE' })
      return doc
    }

    const changes = getChangedFields(previousDoc ?? {}, doc, trackedFields)
    if (!changes.length) return doc

    const wasDeleted = previousDoc?.[softDeleteField] !== false && doc[softDeleteField] === false
    if (wasDeleted) {
      await writeAuditLog({ req, articleType, doc, action: 'DELETE' })
      return doc
    }

    const statusChange = changes.filter((c) => c.field === 'status')
    const otherChanges = changes.filter((c) => c.field !== 'status')
    if (otherChanges.length) await writeAuditLog({ req, articleType, doc, action: 'EDIT', changedFields: otherChanges })
    if (statusChange.length) await writeAuditLog({ req, articleType, doc, action: 'CHANGE_STATUS', changedFields: statusChange })
    return doc
  }

  // Hard deletes (admin "Delete" / API) — the soft-delete path is handled in afterChange.
  const afterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
    if (!req.context.skipAudit) await writeAuditLog({ req, articleType, doc, action: 'DELETE' })
    return doc
  }

  return { afterChange: [afterChange], afterDelete: [afterDelete] }
}
