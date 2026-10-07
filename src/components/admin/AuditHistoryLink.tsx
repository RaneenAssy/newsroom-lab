'use client'
import { useDocumentInfo } from '@payloadcms/ui'
import Link from 'next/link'
import React from 'react'

/** Sidebar link from an article to its audit trail. */
export const AuditHistoryLink: React.FC = () => {
  const { id } = useDocumentInfo()
  if (!id) return null
  const href = `/admin/collections/article-audit-logs?where[articleId][equals]=${encodeURIComponent(String(id))}`
  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      <Link href={href} className="btn btn--style-secondary btn--size-medium" style={{ display: 'inline-block' }}>
        View audit history
      </Link>
    </div>
  )
}
