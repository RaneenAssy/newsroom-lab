/**
 * Port of `editorOptions` / `articleEditorOptions` from apps/backend/src/utils/helper.jsx.
 * Keep the button list, formats and link rel settings identical to the UA Finance backoffice.
 */
const DEFAULT_CHAR_COUNT = 30_000

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/** Env-configurable. NEXT_PUBLIC_ so the browser editor and the server validator agree. */
export const MAX_CHAR_COUNT = parsePositiveInt(process.env.NEXT_PUBLIC_ARTICLE_MAX_CHAR_COUNT, DEFAULT_CHAR_COUNT)

const ARTICLE_EDITOR_EXCLUDED_BUTTONS = new Set(['image', 'imageGallery'])

export const editorOptions = {
  height: 500,
  formats: ['p', 'h2', 'h3', 'h4', 'h5', 'h6'],
  buttonList: [
    ['undo', 'redo'],
    ['font', 'fontSize', 'formatBlock'],
    ['paragraphStyle', 'blockquote'],
    ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
    ['fontColor', 'hiliteColor', 'textStyle'],
    ['removeFormat'],
    ['outdent', 'indent'],
    ['align', 'horizontalRule', 'list', 'lineHeight'],
    ['table', 'link', 'image', 'imageGallery'],
    ['fullScreen', 'showBlocks', 'codeView'],
    ['preview', 'print'],
  ] as string[][],
  linkRel: ['author', 'external', 'help', 'license', 'next', 'follow', 'nofollow', 'noreferrer', 'noopener', 'prev', 'search', 'tag'],
  linkRelDefault: {
    default: 'nofollow',
    check_new_window: 'noreferrer noopener',
    check_bookmark: 'bookmark',
  },
  defaultTag: 'p',
  showPathLabel: false,
  charCounter: true,
  maxCharCount: MAX_CHAR_COUNT,
  width: '100%',
  templates: [
    { name: 'Template-1', html: '<p>HTML source1</p>' },
    { name: 'Template-2', html: '<p>HTML source2</p>' },
  ],
  codeMirror: false,
  iframe: false,
}

export const articleEditorOptions = {
  ...editorOptions,
  buttonList: editorOptions.buttonList
    .map((group) => group.filter((button) => !ARTICLE_EDITOR_EXCLUDED_BUTTONS.has(button)))
    .filter((group) => group.length > 0),
}
