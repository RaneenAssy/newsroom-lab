'use client'
import { useAuth } from '@payloadcms/ui'
import { IconBell, IconLogout, IconSettings } from '@tabler/icons-react'
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'

import { MaterialIcon } from '../icons/MenuIcon'

/**
 * Right side of the header (`admin.components.actions`): production's bell button in a light-gold square and the navy account
 * pill (avatar + gear) that opens the account menu. Notifications are not built in this spike: the bell only shows an empty state.
 */
export const HeaderActions: React.FC = () => {
  const { user } = useAuth()
  const [menu, setMenu] = useState<'none' | 'account' | 'notifications'>('none')
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setMenu('none')
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const name = (user as { name?: string } | null)?.name ?? user?.email ?? ''
  return (
    <div className="uaf-header-actions" ref={root}>
      <button aria-expanded={menu === 'notifications'} aria-label="Notifications" className="uaf-square-button" onClick={() => setMenu(menu === 'notifications' ? 'none' : 'notifications')} type="button">
        <IconBell size={20} stroke={1.5} />
      </button>
      <button aria-expanded={menu === 'account'} aria-label="Account menu" className="uaf-account-pill" onClick={() => setMenu(menu === 'account' ? 'none' : 'account')} type="button">
        <span className="uaf-account-pill__avatar">
          <MaterialIcon name="Person" size={22} />
        </span>
        <IconSettings size={24} stroke={1.5} />
      </button>
      {menu === 'notifications' && (
        <div className="uaf-popover" role="dialog">
          <p className="uaf-popover__title">Notifications</p>
          <p className="uaf-popover__empty">No new notifications.</p>
        </div>
      )}
      {menu === 'account' && (
        <div className="uaf-popover" role="menu">
          <p className="uaf-popover__title">{name}</p>
          <Link className="uaf-popover__item" href="/admin/account" onClick={() => setMenu('none')} prefetch={false} role="menuitem">
            <IconSettings size={20} stroke={1.5} />
            <span>Account Settings</span>
          </Link>
          <Link className="uaf-popover__item" href="/admin/logout" prefetch={false} role="menuitem">
            <IconLogout size={20} stroke={1.5} />
            <span>Logout</span>
          </Link>
        </div>
      )}
    </div>
  )
}
