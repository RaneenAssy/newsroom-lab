import type { CollectionConfig } from 'payload'
import { hasPermission } from '../access'

/** Controls the symbol hub's chip row: which chips show and in what order. */
export const NewsHubChips: CollectionConfig = {
  slug: 'news-hub-chips',
  labels: { singular: 'News Hub Chip', plural: 'News Hub Chips' },
  admin: { useAsTitle: 'key', group: 'News', defaultColumns: ['chipKind', 'key', 'visible', 'sortOrder'] },
  defaultSort: 'sortOrder',
  access: {
    read: hasPermission('view_all_news_categories'),
    create: hasPermission('edit_news_category'),
    update: hasPermission('edit_news_category'),
    delete: hasPermission('edit_news_category'),
  },
  indexes: [{ fields: ['chipKind', 'key'], unique: true }],
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'chipKind',
          type: 'select',
          required: true,
          options: [
            { label: 'Tier', value: 'tier' },
            { label: 'Topic', value: 'topic' },
          ],
        },
        { name: 'key', type: 'text', required: true, admin: { description: 'Tier kind (e.g. country) or topic slug (e.g. earnings).' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'visible', type: 'checkbox', defaultValue: true, admin: { description: 'Hidden chips lose their tab only.' } },
        { name: 'sortOrder', type: 'number', defaultValue: 0 },
      ],
    },
  ],
}
