'use client'
import { useAuth, useNav, usePreferences } from '@payloadcms/ui'
import { IconMenu2, IconSettings } from '@tabler/icons-react'
import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Admin-wide additions (`admin.components.providers`):
 *  - production's hamburger (light-gold square next to the logo), driving Payload's own nav open/closed state;
 *  - the footer production shows under every page ("© All rights reserved UA Finance"), mounted at the end of the content area;
 *  - production's floating gold "Live Customize" button and its drawer (font family + border radius), saved per staff member with
 *    Payload's preferences API and applied through the --uaf-font / --uaf-radius CSS variables.
 */
const FONT_OPTIONS = [
  { label: 'Inter', value: `'Inter', sans-serif` },
  { label: 'Poppins', value: `'Poppins', sans-serif` },
  { label: 'Roboto', value: `'Roboto', sans-serif` },
] as const
type Customization = { fontFamily: string; borderRadius: number }
const DEFAULTS: Customization = { fontFamily: `'Roboto', sans-serif`, borderRadius: 8 }
const PREFERENCE_KEY = 'uaf-backoffice-customization'

const applyCustomization = ({ fontFamily, borderRadius }: Customization) => {
  document.documentElement.style.setProperty('--uaf-font', fontFamily)
  document.documentElement.style.setProperty('--uaf-radius', `${borderRadius}px`)
}

/** Payload renders no footer slot; the footer is mounted into the content area (an internal Payload element). */
const Footer: React.FC = () => {
  const [host, setHost] = useState<Element | null>(null)
  useEffect(() => {
    const find = () => setHost(document.querySelector('.template-default__wrap'))
    find()
    const observer = new MutationObserver(find)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
  if (!host) return null
  return createPortal(
    <footer className="uaf-footer">
      © All rights reserved{' '}
      <a href="https://uafinances.com" rel="noopener noreferrer" target="_blank">
        UA Finance
      </a>
    </footer>,
    host,
  )
}

const Hamburger: React.FC = () => {
  const { navOpen, setNavOpen } = useNav()
  return (
    <button aria-expanded={navOpen} aria-label="Toggle menu" className={['uaf-square-button', 'uaf-hamburger', navOpen && 'uaf-hamburger--nav-open'].filter(Boolean).join(' ')} onClick={() => setNavOpen(!navOpen)} type="button">
      <IconMenu2 size={20} stroke={1.5} />
    </button>
  )
}

const CustomizeDrawer: React.FC<{ value: Customization; onChange: (next: Customization) => void; onClose: () => void }> = ({ value, onChange, onClose }) => (
  <>
    <button aria-label="Close customization" className="uaf-drawer-backdrop" onClick={onClose} type="button" />
    <aside aria-label="Live customize" className="uaf-drawer">
      <section className="uaf-drawer__section">
        <h2>FONT STYLE</h2>
        {FONT_OPTIONS.map((option) => (
          <label className={['uaf-drawer__font', value.fontFamily === option.value && 'uaf-drawer__font--selected'].filter(Boolean).join(' ')} key={option.label} style={{ fontFamily: option.value }}>
            <input checked={value.fontFamily === option.value} name="uaf-font" onChange={() => onChange({ ...value, fontFamily: option.value })} type="radio" />
            {option.label}
          </label>
        ))}
      </section>
      <section className="uaf-drawer__section">
        <h2>BORDER RADIUS</h2>
        <div className="uaf-drawer__radius">
          <span>4px</span>
          <input aria-label="Border radius" max={24} min={4} onChange={(event) => onChange({ ...value, borderRadius: Number(event.target.value) })} step={2} type="range" value={value.borderRadius} />
          <span>24px</span>
        </div>
      </section>
    </aside>
  </>
)

export const BackofficeShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const { getPreference, setPreference } = usePreferences()
  const [customization, setCustomization] = useState<Customization>(DEFAULTS)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    void getPreference<Customization>(PREFERENCE_KEY).then((saved) => {
      const next = { ...DEFAULTS, ...(saved ?? {}) }
      setCustomization(next)
      applyCustomization(next)
    })
  }, [user, getPreference])

  const update = useCallback(
    (next: Customization) => {
      setCustomization(next)
      applyCustomization(next)
      void setPreference(PREFERENCE_KEY, next)
    },
    [setPreference],
  )

  return (
    <>
      {children}
      {user && (
        <>
          <Hamburger />
          <Footer />
          <button aria-label="Live customize" className="uaf-customize-fab" onClick={() => setDrawerOpen(true)} type="button">
            <IconSettings size={24} stroke={1.5} />
          </button>
          {drawerOpen && <CustomizeDrawer onChange={update} onClose={() => setDrawerOpen(false)} value={customization} />}
        </>
      )}
    </>
  )
}
