/** Vendored from apps/api/services/articleQualityValidation/sanitizeArticleBody.ts — keep logic identical. */
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { normalizeArticleBodyLinkRel } from './normalizeArticleLinkRel';

const INLINE_MEDIA_SELECTOR = 'svg, img, picture';
const IMAGE_WRAPPER_SELECTOR = '.se-image-container';
const EMPTY_EDGE_TAGS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figure', 'br']);
const INVISIBLE_CHARS = /[\s\u00a0\u200B]+/g;

function hasVisibleText($node: { text: () => string }): boolean {
  return $node.text().replace(INVISIBLE_CHARS, '').length > 0;
}

function shouldDropEmptyEdgeNode($: cheerio.CheerioAPI, node: AnyNode): boolean {
  const $node = $(node);
  if (node.type === 'text' || node.type === 'comment') return !hasVisibleText($node);

  const tag = $node.prop('tagName');
  if (typeof tag !== 'string') return false;

  const normalized = tag.toLowerCase();
  if (normalized === 'br') return true;
  if (!EMPTY_EDGE_TAGS.has(normalized)) return false;
  return !hasVisibleText($node);
}

function stripInlineMedia($: cheerio.CheerioAPI): void {
  $(INLINE_MEDIA_SELECTOR).remove();
  $(IMAGE_WRAPPER_SELECTOR).remove();

  $('figure').each((_, element) => {
    const $figure = $(element);
    if (hasVisibleText($figure)) return;
    $figure.remove();
  });
}

function trimEmptyEdgeBlocks($: cheerio.CheerioAPI): void {
  const root = $.root();
  let children = root.contents().toArray();

  while (children.length > 0) {
    const first = children[0];
    if (!first || !shouldDropEmptyEdgeNode($, first)) break;
    $(first).remove();
    children = root.contents().toArray();
  }

  while (children.length > 0) {
    const last = children[children.length - 1];
    if (!last || !shouldDropEmptyEdgeNode($, last)) break;
    $(last).remove();
    children = root.contents().toArray();
  }
}

export function sanitizeArticleBodyHtml(html: string): string {
  if (!html?.trim()) return html;

  const $ = cheerio.load(html, null, false);
  stripInlineMedia($);
  trimEmptyEdgeBlocks($);
  return $.root().html() ?? '';
}

export function prepareArticleBodyHtml(html: string): string {
  return normalizeArticleBodyLinkRel(sanitizeArticleBodyHtml(html));
}
