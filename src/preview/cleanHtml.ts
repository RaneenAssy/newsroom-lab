/**
 * Makes article HTML safe to inject into the preview page.
 *
 * Saved articles are already sanitised by the body field's hook, but in Live Preview the page also receives the editor's
 * UNSAVED form state, which has not been through any hook yet. This strips what could run code in the preview frame:
 * script-like elements, inline event handlers and javascript:/vbscript: URLs. It only runs in the browser (it needs
 * DOMParser); on the server the already-sanitised stored HTML is returned unchanged.
 */
const BLOCKED_TAGS = 'script, style, iframe, object, embed, link, meta, base, form, noscript'
const URL_ATTRIBUTES = new Set(['href', 'src', 'xlink:href', 'formaction', 'action'])
const UNSAFE_URL = /^(javascript|vbscript):/i

export function cleanPreviewHtml(html: string): string {
  if (!html || typeof DOMParser === 'undefined') return html
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  doc.body.querySelectorAll(BLOCKED_TAGS).forEach((element) => element.remove())
  doc.body.querySelectorAll('*').forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.replace(/[\s\u0000-\u001f]+/g, '')
      if (name.startsWith('on') || (URL_ATTRIBUTES.has(name) && UNSAFE_URL.test(value))) element.removeAttribute(attribute.name)
    }
  })
  return doc.body.innerHTML
}
