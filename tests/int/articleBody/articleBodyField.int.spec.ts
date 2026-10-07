// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { articleBodyField } from '@/fields/articleBody'
import { articleEditorOptions, editorOptions, MAX_CHAR_COUNT } from '@/fields/articleBody/editorOptions'
import { countBodyChars, prepareArticleBodyHtml } from '@/fields/articleBody/sanitize'

const field = articleBodyField({ name: 'description', required: true })
const validate = field.validate as (value: string | null | undefined) => string | true
const beforeValidate = field.hooks?.beforeValidate?.[0] as (args: { value: unknown }) => unknown

describe('editor options parity with apps/backend helper.jsx', () => {
  it('removes only image and imageGallery from the article toolbar', () => {
    expect(articleEditorOptions.buttonList).toEqual([
      ['undo', 'redo'],
      ['font', 'fontSize', 'formatBlock'],
      ['paragraphStyle', 'blockquote'],
      ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
      ['fontColor', 'hiliteColor', 'textStyle'],
      ['removeFormat'],
      ['outdent', 'indent'],
      ['align', 'horizontalRule', 'list', 'lineHeight'],
      ['table', 'link'],
      ['fullScreen', 'showBlocks', 'codeView'],
      ['preview', 'print'],
    ])
    const flat = articleEditorOptions.buttonList.flat()
    expect(flat).not.toContain('image')
    expect(flat).not.toContain('imageGallery')
    expect(flat).not.toContain('video')
  })

  it('keeps block formats, link rel options and defaults', () => {
    expect(editorOptions.formats).toEqual(['p', 'h2', 'h3', 'h4', 'h5', 'h6'])
    expect(editorOptions.defaultTag).toBe('p')
    expect(editorOptions.linkRelDefault).toEqual({ default: 'nofollow', check_new_window: 'noreferrer noopener', check_bookmark: 'bookmark' })
    expect(editorOptions.linkRel).toEqual(['author', 'external', 'help', 'license', 'next', 'follow', 'nofollow', 'noreferrer', 'noopener', 'prev', 'search', 'tag'])
    expect(editorOptions.charCounter).toBe(true)
    expect(editorOptions.maxCharCount).toBe(MAX_CHAR_COUNT)
    expect(MAX_CHAR_COUNT).toBe(30_000)
  })
})

describe('articleBodyField', () => {
  it('stores a plain string under `description` with the custom editor component', () => {
    expect(field.name).toBe('description')
    expect(field.type).toBe('textarea')
    expect(field.admin?.components?.Field).toBe('/fields/articleBody/ArticleBodyField#ArticleBodyField')
  })

  it('applies the same sanitation as prepareArticleBodyHtml before validation', () => {
    const html = '<p>Hi <img src="x.png"></p><p><a href="https://evil.com">x</a></p><p><br></p>'
    expect(beforeValidate({ value: html })).toBe(prepareArticleBodyHtml(html))
    expect(beforeValidate({ value: html })).toBe('<p>Hi </p><p><a href="https://evil.com" rel="nofollow">x</a></p>')
    expect(beforeValidate({ value: undefined })).toBeUndefined()
  })

  it('is idempotent, so re-saving a saved body changes nothing', () => {
    const wordish = '<p class="MsoNormal"><b>Bold</b> text <a href="https://evil.com/a">link</a></p><p><br></p><p>&nbsp;</p>'
    const once = prepareArticleBodyHtml(wordish)
    expect(prepareArticleBodyHtml(once)).toBe(once)
  })

  it('requires a non-empty body', () => {
    expect(validate('')).toBe('This field is required.')
    expect(validate(undefined)).toBe('This field is required.')
    expect(validate('<p><br></p>')).toBe('This field is required.')
    expect(validate('<p>Hello</p>')).toBe(true)
  })

  it('counts visible characters like SunEditor and enforces the limit', () => {
    expect(countBodyChars('<p>abc</p><p>de</p>')).toBe(5)
    expect(countBodyChars('<p>' + 'x'.repeat(MAX_CHAR_COUNT) + '</p>')).toBe(MAX_CHAR_COUNT)
    expect(validate('<p>' + 'x'.repeat(MAX_CHAR_COUNT) + '</p>')).toBe(true)
    expect(validate('<p>' + 'x'.repeat(MAX_CHAR_COUNT + 1) + '</p>')).toMatch(/limit is 30,000/)
    // markup does not count toward the limit
    expect(validate('<p><strong>' + 'x'.repeat(MAX_CHAR_COUNT) + '</strong></p>')).toBe(true)
  })

  it('counts Arabic text per character', () => {
    expect(countBodyChars('<p>مرحبا بالعالم</p>')).toBe('مرحبا بالعالم'.length)
  })
})
