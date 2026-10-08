import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import type { News } from '@/payload-types'
import { getServerOrigin } from '@/preview/previewUrl'
import { NewsPreview } from './NewsPreview'

// Always rendered on request: it depends on the staff session cookie and on unsaved content.
export const dynamic = 'force-dynamic'

const Notice = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <main className="notice">
    <h1>{title}</h1>
    <p>{children}</p>
  </main>
)

/**
 * Staff-only preview of a news article, shown inside the admin's Live Preview panel (and openable on its own).
 * It reads the article as the logged-in staff member, so the usual news permissions apply.
 */
export default async function NewsPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const headers = await getHeaders()
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers })

  if (!user || user.collection !== 'staff') {
    return (
      <Notice title="Staff only">
        This is a private preview. Sign in to the admin panel in this browser, then reload this page.
      </Notice>
    )
  }

  let article: News
  try {
    article = await payload.findByID({ collection: 'news', id, depth: 2, user, overrideAccess: false })
  } catch {
    return (
      <Notice title="Article not available">
        This article does not exist, or your role does not allow you to view it.
      </Notice>
    )
  }

  return <NewsPreview initialData={article} serverURL={getServerOrigin({ headers: new Headers(headers) })} />
}
