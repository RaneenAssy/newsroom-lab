/**
 * The backoffice sidebar, copied from production (apps/backend/src/menu-items/dashboard.js + pages.js): same groups, order, labels,
 * icons and required permissions. `href` points at the Payload screen when the section exists in this project, otherwise at the
 * "Coming soon" view (`comingSoonHref`). Commented-out production entries are left out, as they are in production.
 */
import type { MaterialIconName } from '../icons/materialIconShapes'

export type TablerIconName = 'IconDashboard' | 'IconChartHistogram' | 'IconCoins'
export type MenuIconName = { set: 'tabler'; name: TablerIconName } | { set: 'material'; name: MaterialIconName }

export type MenuLink = {
  kind: 'item'
  id: string
  title: string
  href: string
  icon?: MenuIconName
  /** Opens in a new tab (production: `target: '_blank'`). */
  external?: boolean
  requiredPermission?: string
  /** Production shows these to allowlisted emails only, regardless of role (audit logs). */
  requiresAuditLogEmailAccess?: boolean
}
export type MenuCollapse = { kind: 'collapse'; id: string; title: string; icon: MenuIconName; children: MenuLink[] }
export type MenuEntry = MenuLink | MenuCollapse
export type MenuGroup = { id: string; title: string; children: MenuEntry[] }

export const comingSoonHref = (sectionId: string): string => `/admin/coming-soon/${sectionId}`
const collection = (slug: string): string => `/admin/collections/${slug}`
const material = (name: MaterialIconName): MenuIconName => ({ set: 'material', name })
const tabler = (name: TablerIconName): MenuIconName => ({ set: 'tabler', name })
const soon = (id: string, title: string, requiredPermission?: string): MenuLink => ({ kind: 'item', id, title, href: comingSoonHref(id), requiredPermission })
const link = (id: string, title: string, href: string, requiredPermission?: string): MenuLink => ({ kind: 'item', id, title, href, requiredPermission })

/** apps/backend/src/views/investmentCalculator/constants.ts */
const CALCULATOR_PERMISSION = 'investment_calculator_admin'

export const backofficeMenu: MenuGroup[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    children: [
      { kind: 'item', id: 'default', title: 'Dashboard', href: '/admin', icon: tabler('IconDashboard') },
      { kind: 'item', id: 'growth-metrics', title: 'Growth Metrics', href: comingSoonHref('growth-metrics'), icon: tabler('IconChartHistogram'), requiredPermission: 'view_metrics' },
      { kind: 'item', id: 'ai-usage', title: 'AI Usage', href: comingSoonHref('ai-usage'), icon: tabler('IconCoins'), requiredPermission: 'view_ai_usage' },
    ],
  },
  {
    id: 'managements',
    title: 'Managements',
    children: [
      {
        kind: 'collapse', id: 'staff-management', title: 'Staff Management', icon: material('Diversity1'),
        children: [
          link('staff', 'Staff', collection('staff'), 'view_all_staffs'),
          soon('authors', 'Authors', 'view_all_staffs'),
          link('roles', 'Roles', collection('roles'), 'view_staff_roles'),
          link('permission', 'Permission', collection('permissions'), 'view_all_permissions'),
        ],
      },
      { kind: 'item', id: 'users', title: 'Users', href: collection('users'), icon: material('Group'), requiredPermission: 'view_all_users' },
      { kind: 'item', id: 'language', title: 'Languages', href: collection('languages'), icon: material('Language'), requiredPermission: 'view_all_languages' },
      { kind: 'item', id: 'subscriptions', title: 'Subscriptions', href: collection('user-subscriptions'), icon: material('Subscriptions'), requiredPermission: 'view_all_subscriptions' },
      {
        kind: 'collapse', id: 'billing-management', title: 'Billing Management', icon: material('Subscriptions'),
        children: [soon('billing-operations', 'Operations', 'view_all_subscriptions'), link('billing-products', 'Products', collection('billing-products'), 'billing_admin')],
      },
      {
        kind: 'collapse', id: 'investment-calculator', title: 'Investment Calculator', icon: material('Calculate'),
        children: [
          soon('investment-calculator-configuration', 'Configuration', CALCULATOR_PERMISSION),
          soon('investment-calculator-leads', 'Leads', CALCULATOR_PERMISSION),
          soon('investment-calculator-notifications', 'Lead Notifications', CALCULATOR_PERMISSION),
        ],
      },
      {
        kind: 'collapse', id: 'advertises-management', title: 'Advertises', icon: material('FeaturedVideo'),
        children: [soon('advertises-listing', 'Advertises Listing', 'view_all_advertises'), soon('advertises-categories', 'Advertises Categories', 'view_all_advertises_categories')],
      },
      {
        kind: 'collapse', id: 'academy-management', title: 'Academy', icon: material('AutoStories'),
        children: [soon('academy-listing', 'Academy Listing', 'view_all_academy'), soon('academy-categories', 'Categories', 'view_all_categories')],
      },
      { kind: 'item', id: 'borkers', title: 'Brokers', href: comingSoonHref('borkers'), icon: material('Diversity3'), requiredPermission: 'view_all_brokers' },
      {
        kind: 'collapse', id: 'news-management', title: 'News Management', icon: material('Newspaper'),
        children: [
          link('news', 'News', collection('news'), 'view_all_news'),
          link('news-categories', 'Tabs (Categories)', collection('news-categories'), 'view_all_news_categories'),
          link('news-topics', 'Topics (Subjects)', collection('news-topics'), 'view_all_news_categories'),
          link('news-hub-chips', 'Symbol Hub Chips', collection('news-hub-chips'), 'view_all_news_categories'),
          { kind: 'item', id: 'news-audit-logs', title: 'News Audit Logs', href: collection('article-audit-logs'), requiresAuditLogEmailAccess: true },
        ],
      },
      {
        kind: 'collapse', id: 'ai-newsroom', title: 'AI Newsroom', icon: material('AutoAwesome'),
        children: [
          soon('newsroom-feeds', 'RSS Feeds', 'view_all_rss_feeds'),
          soon('newsroom-suggestions', 'AI Suggestions', 'view_all_ai_suggestions'),
          soon('newsroom-articles', 'AI Articles & Spend', 'view_all_ai_articles'),
        ],
      },
      { kind: 'item', id: 'utm', title: 'UTM Compaign', href: comingSoonHref('utm'), icon: material('TrendingUp'), requiredPermission: 'view_all_utm_campaigns' },
      {
        kind: 'collapse', id: 'home-management', title: 'Home Management', icon: material('AddHome'),
        children: [
          soon('home-management-search-symbols', 'Search symbols', 'view_all_home_management'),
          soon('home-management-menu-dropdown', 'Menu Dropdown', 'view_all_home_management'),
          soon('home-management-home-page', 'Home page', 'view_all_home_management'),
        ],
      },
      {
        kind: 'collapse', id: 'widgets', title: 'Widgets', icon: material('Widgets'),
        children: [soon('widget-market-ticker', 'Real time Market Banner', 'view_all_home_management'), soon('widget-gulf-markets', 'Gulf Markets', 'view_all_home_management')],
      },
      {
        kind: 'collapse', id: 'markets', title: 'Markets', icon: material('Storefront'),
        children: [soon('markets-main', 'Main', 'view_all_home_management'), soon('markets-countries', 'Countries', 'view_all_home_management')],
      },
      {
        kind: 'collapse', id: 'symbols', title: 'Symbols', icon: material('ListAlt'),
        children: [soon('symbols-display', 'Symbols display', 'view_all_home_management'), soon('symbols-sector-industry-names', 'Sector & Industry names', 'view_all_home_management')],
      },
      { kind: 'item', id: 'tawk.to', title: 'Live Chat', href: 'https://dashboard.tawk.to/login', external: true, icon: material('Forum'), requiredPermission: 'view_all_tickets' },
      { kind: 'item', id: 'redirects', title: 'Redirects', href: comingSoonHref('redirects'), icon: material('Shuffle'), requiredPermission: 'view_redirects' },
      { kind: 'item', id: 'tickets', title: 'Tickets', href: comingSoonHref('tickets'), icon: material('HeadsetMic'), requiredPermission: 'view_all_tickets' },
      { kind: 'item', id: 'contact-inquiries', title: 'Contact Inquiries', href: comingSoonHref('contact-inquiries'), icon: material('PermPhoneMsg'), requiredPermission: 'view_all_inquiries' },
      {
        kind: 'collapse', id: 'faqs-management', title: 'Faqs Management', icon: material('LiveHelp'),
        children: [soon('faqs-listing', 'Faqs Listing', 'view_all_faqs'), soon('faqs-categories', 'Faqs Categories', 'view_all_faqs_categories')],
      },
      {
        kind: 'collapse', id: 'blogs-management', title: 'Blogs Management', icon: material('Book'),
        children: [
          soon('blogs-listing', 'Blogs Listing', 'view_all_blogs'),
          soon('blogs-categories', 'Blogs Categories', 'view_all_blogs_categories'),
          { kind: 'item', id: 'blogs-audit-logs', title: 'Blogs Audit Logs', href: comingSoonHref('blogs-audit-logs'), requiresAuditLogEmailAccess: true },
        ],
      },
      {
        kind: 'collapse', id: 'website-setup', title: 'Website Setup', icon: material('DisplaySettings'),
        children: [
          soon('website-setup-header', 'Header', 'add_edit_header'),
          soon('website-setup-site-menu', 'Site Menu', 'add_edit_header'),
          soon('website-setup-footer', 'Footer', 'add_edit_footer'),
          soon('website-setup-newsletter', 'Newsletter', 'add_edit_newsletter'),
          soon('website-setup-pages', 'Pages', 'view_all_pages'),
        ],
      },
      {
        kind: 'collapse', id: 'settings', title: 'Settings', icon: material('Settings'),
        children: [
          soon('settings-testimonials', 'Testimonials', 'view_all_testimonials'),
          soon('settings-stats', 'Stats', 'view_all_stats'),
          soon('settings-our-partners', 'Our Partners', 'view_all_partners'),
          soon('settings-achievements', 'Achievements', 'view_all_achievements'),
        ],
      },
      {
        kind: 'collapse', id: 'auth-settings', title: 'Auth Settings', icon: material('ManageAccounts'),
        children: [soon('auth-settings-admin-auth', 'Admin Auth', 'add_edit_admin_auth'), soon('auth-settings-user-auth', 'User Auth', 'add_edit_user_auth')],
      },
    ],
  },
]

/** Every section id → its title, for the "Coming soon" view. */
export const menuTitles: ReadonlyMap<string, string> = new Map(
  backofficeMenu.flatMap((group) => group.children.flatMap((entry) => (entry.kind === 'collapse' ? [[entry.id, entry.title] as const, ...entry.children.map((child) => [child.id, child.title] as const)] : [[entry.id, entry.title] as const]))),
)
