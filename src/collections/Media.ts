import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    // The public site serves 320/640px variants of article images.
    imageSizes: [
      { name: 'w320', width: 320 },
      { name: 'w640', width: 640 },
    ],
  },
}
