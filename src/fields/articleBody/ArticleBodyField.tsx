'use client'
import { FieldDescription, FieldError, FieldLabel, useField, useFormFields } from '@payloadcms/ui'
import type { TextareaFieldClientComponent } from 'payload'
import dynamic from 'next/dynamic'
import React from 'react'

import './articleBody.css'

// SunEditor touches `window` at import time, so it is loaded in the browser only.
const ArticleBodyEditor = dynamic(() => import('./ArticleBodyEditor'), {
  ssr: false,
  loading: () => <div className="uaf-body-editor__loading">Loading editor…</div>,
})

/** Languages written right-to-left. The legacy form reads this from the language record's `rtl` flag. */
const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur'])

export const ArticleBodyField: TextareaFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, showError } = useField<string>({ path })
  // Document language drives direction; the editor re-mounts (key) when it changes.
  const lang = useFormFields(([fields]) => fields.lang?.value as string | undefined)
  const rtl = RTL_LANGUAGES.has(String(lang ?? '').toLowerCase())

  return (
    <div className={`field-type uaf-body-field${showError ? ' error' : ''}`}>
      <FieldLabel label={field.label} path={path} required={field.required} />
      <div className="uaf-body-field__editor">
        <ArticleBodyEditor
          key={`suneditor-${lang ?? 'default'}-${rtl ? 'rtl' : 'ltr'}`}
          name={path}
          value={value ?? ''}
          onChange={setValue}
          rtl={rtl}
          readOnly={Boolean(readOnly)}
        />
      </div>
      <FieldError path={path} showError={showError} />
      <FieldDescription description={field.admin?.description} path={path} />
    </div>
  )
}

export default ArticleBodyField
