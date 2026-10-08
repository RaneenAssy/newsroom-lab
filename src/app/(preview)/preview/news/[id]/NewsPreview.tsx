'use client'
import { useLivePreview } from '@payloadcms/live-preview-react'
import React from 'react'

import type { Media, News, NewsCategory } from '@/payload-types'
import { cleanPreviewHtml } from '@/preview/cleanHtml'

const STATUS_LABEL: Record<NonNullable<News['status']>, string> = { draft: 'Draft', scheduled: 'Scheduled', published: 'Published' }

const formatDate = (iso: string | null | undefined, lang: string, timeZone?: string | null): string | null => {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const locale = lang === 'ar' ? 'ar' : 'en'
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short', timeZone: timeZone || undefined }).format(date)
  } catch {
    // An unknown timezone name must not break the preview: fall back to UTC.
    return `${new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' }).format(date)} UTC`
  }
}

const isObject = <T extends object>(value: unknown): value is T => typeof value === 'object' && value !== null

/**
 * Renders a news article as readers would see it. `useLivePreview` receives the editor's form state from the admin
 * (window.postMessage) while it is open inside Live Preview, so the page updates as staff type, before saving.
 */
export function NewsPreview({ initialData, serverURL }: { initialData: News; serverURL: string }) {
  const { data } = useLivePreview<News>({ initialData, serverURL, depth: 2 })
  const rtl = data.lang === 'ar'
  const category = isObject<NewsCategory>(data.mainCategory) ? ((rtl && data.mainCategory.nameAr) || data.mainCategory.name) : null
  const image = isObject<Media>(data.urlToImage) && data.urlToImage.url ? data.urlToImage : null
  const when = formatDate(data.publishedAt ?? data.scheduleTime, data.lang, data.scheduleTimezone)
  const tags = (data.tags ?? []).filter((tag) => tag.kind === 'symbol' || tag.kind === 'topic')
  const countries = (data.countries ?? []).map((country) => country.country ?? country.code).filter(Boolean)
  const body = cleanPreviewHtml(data.description ?? '')

  return (
    <div className="preview-shell">
      <div className="preview-banner" dir="ltr">
        <span className={`pill pill-${data.status}`}>{STATUS_LABEL[data.status ?? 'draft']}</span>
        <span>Private preview. Nothing here is public.</span>
        <span className="live">Updates as you type</span>
      </div>

      <article dir={rtl ? 'rtl' : 'ltr'} lang={data.lang} className="article">
        {category && <p className="kicker">{category}</p>}
        <h1>{data.title || (rtl ? 'بدون عنوان' : 'Untitled article')}</h1>
        <p className="byline">
          {data.newsBy && <span>{data.newsBy}</span>}
          {when && (
            <span suppressHydrationWarning>
              {data.newsBy ? ' · ' : ''}
              {when}
            </span>
          )}
        </p>

        {image && (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url ?? ''} alt={data.altText ?? image.alt ?? ''} />
            {(data.altText || data.imageSourceCredit) && (
              <figcaption>
                {data.altText}
                {data.altText && data.imageSourceCredit ? ' · ' : ''}
                {data.imageSourceCredit}
              </figcaption>
            )}
          </figure>
        )}

        <div className="article-body" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: body }} />

        {(tags.length > 0 || countries.length > 0) && (
          <footer className="article-meta">
            {tags.map((tag) => (
              <span key={tag.id ?? `${tag.kind}-${tag.key}`} className="chip">
                {tag.key}
              </span>
            ))}
            {countries.map((country) => (
              <span key={country} className="chip chip-country">
                {country}
              </span>
            ))}
          </footer>
        )}
      </article>
    </div>
  )
}
