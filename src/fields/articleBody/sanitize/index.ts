import * as cheerio from 'cheerio'

export { normalizeArticleBodyLinkRel } from './normalizeArticleLinkRel'
export { prepareArticleBodyHtml, sanitizeArticleBodyHtml } from './sanitizeArticleBody'

/**
 * Character count as SunEditor's default `charCounterType: 'char'` reports it: the length of the
 * editor's visible text (`wysiwyg.textContent.length`), not of the HTML markup.
 */
export function countBodyChars(html: string): number {
  if (!html) return 0
  return cheerio.load(html, null, false).root().text().length
}
