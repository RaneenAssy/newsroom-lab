import type { CollectionConfig } from 'payload'
import { authenticated } from '../access'

export const Languages: CollectionConfig = {
  slug: 'languages',
  admin: { useAsTitle: 'name', group: 'Site Setup', defaultColumns: ['name', 'code', 'appLangCode', 'rtl', 'status'] },
  access: { read: () => true, create: authenticated, update: authenticated, delete: authenticated },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'code', type: 'text', required: true, index: true },
    { name: 'appLangCode', type: 'text', required: true, label: 'App language code' },
    { name: 'rtl', type: 'checkbox', defaultValue: false, label: 'Right-to-left' },
    { name: 'flagImg', type: 'upload', relationTo: 'media', label: 'Flag image' },
    { name: 'status', type: 'checkbox', defaultValue: true },
  ],
}
