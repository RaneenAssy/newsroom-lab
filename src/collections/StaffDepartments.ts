import type { CollectionConfig } from 'payload'
import { authenticated, superAdminOnly } from '../access'

export const StaffDepartments: CollectionConfig = {
  slug: 'staff-departments',
  labels: { singular: 'Staff Department', plural: 'Staff Departments' },
  admin: { useAsTitle: 'name', group: 'Staff Management', defaultColumns: ['name', 'status'] },
  access: { read: authenticated, create: superAdminOnly, update: superAdminOnly, delete: superAdminOnly },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'status', type: 'checkbox', defaultValue: true },
  ],
}
