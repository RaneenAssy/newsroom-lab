import type { CollectionConfig } from 'payload'
import { authenticated } from '../access'

/**
 * Same fields, order, labels and required markers as production's LanguageForm (apps/backend/src/features/Forms/LanguageForm.jsx):
 * RTL is a "1"/"0" select and Status an Active/Inactive select, and the flag is required, as in production.
 * List actions (status change, delete) use Payload's built-in row selection and bulk Edit / Delete.
 */
export const RTL_OPTIONS = [
  { label: '1', value: '1' },
  { label: '0', value: '0' },
]
export const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
]

export const Languages: CollectionConfig = {
  slug: 'languages',
  labels: { singular: 'Language', plural: 'Languages' },
  admin: {
    useAsTitle: 'name',
    group: 'Website Setup',
    defaultColumns: ['name', 'code', 'appLangCode', 'rtl', 'status'],
    listSearchableFields: ['name', 'code', 'appLangCode'],
  },
  access: { read: () => true, create: authenticated, update: authenticated, delete: authenticated },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Name', admin: { placeholder: 'Name' } },
    { name: 'code', type: 'text', required: true, index: true, label: 'Code', admin: { placeholder: 'Code' } },
    { name: 'appLangCode', type: 'text', required: true, label: 'App Language Code', admin: { placeholder: 'App Language Code' } },
    { name: 'rtl', type: 'select', required: true, defaultValue: '0', label: 'RTL', options: RTL_OPTIONS, admin: { placeholder: 'Select RTL' } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      label: 'Status',
      options: STATUS_OPTIONS,
      admin: { placeholder: 'Select Status' },
    },
    {
      name: 'flagImg',
      type: 'upload',
      relationTo: 'media',
      label: 'Upload flag',
      required: true,
    },
  ],
}
