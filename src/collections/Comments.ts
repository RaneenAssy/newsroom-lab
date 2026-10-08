import { ValidationError, type CollectionBeforeChangeHook, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'
import { hasPermission } from '../access'
import { COMMENT_MAX_LENGTH } from '../comments/limits'

const idOf = (ref: unknown): string | undefined =>
  typeof ref === 'object' && ref !== null ? (ref as { id?: string }).id : (ref as string | undefined)

/** Replies go one level deep, and only under a comment on the same article. */
const checkReplyTarget: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (operation !== 'create' || !data?.parent) return data
  const parent = await req.payload.findByID({ collection: 'comments', id: idOf(data.parent)!, depth: 0, overrideAccess: true, req })
  const errors: { path: string; message: string }[] = []
  if (idOf(parent.article) !== idOf(data.article)) errors.push({ path: 'parent', message: 'A reply must be on the same article.' })
  if (parent.parent) errors.push({ path: 'parent', message: 'Replies cannot be replied to.' })
  if (parent.status === 'hidden') errors.push({ path: 'parent', message: 'That comment was removed.' })
  if (errors.length) throw new ValidationError({ collection: 'comments', errors })
  return data
}

/** Keeps the list title in sync with the text, and records who hid a comment and when. */
const stampModeration: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  if (typeof data.body === 'string') data.excerpt = data.body.replace(/\s+/g, ' ').trim().slice(0, 90)
  const wasHidden = originalDoc?.status === 'hidden'
  if (data.status === 'hidden' && !wasHidden) {
    data.hiddenAt = new Date().toISOString()
    data.hiddenBy = req.user?.collection === 'staff' ? req.user.id : null
  } else if (data.status === 'visible' && wasHidden) {
    data.hiddenAt = null
    data.hiddenBy = null
  }
  return data
}

/**
 * Reader comments on news articles. Readers post from the public article page (a server action that writes with
 * `overrideAccess`), so the API itself never accepts new comments. Comments show immediately; staff with
 * `moderate_comments` hide or delete them here.
 */
export const Comments: CollectionConfig = {
  slug: 'comments',
  labels: { singular: 'Comment', plural: 'Comments' },
  admin: {
    useAsTitle: 'excerpt',
    group: 'News',
    defaultColumns: ['excerpt', 'author', 'article', 'status', 'createdAt'],
    listSearchableFields: ['body'],
    description: 'Reader comments from article pages. They appear on the site immediately; set Status to Hidden to take one down.',
  },
  defaultSort: '-createdAt',
  access: {
    read: hasPermission('view_comments', 'moderate_comments'),
    create: () => false,
    update: hasPermission('moderate_comments'),
    delete: hasPermission('moderate_comments'),
  },
  hooks: {
    beforeValidate: [checkReplyTarget],
    beforeChange: [stampModeration],
  },
  indexes: [{ fields: ['article', 'status', 'createdAt'] }, { fields: ['author', 'createdAt'] }],
  fields: [
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'visible',
      index: true,
      options: [
        { label: 'Visible', value: 'visible' },
        { label: 'Hidden', value: 'hidden' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'moderationNote', type: 'textarea', admin: { position: 'sidebar', description: 'Internal: why it was hidden.' } },
    { name: 'hiddenBy', type: 'relationship', relationTo: 'staff', admin: { position: 'sidebar', readOnly: true } },
    { name: 'hiddenAt', type: 'date', admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },

    { name: 'body', type: 'textarea', required: true, maxLength: COMMENT_MAX_LENGTH, admin: { readOnly: true, description: "The reader's words; staff can hide but not edit them." } },
    { name: 'excerpt', type: 'text', admin: { hidden: true } },
    {
      type: 'row',
      fields: [
        { name: 'article', type: 'relationship', relationTo: 'news', required: true, index: true, admin: { readOnly: true } },
        { name: 'author', type: 'relationship', relationTo: 'users', required: true, index: true, admin: { readOnly: true } },
      ],
    },
    { name: 'parent', type: 'relationship', relationTo: 'comments', label: 'Reply to', admin: { readOnly: true, condition: (data) => Boolean(data?.parent) } },
  ],
}
