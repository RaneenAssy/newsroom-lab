import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { menuTitles } from '../menu/menuItems'

/**
 * `/admin/coming-soon/:section` — where sidebar items for sections not migrated yet land, so the menu is complete.
 * Custom root views render without Payload's page frame, so this one wraps itself in DefaultTemplate (sidebar, header, panel).
 */
export const ComingSoonView = ({ initPageResult, params, searchParams, viewActions }: AdminViewServerProps) => {
  const segments = params?.segments
  const section = Array.isArray(segments) ? (segments[1] ?? '') : ''
  const title = menuTitles.get(section) ?? 'This section'
  const { req, locale, permissions, visibleEntities } = initPageResult
  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user ?? undefined}
      viewActions={viewActions}
      viewType="comingSoon"
      visibleEntities={visibleEntities}
    >
      <div className="uaf-coming-soon">
        <h1>{title}</h1>
        <p>This section has not been moved to the new backoffice yet. It is still available in the current UA Finance backoffice.</p>
      </div>
    </DefaultTemplate>
  )
}
