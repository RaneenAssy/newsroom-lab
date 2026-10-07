import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig, type Where } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

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
import { ArticleAuditLogs } from './collections/ArticleAuditLogs'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Staff.slug,
    meta: {
      titleSuffix: ' — UA Finance Backoffice',
      icons: [{ rel: 'icon', type: 'image/png', url: '/ua-finance-icon.png' }],
    },
    components: {
      graphics: {
        Logo: '/components/admin/Logo#Logo',
        Icon: '/components/admin/Icon#Icon',
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Staff,
    Roles,
    Permissions,
    StaffDepartments,
    Users,
    Languages,
    Products,
    BillingProducts,
    UserSubscriptions,
    News,
    NewsCategories,
    NewsTopics,
    NewsHubChips,
    ArticleAuditLogs,
    Media,
  ],
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
    ]
    for (const [name, section] of newsPermissions) {
      const found = await payload.find({ collection: 'permissions', where: { name: { equals: name } }, limit: 1, depth: 0 })
      if (!found.totalDocs) await payload.create({ collection: 'permissions', data: { name, section, status: true } })
    }

    for (const lang of [
      { name: 'English', code: 'en', appLangCode: 'en', rtl: false },
      { name: 'Arabic', code: 'ar', appLangCode: 'ar', rtl: true },
    ]) {
      if (!(await exists('languages', { code: { equals: lang.code } }))) {
        await payload.create({ collection: 'languages', data: lang })
      }
    }
  },
})
