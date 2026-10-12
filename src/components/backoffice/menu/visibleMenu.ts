import type { MenuEntry, MenuGroup, MenuLink } from './menuItems'

export type MenuViewer = { superAdmin: boolean; permissions: ReadonlySet<string>; auditLogAllowlisted: boolean }

/**
 * Production's sidebar filter (apps/backend/src/views/mainLayout/MenuList/index.jsx `filterMenuItems`): audit-log items follow the
 * email allowlist only; everything else is visible to Super Admins, or to staff holding `requiredPermission`; a group or collapse
 * with no visible children disappears.
 */
const linkVisible = (link: MenuLink, viewer: MenuViewer): boolean => {
  if (link.requiresAuditLogEmailAccess) return viewer.auditLogAllowlisted
  return viewer.superAdmin || !link.requiredPermission || viewer.permissions.has(link.requiredPermission)
}

const visibleEntry = (entry: MenuEntry, viewer: MenuViewer): MenuEntry | null => {
  if (entry.kind === 'item') return linkVisible(entry, viewer) ? entry : null
  const children = entry.children.filter((child) => linkVisible(child, viewer))
  return children.length ? { ...entry, children } : null
}

export const visibleMenu = (menu: MenuGroup[], viewer: MenuViewer): MenuGroup[] =>
  menu
    .map((group) => ({ ...group, children: group.children.map((entry) => visibleEntry(entry, viewer)).filter((entry): entry is MenuEntry => entry !== null) }))
    .filter((group) => group.children.length > 0)
