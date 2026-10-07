import type { CollectionConfig } from 'payload'
import { authenticated } from '../access'

export const UserSubscriptions: CollectionConfig = {
  slug: 'user-subscriptions',
  labels: { singular: 'User Subscription', plural: 'User Subscriptions' },
  admin: {
    useAsTitle: 'id',
    group: 'Subscriptions',
    defaultColumns: ['user', 'product', 'lifecycleState', 'startDate', 'endDate', 'environment'],
  },
  access: { read: authenticated, create: authenticated, update: authenticated, delete: () => false },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
        { name: 'product', type: 'relationship', relationTo: 'products', required: true },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'environment', type: 'select', required: true, options: ['test', 'live'] },
        { name: 'interval', type: 'select', required: true, options: ['month', 'year'] },
        { name: 'country', type: 'text', required: true },
        { name: 'vatRate', type: 'number', min: 0, max: 1 },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'startDate', type: 'date', required: true },
        { name: 'endDate', type: 'date', required: true, index: true },
        { name: 'billingPeriodAnchor', type: 'date', required: true },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'lifecycleState',
          type: 'select',
          options: ['active', 'past_due', 'cancelled', 'lapsed', 'superseded', 'refunded'],
        },
        {
          name: 'billingStatus',
          type: 'select',
          options: ['success', 'renewed', 'past_due', 'failed', 'cancelled', 'refunded'],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Access & supersession',
      admin: { initCollapsed: true },
      fields: [
        { name: 'accessRevokedAt', type: 'date' },
        { name: 'accessEndsAt', type: 'date' },
        { name: 'supersededAt', type: 'date' },
        { name: 'supersededBy', type: 'relationship', relationTo: 'user-subscriptions' },
      ],
    },
  ],
}
