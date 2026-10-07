import type { CollectionConfig } from 'payload'
import { authenticated } from '../access'

const notificationCategory = (name: string) => ({
  name,
  type: 'group' as const,
  fields: [{ name: 'enabled', type: 'checkbox' as const, defaultValue: true }],
})

/**
 * End-user (customer) records, managed from the backoffice. Customer login lives in the
 * public API, so this is intentionally not an auth collection — staff are the Payload auth users.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'User', plural: 'Users' },
  admin: {
    useAsTitle: 'email',
    group: 'Customers',
    defaultColumns: ['name', 'email', 'country', 'isSubscribed', 'isVerified', 'status'],
  },
  access: { read: authenticated, create: authenticated, update: authenticated, delete: authenticated },
  fields: [
    { name: 'name', type: 'text', required: true, minLength: 3 },
    { name: 'email', type: 'email', required: true, unique: true, index: true },
    {
      type: 'row',
      fields: [
        {
          name: 'phone',
          type: 'text',
          validate: (v: unknown) => !v || /^(\d{10}|\d{12})$/.test(String(v)) || 'Phone number must be 10 or 12 digits',
        },
        { name: 'country', type: 'text' },
      ],
    },
    { name: 'profileImage', type: 'upload', relationTo: 'media' },
    {
      type: 'row',
      fields: [
        { name: 'status', type: 'checkbox', defaultValue: true },
        { name: 'active', type: 'checkbox', defaultValue: true },
        { name: 'isVerified', type: 'checkbox', defaultValue: false },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'language',
          type: 'select',
          options: [
            { label: 'English', value: 'en' },
            { label: 'Arabic', value: 'ar' },
          ],
        },
        {
          name: 'isAgreed',
          type: 'select',
          label: 'Agreed to terms',
          options: [
            { label: 'Yes', value: 'yes' },
            { label: 'No', value: 'no' },
          ],
        },
        {
          name: 'signupSource',
          type: 'select',
          defaultValue: 'unknown',
          options: ['web', 'ios', 'android', 'unknown'],
          admin: { description: 'Set at registration; read-only afterwards.' },
          access: { update: () => false },
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Subscription',
      fields: [
        { name: 'isSubscribed', type: 'checkbox', defaultValue: false },
        { name: 'isPaidPackage', type: 'checkbox', defaultValue: false },
        { name: 'currentPackage', type: 'relationship', relationTo: 'products' },
        { name: 'subscriptionExpiry', type: 'date' },
      ],
    },
    {
      type: 'collapsible',
      label: 'Notification preferences',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'notificationPreferences',
          type: 'group',
          fields: [notificationCategory('news'), notificationCategory('blogs'), notificationCategory('academy')],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Security & activity',
      admin: { initCollapsed: true },
      fields: [
        { name: 'twoFactorEnabled', type: 'checkbox', defaultValue: false, admin: { readOnly: true } },
        { name: 'lastLogin', type: 'date', admin: { readOnly: true } },
        { name: 'ipAddress', type: 'text', admin: { readOnly: true } },
        { name: 'loginAttempts', type: 'number', defaultValue: 0, admin: { readOnly: true } },
        { name: 'lockUntil', type: 'date', admin: { readOnly: true } },
      ],
    },
  ],
}
