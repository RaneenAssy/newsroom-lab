import type { PayloadRequest } from 'payload'
import React from 'react'

import { isAuditLogAllowlisted, loadStaffAccess } from '@/access'
import { getPendingSuggestionCount } from '@/backoffice/dataSources'
import { backofficeMenu } from '../menu/menuItems'
import { visibleMenu } from '../menu/visibleMenu'
import { BackofficeNavClient } from './BackofficeNavClient'

/**
 * Replaces Payload's sidebar (`admin.components.Nav`) with the production backoffice menu, filtered for the signed-in staff
 * member exactly as production does. Server component: permissions are resolved here, never in the browser.
 */
export const BackofficeNav = async ({ req }: { req?: PayloadRequest }) => {
  const access = req ? await loadStaffAccess(req) : { superAdmin: false, permissions: new Set<string>() }
  const email = (req?.user as { email?: string } | null | undefined)?.email
  const menu = visibleMenu(backofficeMenu, { superAdmin: access.superAdmin, permissions: access.permissions, auditLogAllowlisted: isAuditLogAllowlisted(email) })
  return <BackofficeNavClient menu={menu} pendingSuggestions={await getPendingSuggestionCount()} />
}
