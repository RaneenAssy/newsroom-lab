import type { Media, News, NewsCategory } from '@/payload-types'
import type { Lang } from './strings'

const isObject = <T extends object>(value: unknown): value is T => typeof value === 'object' && value !== null

export const categoryName = (article: News, lang: Lang): string | null =>
  isObject<NewsCategory>(article.mainCategory) ? (lang === 'ar' && article.mainCategory.nameAr) || article.mainCategory.name : null

export const imageOf = (article: News): Media | null =>
  isObject<Media>(article.urlToImage) && article.urlToImage.url ? article.urlToImage : null

/** "October 6, 2026", as on the live article page. */
export const formatDay = (iso: string | null | undefined, lang: Lang): string | null => {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeZone: 'UTC' }).format(date)
}

/** "5m", "3h", "2d" for recent comments; the date after a week. */
export const formatAgo = (iso: string, lang: Lang, now = Date.now()): string => {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000))
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto', style: 'short' })
  if (minutes < 60) return rtf.format(-minutes, 'minute')
  if (minutes < 60 * 24) return rtf.format(-Math.round(minutes / 60), 'hour')
  if (minutes < 60 * 24 * 7) return rtf.format(-Math.round(minutes / 1440), 'day')
  return formatDay(iso, lang) ?? ''
}
