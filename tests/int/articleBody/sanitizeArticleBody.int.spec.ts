// @vitest-environment node
/**
 * Pasted Word/Docs HTML and SunEditor image inserts leave <img>/<svg> and
 * trailing empty <p><br></p> in the article body. Those persist into the
 * public page as a large gap after the last paragraph (and as inline media
 * we are not supporting in description for now).
 */
import { describe, expect, it } from 'vitest';
import { prepareArticleBodyHtml, sanitizeArticleBodyHtml } from '@/fields/articleBody/sanitize/sanitizeArticleBody';

describe('sanitizeArticleBodyHtml', () => {
  it('strips img tags and keeps surrounding paragraphs', () => {
    const html = '<p>Lead <img src="https://cdn.example.com/chart.png" alt="chart"> more</p><p>Close</p>';
    expect(sanitizeArticleBodyHtml(html)).toBe('<p>Lead  more</p><p>Close</p>');
  });

  it('strips svg and picture tags', () => {
    const html =
      '<p>Start</p><svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200"/></svg><picture><source srcset="a.webp"><img src="a.jpg"></picture><p>End</p>';
    expect(sanitizeArticleBodyHtml(html)).toBe('<p>Start</p><p>End</p>');
  });

  it('removes leftover SunEditor image wrappers after the image is gone', () => {
    const html = '<p>Body</p><figure class="se-image-container __se__float-none"><img src="https://cdn.example.com/x.png" alt=""></figure>';
    expect(sanitizeArticleBodyHtml(html)).toBe('<p>Body</p>');
  });

  it('collapses several trailing empty blocks including nbsp and br-only paragraphs', () => {
    const html = '<p>Last sentence.</p><p><br></p><p>&nbsp;</p><p> </p><p><br></p>';
    expect(sanitizeArticleBodyHtml(html)).toBe('<p>Last sentence.</p>');
  });

  it('collapses several leading empty blocks including nbsp and br-only paragraphs', () => {
    const html = '<p><br></p><p>&nbsp;</p><p> </p><p>First sentence.</p>';
    expect(sanitizeArticleBodyHtml(html)).toBe('<p>First sentence.</p>');
  });

  it('drops trailing empty headings left after media removal', () => {
    const html = '<p>Last sentence.</p><h2><br></h2><div>&nbsp;</div>';
    expect(sanitizeArticleBodyHtml(html)).toBe('<p>Last sentence.</p>');
  });

  it('keeps a real table and list that are not trailing empties', () => {
    const html = '<p>Intro</p><ul><li>One</li></ul><table><tr><td>Cell</td></tr></table>';
    const result = sanitizeArticleBodyHtml(html);
    expect(result).toContain('<p>Intro</p>');
    expect(result).toContain('<ul><li>One</li></ul>');
    expect(result).toContain('<td>Cell</td>');
  });

  it('returns empty or whitespace html unchanged', () => {
    expect(sanitizeArticleBodyHtml('')).toBe('');
    expect(sanitizeArticleBodyHtml('   ')).toBe('   ');
  });
});

describe('prepareArticleBodyHtml', () => {
  it('strips media then applies the existing link-rel normalize', () => {
    const html = '<p><a href="https://evil.com/x">external</a></p><p><img src="x.png"></p><p><br></p>';
    const result = prepareArticleBodyHtml(html);
    expect(result).toContain('rel="nofollow"');
    expect(result).toContain('<a href="https://evil.com/x" rel="nofollow">external</a>');
    expect(result).not.toContain('<img');
    expect(result).not.toContain('<br');
  });
});
