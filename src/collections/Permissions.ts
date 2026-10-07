import type { CollectionConfig } from 'payload'
import { authenticated, superAdminOnly } from '../access'

export const Permissions: CollectionConfig = {
  slug: 'permissions',
  admin: { useAsTitle: 'name', group: 'Staff Management', defaultColumns: ['name', 'section', 'status'] },
  access: { read: authenticated, create: superAdminOnly, update: superAdminOnly, delete: superAdminOnly },
  fields: [
    { name: 'name', type: 'text', required: true, unique: true },
    { name: 'section', type: 'text', required: true, index: true },
    { name: 'status', type: 'checkbox', defaultValue: true },
  ],
}
