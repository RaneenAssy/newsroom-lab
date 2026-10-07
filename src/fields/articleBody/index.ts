import type { TextareaField } from 'payload'
import { MAX_CHAR_COUNT } from './editorOptions'
import { countBodyChars, prepareArticleBodyHtml } from './sanitize'

type Options = Partial<Omit<TextareaField, 'type' | 'name'>> & { name?: string; required?: boolean }

/**
 * The article body: an HTML string edited with SunEditor (same toolbar and rules as the UA Finance
 * backoffice). Stored exactly like before — a plain string — so existing articles load unchanged.
 */
export const articleBodyField = ({ name = 'description', required = true, ...rest }: Options = {}): TextareaField => ({
  type: 'textarea',
  name,
  label: 'Body',
  required,
  ...rest,
  admin: {
    description: `Article body (HTML). Max ${MAX_CHAR_COUNT.toLocaleString()} characters of text. Images are not allowed; external links get rel="nofollow".`,
    ...rest.admin,
    components: { Field: '/fields/articleBody/ArticleBodyField#ArticleBodyField' },
  },
  hooks: {
    // Same normalization the legacy API applies on every save (prepareArticleBodyHtml).
    beforeValidate: [({ value }) => (typeof value === 'string' ? prepareArticleBodyHtml(value) : value)],
  },
  validate: (value: string | null | undefined) => {
    const html = typeof value === 'string' ? value : ''
    const chars = countBodyChars(html)
    if (required && (chars === 0 || !html.trim())) return 'This field is required.'
    if (chars > MAX_CHAR_COUNT) return `The body is ${chars.toLocaleString()} characters; the limit is ${MAX_CHAR_COUNT.toLocaleString()}.`
    return true
  },
})

export { MAX_CHAR_COUNT, countBodyChars, prepareArticleBodyHtml }
