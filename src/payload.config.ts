import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig, type Where } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { ar } from '@payloadcms/translations/languages/ar'
import { en } from '@payloadcms/translations/languages/en'

import { Media } from './collections/Media'
import { Users } from './collections/Users'
import { Staff } from './collections/Staff'
import { Roles } from './collections/Roles'
import { Permissions } from './collections/Permissions'
import { StaffDepartments } from './collections/StaffDepartments'
import { Languages } from './collections/Languages'
import { Products } from './collections/Products'
import { BillingProducts } from './collections/BillingProducts'
import { UserSubscriptions } from './collections/UserSubscriptions'
import { NewsCategories } from './collections/NewsCategories'
import { NewsTopics } from './collections/NewsTopics'
import { NewsHubChips } from './collections/NewsHubChips'
import { News } from './collections/News'
import { Comments } from './collections/Comments'
import { ArticleAuditLogs } from './collections/ArticleAuditLogs'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Staff.slug,
    // The production backoffice has no usable dark mode (its dark tokens are the template's stock blue/purple), so light only.
    theme: 'light',
    meta: {
      titleSuffix: ' | UA Finance',
      icons: [{ rel: 'icon', type: 'image/png', url: '/backoffice/favicon.png' }],
    },
    // Payload's own person icon in the header (production shows one too); no Gravatar lookups.
    avatar: 'default',
    components: {
      graphics: {
        Logo: '/components/admin/Logo#Logo',
        Icon: '/components/admin/Icon#Icon',
      },
      // Everything else is Payload's built-in admin; these two only add content to its login page and dashboard.
      beforeLogin: ['/components/admin/LoginGreeting#LoginGreeting'],
      beforeDashboard: ['/components/admin/TotalUsersCard#TotalUsersCard'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  // Payload builds the sidebar from this list: groups (admin.group) appear in this order, mirroring production's menu.
  collections: [
    Staff,
    Roles,
    Permissions,
    StaffDepartments,
    Users,
    UserSubscriptions,
    Products,
    BillingProducts,
    News,
    Comments,
    NewsCategories,
    NewsTopics,
    NewsHubChips,
    ArticleAuditLogs,
    Languages,
    Media,
  ],
  // Admin UI languages: English (default) and Arabic, which switches the admin to right-to-left.
  i18n: { supportedLanguages: { en, ar }, fallbackLanguage: 'en' },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  sharp,
  plugins: [],
  // Seed what the first-user form needs: a Super Admin role, a department, and default languages.
  onInit: async (payload) => {
    const exists = async (collection: 'roles' | 'staff-departments' | 'languages', where: Where) =>
      (await payload.find({ collection, where, limit: 1, depth: 0 })).totalDocs > 0

    if (!(await exists('roles', { isSuperAdmin: { equals: true } }))) {
      await payload.create({
        collection: 'roles',
        data: { name: 'Super Admin', isSuperAdmin: true, status: true },
        overrideAccess: true,
      })
    }
    if (!(await exists('staff-departments', { name: { equals: 'Management' } }))) {
      await payload.create({ collection: 'staff-departments', data: { name: 'Management' } })
    }
    // Permissions the news screens check (names match the legacy backoffice catalog).
    const newsPermissions: [string, string][] = [
      ['view_all_news', 'News'],
      ['add_news', 'News'],
      ['edit_news', 'News'],
      ['delete_news', 'News'],
      ['export_all_news', 'News'],
      ['view_all_news_categories', 'News Categories'],
      ['add_news_category', 'News Categories'],
      ['edit_news_category', 'News Categories'],
      ['delete_news_category', 'News Categories'],
      ['toggle_active_news_category', 'News Categories'],
      ['view_audit_logs', 'Audit Logs'],
      ['view_comments', 'Comments'],
      ['moderate_comments', 'Comments'],
    ]
    for (const [name, section] of newsPermissions) {
      const found = await payload.find({ collection: 'permissions', where: { name: { equals: name } }, limit: 1, depth: 0 })
      if (!found.totalDocs) await payload.create({ collection: 'permissions', data: { name, section, status: true } })
    }

    // Languages moved from checkboxes to production's selects (RTL "1"/"0", Status Active/Inactive): convert older records once.
    const languages = payload.db.connection.collection('languages')
    await languages.updateMany({ rtl: true }, { $set: { rtl: '1' } })
    await languages.updateMany({ rtl: { $in: [false, null] } }, { $set: { rtl: '0' } })
    await languages.updateMany({ status: { $in: [true, null] } }, { $set: { status: 'active' } }) // null/missing: the old default was on
    await languages.updateMany({ status: false }, { $set: { status: 'inactive' } })
    // The flag is required (as in production), so the seed uploads a small placeholder flag through the Local API, and older
    // records without one get it too, so they stay editable.
    const placeholderFlag = async (code: string) => {
      const name = `flag-${code}.png`
      const existing = await payload.find({ collection: 'media', where: { filename: { equals: name } }, limit: 1, depth: 0 })
      if (existing.docs[0]) return existing.docs[0].id
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="44"><rect width="64" height="44" rx="4" fill="#2f4c68"/><text x="32" y="29" font-family="Arial" font-size="18" font-weight="700" fill="#d4af37" text-anchor="middle">${code.toUpperCase()}</text></svg>`
      const data = await sharp(Buffer.from(svg)).png().toBuffer()
      const media = await payload.create({ collection: 'media', data: { alt: `${code.toUpperCase()} flag (placeholder)` }, file: { data, mimetype: 'image/png', name, size: data.length } })
      return media.id
    }
    for (const lang of [
      { name: 'English', code: 'en', appLangCode: 'en', rtl: '0' as const, status: 'active' as const },
      { name: 'Arabic', code: 'ar', appLangCode: 'ar', rtl: '1' as const, status: 'active' as const },
    ]) {
      if (!(await exists('languages', { code: { equals: lang.code } }))) {
        await payload.create({ collection: 'languages', data: { ...lang, flagImg: await placeholderFlag(lang.code) } })
      }
    }
    const withoutFlag = await payload.find({ collection: 'languages', where: { or: [{ flagImg: { exists: false } }, { flagImg: { equals: null } }] }, depth: 0, pagination: false })
    for (const language of withoutFlag.docs) {
      await payload.update({ collection: 'languages', id: language.id, data: { flagImg: await placeholderFlag(language.code) } })
    }
  },
})
