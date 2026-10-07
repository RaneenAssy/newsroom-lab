import type { CollectionConfig } from 'payload'
import { authenticated, hasPermission } from '../access'

export const NewsCategories: CollectionConfig = {
  slug: 'news-categories',
  labels: { singular: 'News Category', plural: 'News Categories' },
  admin: { useAsTitle: 'name', group: 'News', defaultColumns: ['name', 'nameAr', 'slug', 'status', 'defaultCategory'] },
  access: {
    read: authenticated,
    create: hasPermission('add_news_category'),
    update: hasPermission('edit_news_category'),
    delete: hasPermission('delete_news_category'),
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'nameAr', type: 'text', label: 'Name (Arabic)' },
      ],
    },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      type: 'row',
      fields: [
        { name: 'status', type: 'checkbox', defaultValue: true },
        { name: 'defaultCategory', type: 'checkbox', defaultValue: false },
      ],
    },
  ],
}
