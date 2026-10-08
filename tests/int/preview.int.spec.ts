import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanPreviewHtml } from '@/preview/cleanHtml'
import { getServerOrigin, newsPreviewPath, newsPreviewUrl } from '@/preview/previewUrl'

const request = (headers: Record<string, string>) => ({ headers: new Headers(headers) })

describe('cleanPreviewHtml', () => {
  it('keeps normal article markup, including Arabic text, headings, tables and links', () => {
    const html = '<h2>عنوان</h2><p>نص <a href="https://ar.uafinances.com/x" target="_blank">رابط</a></p><table><tbody><tr><td>1</td></tr></tbody></table>'
    expect(cleanPreviewHtml(html)).toBe(html)
  })

  it('removes script-like elements', () => {
    const out = cleanPreviewHtml('<p>a</p><script>alert(1)</script><iframe src="https://evil.example"></iframe><style>p{}</style><p>b</p>')
    expect(out).toBe('<p>a</p><p>b</p>')
  })

  it('removes inline event handlers but keeps the element', () => {
    expect(cleanPreviewHtml('<p onclick="x()">hi</p><img src="a.png" onerror="x()">')).toBe('<p>hi</p><img src="a.png">')
  })

  it('neutralises javascript: and vbscript: URLs, including with hidden whitespace', () => {
    const out = cleanPreviewHtml('<a href="javascript:alert(1)">a</a><a href="java\nscript:alert(1)">b</a><a href="VBScript:x">c</a><a href="https://ok.example">d</a>')
    expect(out).not.toMatch(/javascript|vbscript/i)
    expect(out).toContain('href="https://ok.example"')
  })

  it('returns empty input unchanged', () => {
    expect(cleanPreviewHtml('')).toBe('')
  })
})

describe('preview URLs', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('builds the preview path', () => {
    expect(newsPreviewPath('abc123')).toBe('/preview/news/abc123')
  })

  it('derives the origin from the request host, so any dev port works', () => {
    expect(getServerOrigin(request({ host: 'localhost:3100' }))).toBe('http://localhost:3100')
    expect(getServerOrigin(request({ 'x-forwarded-host': 'cms.example.com', 'x-forwarded-proto': 'https', host: 'internal:3000' }))).toBe('https://cms.example.com')
  })

  it('prefers NEXT_PUBLIC_SERVER_URL when set, without a trailing slash', () => {
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'https://admin.example.com/')
    expect(getServerOrigin(request({ host: 'localhost:3100' }))).toBe('https://admin.example.com')
  })

  it('has no preview URL for an article that is not saved yet', () => {
    expect(newsPreviewUrl(request({ host: 'localhost:3100' }), undefined)).toBeNull()
    expect(newsPreviewUrl(request({ host: 'localhost:3100' }), 'abc')).toBe('http://localhost:3100/preview/news/abc')
  })
})
