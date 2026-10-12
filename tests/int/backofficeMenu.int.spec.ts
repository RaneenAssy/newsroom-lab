import { describe, expect, it } from 'vitest'

import { backofficeMenu, type MenuGroup } from '@/components/backoffice/menu/menuItems'
import { visibleMenu } from '@/components/backoffice/menu/visibleMenu'

const titles = (menu: MenuGroup[]): string[] =>
  menu.flatMap((group) => group.children.flatMap((entry) => (entry.kind === 'collapse' ? [entry.title, ...entry.children.map((child) => `${entry.title} › ${child.title}`)] : [entry.title])))

describe('backoffice sidebar visibility (production filterMenuItems rules)', () => {
  it('shows a Super Admin everything except the audit-log items, which follow the email allowlist only', () => {
    const shown = titles(visibleMenu(backofficeMenu, { superAdmin: true, permissions: new Set(), auditLogAllowlisted: false }))
    expect(shown).toContain('Languages')
    expect(shown).toContain('AI Newsroom › AI Suggestions')
    expect(shown).not.toContain('News Management › News Audit Logs')
    expect(shown).not.toContain('Blogs Management › Blogs Audit Logs')
  })

  it('shows staff only the items their permissions allow, and drops groups left empty', () => {
    const menu = visibleMenu(backofficeMenu, { superAdmin: false, permissions: new Set(['view_all_languages', 'view_all_news']), auditLogAllowlisted: false })
    expect(titles(menu)).toEqual(['Dashboard', 'Languages', 'News Management', 'News Management › News'])
    expect(menu.map((group) => group.title)).toEqual(['Dashboard', 'Managements'])
  })

  it('adds the audit-log items for allowlisted emails, even without any permission', () => {
    const shown = titles(visibleMenu(backofficeMenu, { superAdmin: false, permissions: new Set(), auditLogAllowlisted: true }))
    expect(shown).toEqual(['Dashboard', 'News Management', 'News Management › News Audit Logs', 'Blogs Management', 'Blogs Management › Blogs Audit Logs'])
  })
})
