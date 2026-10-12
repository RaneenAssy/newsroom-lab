import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { getTotalUsersCount } from '@/backoffice/dataSources'
import { MaterialIcon } from '../icons/MenuIcon'

/** The admin home (`admin.components.views.dashboard`): production's dashboard, which today is the single "Total Users" card. */
export const BackofficeDashboard = async (_props: AdminViewServerProps) => {
  const totalUsers = await getTotalUsersCount()
  return (
    <div className="uaf-dashboard">
      <section aria-label="Total users" className="uaf-stat-card">
        <span className="uaf-stat-card__icon">
          <MaterialIcon name="Group" />
        </span>
        <p className="uaf-stat-card__value">{totalUsers.toLocaleString('en')}</p>
        <p className="uaf-stat-card__label">Total Users</p>
      </section>
    </div>
  )
}
