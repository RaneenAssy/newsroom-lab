import type { CollectionConfig } from 'payload'
import { authenticated } from '../access'

export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Subscription Plan', plural: 'Subscription Plans' },
  admin: {
    useAsTitle: 'name',
    group: 'Subscriptions',
    defaultColumns: ['name', 'subscriptionType', 'interval', 'topN', 'status'],
  },
  access: { read: () => true, create: authenticated, update: authenticated, delete: authenticated },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    {
      type: 'row',
      fields: [
        { name: 'interval', type: 'select', required: true, options: ['month', 'year'] },
        {
          name: 'subscriptionType',
          type: 'select',
          required: true,
          options: [
            { label: 'Free', value: 'free' },
            { label: 'Paid', value: 'paid' },
          ],
        },
        { name: 'topN', type: 'number', defaultValue: 3, admin: { description: '0 means all.' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'status', type: 'checkbox', defaultValue: true },
        { name: 'isSubscriptionBased', type: 'checkbox', defaultValue: true },
      ],
    },
    { name: 'features', type: 'array', fields: [{ name: 'name', type: 'text', required: true }] },
    { name: 'havingAssetsClass', type: 'json', label: 'Included asset classes' },
  ],
}
