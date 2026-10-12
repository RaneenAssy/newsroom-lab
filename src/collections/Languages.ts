import type { CollectionConfig, Validate } from 'payload'
import { authenticated } from '../access'

/**
 * Same fields, order, labels and required markers as production's LanguageForm (apps/backend/src/features/Forms/LanguageForm.jsx):
 * RTL is a "1"/"0" select and Status an Active/Inactive select, as in production.
 */
export const RTL_OPTIONS = [
  { label: '1', value: '1' },
  { label: '0', value: '0' },
]
export const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
]

/**
 * Production requires a flag. Enforced for staff creating a language, and a flag can never be removed; older records without a
 * flag (and system seeding, which has no user) can still be saved — e.g. the status switch on the list only changes `status`.
 */
const flagRequiredForStaff: Validate = (value, { req, operation, previousValue }) => {
  if (value || !req.user) return true
  if (operation === 'update' && !previousValue) return true
  return 'Please upload a flag.'
}

export const Languages: CollectionConfig = {
  slug: 'languages',
  labels: { singular: 'Language', plural: 'Languages' },
  admin: {
    useAsTitle: 'name',
    group: 'Site Setup',
    defaultColumns: ['name', 'code', 'appLangCode', 'rtl', 'status', 'rowActions'],
    listSearchableFields: ['name', 'code', 'appLangCode'],
    components: { beforeListTable: ['/components/backoffice/languages/ExportLanguagesButton#ExportLanguagesButton'] },
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
      admin: { placeholder: 'Select Status', components: { Cell: '/components/backoffice/languages/StatusSwitchCell#StatusSwitchCell' } },
    },
    {
      name: 'flagImg',
      type: 'upload',
      relationTo: 'media',
      label: 'Upload flag',
      validate: flagRequiredForStaff, // required for staff saves; the marker comes from RequiredLabel
      admin: { components: { Label: '/components/backoffice/languages/RequiredLabel#RequiredLabel' } },
    },
    // Row actions column (production's ⋮ menu: Edit / Delete). A UI field: nothing stored.
    { name: 'rowActions', type: 'ui', label: 'Actions', admin: { components: { Cell: '/components/backoffice/languages/RowActionsCell#RowActionsCell' } } },
  ],
}
