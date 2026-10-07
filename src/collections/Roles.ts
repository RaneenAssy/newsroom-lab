import type { CollectionConfig } from 'payload'
import { authenticated, superAdminOnly } from '../access'

export const Roles: CollectionConfig = {
  slug: 'roles',
  admin: { useAsTitle: 'name', group: 'Staff Management', defaultColumns: ['name', 'status', 'isSuperAdmin'] },
  access: { read: authenticated, create: superAdminOnly, update: superAdminOnly, delete: superAdminOnly },
  fields: [
    { name: 'name', type: 'text', required: true, unique: true },
    { name: 'permissions', type: 'relationship', relationTo: 'permissions', hasMany: true },
    { name: 'status', type: 'checkbox', defaultValue: true },
    {
      name: 'isSuperAdmin',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'All-access role. Only set by the seed script.', readOnly: true },
      access: { create: () => false, update: () => false },
    },
  ],
}
