import Link from 'next/link'
import type { ServerProps } from 'payload'
import React from 'react'

/** Material "Group" icon (MIT), the icon production uses for Users. */
const GROUP_ICON_PATH =
  'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3m-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3m0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5m8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5'

/**
 * `admin.components.beforeDashboard`: production's "Total Users" card above Payload's own dashboard. The number is a real
 * Local API count; staff who cannot read users (Payload's permissions for this request) don't see the card.
 */
export const TotalUsersCard = async ({ payload, permissions, user }: ServerProps) => {
  if (!user || !permissions?.collections?.users?.read) return null
  const { totalDocs } = await payload.count({ collection: 'users' })
  return (
    <Link className="uaf-total-users" href={`${payload.config.routes.admin}/collections/users`}>
      <span className="uaf-total-users__icon">
        <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24">
          <path d={GROUP_ICON_PATH} fill="currentColor" />
        </svg>
      </span>
      <span className="uaf-total-users__value">{totalDocs.toLocaleString('en')}</span>
      <span className="uaf-total-users__label">Total Users</span>
    </Link>
  )
}
