import { ValidationError, type CollectionConfig } from 'payload'
import { authenticated, superAdminOnly } from '../access'

export const Staff: CollectionConfig = {
  slug: 'staff',
  labels: { singular: 'Staff Member', plural: 'Staff' },
  auth: true,
  admin: {
    useAsTitle: 'name',
    group: 'Staff Management',
    defaultColumns: ['name', 'email', 'role', 'staffDepartment', 'status'],
  },
  access: { read: authenticated, create: superAdminOnly, update: superAdminOnly, delete: superAdminOnly },
  hooks: {
    // The create-first-user screen is logged out, and Payload's relationship dropdowns do not load
    // without a user, so role/department can't be picked there. Auto-assign them for the very first
    // staff member; for everyone else they are mandatory.
    beforeValidate: [
      async ({ data, operation, req }) => {
        if (operation !== 'create' || !data) return data
        const next = { ...data }
        const { totalDocs } = await req.payload.count({ collection: 'staff', overrideAccess: true, req })
        if (totalDocs === 0) {
          if (!next.role) {
            const roles = await req.payload.find({
              collection: 'roles',
              where: { isSuperAdmin: { equals: true } },
              limit: 1,
              depth: 0,
              overrideAccess: true,
              req,
            })
            next.role = roles.docs[0]?.id
          }
          if (!next.staffDepartment) {
            const departments = await req.payload.find({
              collection: 'staff-departments',
              limit: 1,
              depth: 0,
              overrideAccess: true,
              req,
            })
            next.staffDepartment = departments.docs[0]?.id
          }
        }
        const errors = [
          !next.role && { path: 'role', message: 'Role is required.' },
          !next.staffDepartment && { path: 'staffDepartment', message: 'Staff department is required.' },
        ].filter(Boolean) as { path: string; message: string }[]
        if (errors.length) throw new ValidationError({ collection: 'staff', errors })
        return next
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'nameAr', type: 'text', label: 'Name (Arabic)' },
    {
      type: 'row',
      fields: [
        {
          name: 'role',
          type: 'relationship',
          relationTo: 'roles',
          admin: {
            description: 'Required. Assigned automatically to the first staff member (Super Admin).',
            condition: (_data, _siblingData, { user }) => Boolean(user),
          },
        },
        {
          name: 'staffDepartment',
          type: 'relationship',
          relationTo: 'staff-departments',
          admin: {
            description: 'Required. Assigned automatically to the first staff member (Management).',
            condition: (_data, _siblingData, { user }) => Boolean(user),
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'status', type: 'checkbox', defaultValue: true },
        { name: 'active', type: 'checkbox', defaultValue: true },
      ],
    },
    {
      type: 'collapsible',
      label: 'Public author profile',
      admin: { initCollapsed: true },
      fields: [
        { name: 'isPublisherAuthor', type: 'checkbox', defaultValue: false },
        { name: 'profileImg', type: 'upload', relationTo: 'media' },
        { name: 'slug', type: 'text', unique: true, index: true },
        {
          type: 'row',
          fields: [
            { name: 'jobTitleEn', type: 'text', label: 'Job title (EN)' },
            { name: 'jobTitleAr', type: 'text', label: 'Job title (AR)' },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'bioEn', type: 'textarea', label: 'Bio (EN)' },
            { name: 'bioAr', type: 'textarea', label: 'Bio (AR)' },
          ],
        },
        { name: 'publicEmail', type: 'email' },
        {
          type: 'row',
          fields: [
            { name: 'linkedinUrl', type: 'text' },
            { name: 'xUrl', type: 'text', label: 'X URL' },
          ],
        },
      ],
    },
  ],
}
