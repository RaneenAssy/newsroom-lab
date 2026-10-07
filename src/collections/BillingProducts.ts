import type { CollectionConfig } from 'payload'
import { authenticated } from '../access'

export const BillingProducts: CollectionConfig = {
  slug: 'billing-products',
  labels: { singular: 'Plan Price', plural: 'Plan Prices' },
  admin: {
    useAsTitle: 'name',
    group: 'Subscriptions',
    defaultColumns: ['name', 'product', 'interval', 'country', 'currency', 'amount', 'isActive'],
    description: 'One price per plan + interval + currency + country.',
  },
  access: { read: authenticated, create: authenticated, update: authenticated, delete: authenticated },
  fields: [
    { name: 'product', type: 'relationship', relationTo: 'products', required: true },
    { name: 'name', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        { name: 'interval', type: 'select', required: true, options: ['month', 'year'] },
        { name: 'currency', type: 'text', required: true, admin: { description: 'ISO 4217, e.g. AED' } },
        { name: 'country', type: 'text', required: true, admin: { description: 'ISO 3166-1 alpha-2, e.g. AE' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'amount', type: 'number', required: true, min: 0, admin: { description: 'Pre-tax amount.' } },
        { name: 'vatRate', type: 'number', required: true, defaultValue: 0, min: 0, max: 1, admin: { description: 'Decimal, e.g. 0.05' } },
        { name: 'isActive', type: 'checkbox', defaultValue: true },
      ],
    },
  ],
}
