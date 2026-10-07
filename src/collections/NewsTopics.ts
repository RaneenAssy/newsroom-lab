import type { CollectionConfig } from 'payload'
import { authenticated, hasPermission } from '../access'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Admin-managed vocabulary of topics (earnings, ipo, merger…). Topic tags on articles come from
 * here. `reviewStatus` is provenance (has a human accepted it?), separate from `status` (visibility).
 */
export const NewsTopics: CollectionConfig = {
  slug: 'news-topics',
  labels: { singular: 'News Topic', plural: 'News Topics' },
  admin: {
    useAsTitle: 'name',
    group: 'News',
    defaultColumns: ['name', 'nameAr', 'slug', 'status', 'reviewStatus', 'origin'],
  },
  access: {
    read: authenticated,
    create: hasPermission('add_news_category'),
    update: hasPermission('edit_news_category'),
    delete: hasPermission('delete_news_category'),
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req }) => {
        const becameApproved = data.reviewStatus === 'approved' && originalDoc?.reviewStatus === 'pending'
        if (becameApproved && req.user?.collection === 'staff') {
          data.approvedBy = req.user.id
          data.approvedAt = new Date().toISOString()
        }
        return data
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'nameAr', type: 'text', label: 'Name (Arabic)' },
      ],
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: (v: unknown) => (typeof v === 'string' && SLUG_PATTERN.test(v)) || 'Lowercase letters, numbers and hyphens only',
    },
    {
      type: 'row',
      fields: [
        { name: 'status', type: 'checkbox', defaultValue: true, admin: { description: 'Visible to readers.' } },
        {
          name: 'reviewStatus',
          type: 'select',
          defaultValue: 'approved',
          index: true,
          options: [
            { label: 'Approved', value: 'approved' },
            { label: 'Pending review', value: 'pending' },
          ],
        },
        {
          name: 'origin',
          type: 'select',
          defaultValue: 'editor',
          options: [
            { label: 'Editor', value: 'editor' },
            { label: 'AI newsroom', value: 'newsroom' },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'AI proposal',
      admin: { initCollapsed: true },
      fields: [
        { name: 'proposedReason', type: 'textarea', admin: { description: 'Why no existing topic fitted.' } },
        { name: 'approvedBy', type: 'relationship', relationTo: 'staff', admin: { readOnly: true } },
        { name: 'approvedAt', type: 'date', admin: { readOnly: true } },
      ],
    },
  ],
}
