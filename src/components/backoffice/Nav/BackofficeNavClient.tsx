'use client'
/* eslint-disable @next/next/no-img-element */
import { useNav } from '@payloadcms/ui'
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState } from 'react'

import { MenuIcon } from '../icons/MenuIcon'
import type { MenuCollapse, MenuGroup, MenuLink } from '../menu/menuItems'

/** The red count pill production shows on "AI Newsroom" (collapsed) or on "AI Suggestions" (open). */
const CountBadge: React.FC<{ count: number }> = ({ count }) =>
  count > 0 ? (
    <span aria-label={`${count} stories waiting`} className="uaf-nav__badge">
      {count > 99 ? '99+' : count}
    </span>
  ) : null

const isActive = (href: string, pathname: string): boolean => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`))

const NavLink: React.FC<{ link: MenuLink; pathname: string; nested?: boolean; badge?: number }> = ({ link, pathname, nested = false, badge = 0 }) => {
  const active = !link.external && isActive(link.href, pathname)
  const className = ['uaf-nav__link', nested && 'uaf-nav__link--nested', active && 'uaf-nav__link--active'].filter(Boolean).join(' ')
  const content = (
    <>
      <span className="uaf-nav__icon">{nested ? <span className="uaf-nav__dot" /> : link.icon ? <MenuIcon icon={link.icon} /> : null}</span>
      <span className="uaf-nav__label">{link.title}</span>
      <CountBadge count={badge} />
    </>
  )
  return link.external ? (
    <a className={className} href={link.href} rel="noopener noreferrer" target="_blank">
      {content}
    </a>
  ) : (
    <Link aria-current={active ? 'page' : undefined} className={className} href={link.href} prefetch={false}>
      {content}
    </Link>
  )
}

const NavCollapseItem: React.FC<{ entry: MenuCollapse; pathname: string; pendingSuggestions: number }> = ({ entry, pathname, pendingSuggestions }) => {
  const containsActive = entry.children.some((child) => !child.external && isActive(child.href, pathname))
  const [open, setOpen] = useState(containsActive)
  const isNewsroom = entry.id === 'ai-newsroom'
  return (
    <div className="uaf-nav__collapse">
      <button aria-expanded={open} className={['uaf-nav__link', containsActive && 'uaf-nav__link--within'].filter(Boolean).join(' ')} onClick={() => setOpen(!open)} type="button">
        <span className="uaf-nav__icon">
          <MenuIcon icon={entry.icon} />
        </span>
        <span className="uaf-nav__label">{entry.title}</span>
        {isNewsroom && !open && <CountBadge count={pendingSuggestions} />}
        <span className="uaf-nav__chevron">{open ? <IconChevronUp size={16} stroke={1.5} /> : <IconChevronDown size={16} stroke={1.5} />}</span>
      </button>
      {open && (
        <div className="uaf-nav__children">
          {entry.children.map((child) => (
            <NavLink badge={isNewsroom && child.id === 'newsroom-suggestions' ? pendingSuggestions : 0} key={child.id} link={child} nested pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  )
}

export const BackofficeNavClient: React.FC<{ menu: MenuGroup[]; pendingSuggestions: number }> = ({ menu, pendingSuggestions }) => {
  const { navOpen } = useNav()
  const pathname = usePathname() ?? ''
  return (
    <aside aria-label="Backoffice navigation" className={['uaf-nav', navOpen && 'uaf-nav--open'].filter(Boolean).join(' ')}>
      <div className="uaf-nav__brand">
        <Link aria-label="UA Finance dashboard" href="/admin" prefetch={false}>
          <img alt="UA Finance" src="/backoffice/logo.png" width={140} />
        </Link>
      </div>
      <nav className="uaf-nav__scroll">
        {menu.map((group, index) => (
          <div className="uaf-nav__group" key={group.id}>
            <p className="uaf-nav__caption">{group.title}</p>
            {group.children.map((entry) =>
              entry.kind === 'collapse' ? (
                <NavCollapseItem entry={entry} key={entry.id} pathname={pathname} pendingSuggestions={pendingSuggestions} />
              ) : (
                <NavLink key={entry.id} link={entry} pathname={pathname} />
              ),
            )}
            {index < menu.length - 1 && <hr className="uaf-nav__divider" />}
          </div>
        ))}
      </nav>
    </aside>
  )
}
