// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isInternalArticleLink } from '@/fields/articleBody/sanitize/linkClassification';
import { normalizeArticleBodyLinkRel } from '@/fields/articleBody/sanitize/normalizeArticleLinkRel';

describe('isInternalArticleLink', () => {
  it('treats relative paths as internal', () => {
    expect(isInternalArticleLink('/articles/some-slug')).toBe(true);
    expect(isInternalArticleLink('/news/category/slug')).toBe(true);
  });

  it('treats uafinances.com hosts as internal', () => {
    expect(isInternalArticleLink('https://uafinances.com/news/foo')).toBe(true);
    expect(isInternalArticleLink('https://www.uafinances.com/articles/foo')).toBe(true);
    expect(isInternalArticleLink('https://ar.uafinances.com/news/foo')).toBe(true);
  });

  it('treats localhost hosts as internal', () => {
    expect(isInternalArticleLink('https://localhost:5173/news/foo')).toBe(true);
    expect(isInternalArticleLink('https://ar.localhost:5173/articles/foo')).toBe(true);
  });

  it('treats other domains as external', () => {
    expect(isInternalArticleLink('https://evil.com/x')).toBe(false);
    expect(isInternalArticleLink('//evil.com/x')).toBe(false);
  });

  it('returns null for anchors, mailto, tel, and unsafe schemes', () => {
    expect(isInternalArticleLink('#section')).toBeNull();
    expect(isInternalArticleLink('mailto:test@example.com')).toBeNull();
    expect(isInternalArticleLink('tel:+1234567890')).toBeNull();
    expect(isInternalArticleLink('javascript:alert(1)')).toBeNull();
    expect(isInternalArticleLink('')).toBeNull();
  });
});

describe('normalizeArticleBodyLinkRel', () => {
  it('adds nofollow to external links without rel', () => {
    const html = '<p><a href="https://evil.com/x">external</a></p>';
    const result = normalizeArticleBodyLinkRel(html);
    expect(result).toContain('rel="nofollow"');
  });

  it('preserves noopener and noreferrer on external links', () => {
    const html = '<p><a href="https://evil.com/x" rel="noopener noreferrer nofollow">external</a></p>';
    const result = normalizeArticleBodyLinkRel(html);
    expect(result).toContain('noopener');
    expect(result).toContain('noreferrer');
    expect(result).toContain('nofollow');
    expect(result).not.toContain('dofollow');
  });

  it('removes nofollow from internal uafinances links', () => {
    const html = '<p><a href="https://uafinances.com/news/foo" rel="nofollow">internal</a></p>';
    const result = normalizeArticleBodyLinkRel(html);
    expect(result).not.toContain('nofollow');
    expect(result).not.toMatch(/rel="/);
  });

  it('removes nofollow but keeps noopener on internal relative links', () => {
    const html = '<p><a href="/articles/slug" rel="nofollow noopener">internal</a></p>';
    const result = normalizeArticleBodyLinkRel(html);
    expect(result).not.toContain('nofollow');
    expect(result).toContain('noopener');
  });

  it('leaves anchor links unchanged', () => {
    const html = '<p><a href="#section" rel="nofollow">anchor</a></p>';
    expect(normalizeArticleBodyLinkRel(html)).toBe(html);
  });

  it('leaves mailto links unchanged', () => {
    const html = '<p><a href="mailto:test@example.com" rel="nofollow">email</a></p>';
    expect(normalizeArticleBodyLinkRel(html)).toBe(html);
  });

  it('normalizes mixed internal and external links independently', () => {
    const html = '<p><a href="/news/foo" rel="nofollow">internal</a> and <a href="https://evil.com">external</a></p>';
    const result = normalizeArticleBodyLinkRel(html);
    expect(result).toContain('<a href="/news/foo">internal</a>');
    expect(result).toContain('<a href="https://evil.com" rel="nofollow">external</a>');
  });

  it('returns empty or whitespace html unchanged', () => {
    expect(normalizeArticleBodyLinkRel('')).toBe('');
    expect(normalizeArticleBodyLinkRel('   ')).toBe('   ');
  });
});
