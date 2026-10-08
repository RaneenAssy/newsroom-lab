'use client'
import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import Link from 'next/link'
import React from 'react'

/** Sidebar links from an article to its reader comments, and to the demo public page once it is published. */
export const CommentsLink: React.FC = () => {
  const { id } = useDocumentInfo()
  const slug = useFormFields(([fields]) => fields.slug?.value as string | undefined)
  const status = useFormFields(([fields]) => fields.status?.value as string | undefined)
  if (!id) return null
  const href = `/admin/collections/comments?where[article][equals]=${encodeURIComponent(String(id))}`
  return (
    <div style={{ marginBottom: 'var(--base)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <Link href={href} className="btn btn--style-secondary btn--size-medium" style={{ display: 'inline-block', margin: 0 }}>
        View comments
      </Link>
      {status === 'published' && slug && (
        <a href={`/news/${slug}`} target="_blank" rel="noopener noreferrer" className="btn btn--style-secondary btn--size-medium" style={{ display: 'inline-block', margin: 0 }}>
          Open public page
        </a>
      )}
    </div>
  )
}
