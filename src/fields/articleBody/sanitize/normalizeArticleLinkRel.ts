/** Vendored from apps/api/services/articleQualityValidation/normalizeArticleLinkRel.ts — keep logic identical. */
import * as cheerio from 'cheerio';
import { isInternalArticleLink } from './linkClassification';

const REL_TOKENS_TO_STRIP_FOR_INTERNAL = new Set(['nofollow', 'dofollow', 'follow']);
const REL_TOKENS_TO_STRIP_FOR_EXTERNAL = new Set(['dofollow', 'follow']);
const NOFOLLOW_TOKEN = 'nofollow';

function parseRelTokens(rel: string | undefined): string[] {
  if (!rel?.trim()) return [];
  return rel.trim().split(/\s+/).filter(Boolean);
}

function normalizeRelTokens(tokens: string[], isInternal: boolean): string[] {
  const stripSet = isInternal ? REL_TOKENS_TO_STRIP_FOR_INTERNAL : REL_TOKENS_TO_STRIP_FOR_EXTERNAL;
  const normalized = tokens.filter((token) => !stripSet.has(token.toLowerCase()));

  if (!isInternal && !normalized.some((token) => token.toLowerCase() === NOFOLLOW_TOKEN)) {
    normalized.push(NOFOLLOW_TOKEN);
  }

  return normalized;
}

function applyRelToAnchor($anchor: ReturnType<cheerio.CheerioAPI>, href: string): void {
  const classification = isInternalArticleLink(href);
  if (classification === null) return;

  const currentRel = $anchor.attr('rel');
  const normalizedTokens = normalizeRelTokens(parseRelTokens(currentRel), classification);

  if (normalizedTokens.length === 0) {
    $anchor.removeAttr('rel');
    return;
  }

  $anchor.attr('rel', normalizedTokens.join(' '));
}

export function normalizeArticleBodyLinkRel(html: string): string {
  if (!html?.trim()) return html;

  const $ = cheerio.load(html, null, false);

  $('a[href]').each((_, element) => {
    const $anchor = $(element);
    const href = $anchor.attr('href');
    if (href) applyRelToAnchor($anchor, href.trim());
  });

  return $.root().html() ?? html;
}
