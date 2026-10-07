/**
 * Vendored from apps/api/services/articleQualityValidation/linkClassification.ts — keep logic identical.
 * The two host helpers below replace imports from the API's constants.ts/env.ts, which read process.env.
 */
const PUBLIC_BASE_DOMAIN = (process.env.PUBLIC_BASE_DOMAIN || 'uafinances.com').toLowerCase()

/** Article bodies reference production URLs even in dev/staging, so these are always internal. */
const ALLOWED_LINK_HOSTS: ReadonlySet<string> = new Set([PUBLIC_BASE_DOMAIN, `www.${PUBLIC_BASE_DOMAIN}`, `ar.${PUBLIC_BASE_DOMAIN}`])

function isUaFinancesOrLocalhostHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost')) return true
  if (host === PUBLIC_BASE_DOMAIN || host.endsWith(`.${PUBLIC_BASE_DOMAIN}`)) return true
  return false
}

const UNSAFE_SCHEME_REGEX = /^(javascript|data|vbscript):/i

function isAnchorOrFragment(url: string): boolean {
  return url.startsWith('#')
}

function isInternalAbsoluteHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return isUaFinancesOrLocalhostHost(host) || ALLOWED_LINK_HOSTS.has(host)
}

function isInternalAbsoluteUrl(url: string): boolean {
  try {
    return isInternalAbsoluteHost(new URL(url).hostname)
  } catch {
    return false
  }
}

/**
 * Returns true for internal links, false for external, null when rel normalization should be skipped.
 */
export function isInternalArticleLink(rawUrl: string): boolean | null {
  const url = rawUrl.trim()
  if (!url || isAnchorOrFragment(url)) return null

  if (UNSAFE_SCHEME_REGEX.test(url)) return null

  if (/^(mailto|tel):/i.test(url)) return null

  if (url.startsWith('//')) {
    return isInternalAbsoluteUrl(`https:${url}`)
  }

  if (url.startsWith('/')) {
    return true
  }

  if (/^https?:\/\//i.test(url)) {
    return isInternalAbsoluteUrl(url)
  }

  return null
}

export { UNSAFE_SCHEME_REGEX }
