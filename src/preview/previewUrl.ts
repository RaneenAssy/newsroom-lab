import type { PayloadRequest } from 'payload'

/**
 * Origin of the running server (e.g. http://localhost:3100), used to build absolute preview URLs.
 * `NEXT_PUBLIC_SERVER_URL` wins when set (needed behind some proxies); otherwise it is derived from the request,
 * so the preview works on whatever port the dev server happens to use.
 */
export const getServerOrigin = (req: Pick<PayloadRequest, 'headers'>): string => {
  const configured = process.env.NEXT_PUBLIC_SERVER_URL
  if (configured) return configured.replace(/\/$/, '')
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  const protocol = req.headers.get('x-forwarded-proto') ?? 'http'
  return host ? `${protocol}://${host}` : 'http://localhost:3000'
}

/** Path of the staff-only article preview page (see src/app/(preview)). */
export const newsPreviewPath = (id: string | number): string => `/preview/news/${id}`

export const newsPreviewUrl = (req: Pick<PayloadRequest, 'headers'>, id: string | number | undefined | null): string | null =>
  id === undefined || id === null || id === '' ? null : `${getServerOrigin(req)}${newsPreviewPath(id)}`
