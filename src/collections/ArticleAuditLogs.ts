import type { CollectionConfig } from 'payload'
import { canReadAuditLogs } from '../access'
import { AUDIT_ACTIONS } from '../audit/articleAudit'

/**
 * Append-only record of what staff (or the system) did to news/blog articles. Written only by the
 * hooks in audit/articleAudit.ts — the API and admin UI can read it but never create, edit or delete.
 */
export const ArticleAuditLogs: CollectionConfig = {
  slug: 'article-audit-logs',
  labels: { singular: 'Audit Log Entry', plural: 'Audit Logs' },
  admin: {
    group: 'News',
    useAsTitle: 'articleTitle',
    defaultColumns: ['createdAt', 'articleTitle', 'action', 'actionBy', 'isSystemAction', 'articleLang'],
    listSearchableFields: ['articleTitle', 'articleSlug', 'articleId'],
    description: 'Read-only history of changes to articles. Filter by article ID to see a single article’s history.',
  },
  defaultSort: '-createdAt',
  access: {
    read: canReadAuditLogs,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  indexes: [
    { fields: ['articleType', 'articleId', 'createdAt'] },
    { fields: ['articleType', 'createdAt'] },
    { fields: ['actionBy', 'createdAt'] },
    { fields: ['action', 'createdAt'] },
  ],
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'articleType', type: 'select', required: true, options: ['news', 'blog'], index: true },
        { name: 'action', type: 'select', required: true, options: AUDIT_ACTIONS },
        { name: 'articleLang', type: 'text' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'articleId', type: 'text', required: true, index: true },
        { name: 'articleTitle', type: 'text', admin: { description: 'Title at the time of the change.' } },
        { name: 'articleSlug', type: 'text' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'actionBy', type: 'relationship', relationTo: 'staff' },
        { name: 'isSystemAction', type: 'checkbox', defaultValue: false, index: true },
      ],
    },
    {
      name: 'changedFields',
      type: 'array',
      admin: { description: 'Before / after values for each tracked field that changed.' },
      fields: [
        { name: 'field', type: 'text', required: true },
        // JSON-encoded text: Payload's json field rejects bare strings, and these can be any type.
        { name: 'before', type: 'textarea', admin: { readOnly: true } },
        { name: 'after', type: 'textarea', admin: { readOnly: true } },
      ],
    },
  ],
}
