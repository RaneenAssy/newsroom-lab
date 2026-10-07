'use client'
/**
 * SunEditor wrapper — port of apps/backend/src/views/common/CustomEditor.jsx, adapted to Payload:
 *  - seeded through `defaultValue` (SunEditor's `value` option) instead of the `setContents` prop, so a
 *    freshly opened article neither steals focus (`focusEdge`) nor echoes a normalized `onChange`;
 *  - later external changes (version restore, programmatic replace) are applied with `setContents`
 *    only while the editor is unfocused, so typing never causes a cursor jump.
 */
import React, { useCallback, useEffect, useRef } from 'react'
import SunEditorBase from 'suneditor-react'
import 'suneditor/dist/css/suneditor.min.css'
import plugins from 'suneditor/src/plugins'

import { articleEditorOptions } from './editorOptions'
import { keepCharCounterInertAfterDestroy } from './editor/suneditorCharCounter'
import { resolveListBackspaceWipeTarget, unlistListItemPreservingContent } from './editor/suneditorListBackspace'
import { extractSelectedBlocksFromBoldWrappers, isBoldCommand } from './editor/suneditorUnbold'
import { rebindToolbarLabelTargets, syncToolbarLabelsFromSelectionStart } from './editor/suneditorToolbarLabels'

// suneditor-react's typings omit what it really passes at runtime (the editor `core` as 2nd handler arg
// and options such as `dialogDisplay`), which the legacy editor relies on.
const SunEditor = SunEditorBase as unknown as React.ComponentType<any>

type Props = {
  name: string
  value: string
  onChange: (html: string) => void
  rtl: boolean
  readOnly?: boolean
  height?: string
}

const ArticleBodyEditor: React.FC<Props> = ({ name, value, onChange, rtl, readOnly = false, height = '500px' }) => {
  const editorRef = useRef<any>(null)
  const coreRef = useRef<any>(null)
  const initialValue = useRef(value)
  /** Last HTML the editor and the form agree on. Anything equal to it is not a user edit. */
  const lastHtml = useRef(value)

  const handleKeyDown = (event: KeyboardEvent, core: any) => {
    const target = resolveListBackspaceWipeTarget({ event, core })
    if (!target) return
    const handled = unlistListItemPreservingContent(core, target.list, target.listItem)
    if (!handled) return
    event.preventDefault()
    event.stopPropagation()
    core.history.push(true)
    return false
  }

  const syncToolbarLabels = useCallback((core?: any) => {
    const editorCore = core || coreRef.current
    if (!editorCore) return
    window.setTimeout(() => syncToolbarLabelsFromSelectionStart(editorCore), 0)
  }, [])

  const handleLoad = useCallback(() => {
    if (coreRef.current) rebindToolbarLabelTargets(coreRef.current)
  }, [])

  const getSunEditorInstance = useCallback((editor: any) => {
    const core = editor?.core
    if (!core) return
    editorRef.current = editor
    coreRef.current = core
    keepCharCounterInertAfterDestroy(editor)

    if (typeof editor.setToolbarButtons === 'function' && !editor.__uaToolbarButtonsWrapped) {
      editor.__uaToolbarButtonsWrapped = true
      const original = editor.setToolbarButtons.bind(editor)
      editor.setToolbarButtons = function uaSetToolbarButtons(buttonList: unknown) {
        const result = original(buttonList)
        rebindToolbarLabelTargets(core)
        core.effectNode = null
        return result
      }
    }

    if (core.commandHandler && !core.__uaBoldRemovalWrapped) {
      core.__uaBoldRemovalWrapped = true
      const original = core.commandHandler.bind(core)
      core.commandHandler = function boldRemovalCommandHandler(target: unknown, command: string) {
        const result = original(target, command)
        if (!isBoldCommand(command)) return result
        const extracted = extractSelectedBlocksFromBoldWrappers(core)
        if (!extracted.changed) return result
        core.effectNode = null
        core.history.push(true)
        if (typeof core.focus === 'function') core.focus()
        return result
      }
    }

    rebindToolbarLabelTargets(core)
  }, [])

  const handleChange = (html: string) => {
    if (html === lastHtml.current) return
    lastHtml.current = html
    onChange(html)
  }

  // External change (e.g. version restore): reflect it, but never while the user is typing.
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || value === lastHtml.current || editor.core?.hasFocus) return
    lastHtml.current = value
    editor.setContents(value)
  }, [value])

  return (
    <div className="uaf-body-editor" style={{ width: '100%', minWidth: 0 }}>
      <SunEditor
        dir={rtl ? 'rtl' : 'ltr'}
        height={height}
        name={name}
        readOnly={readOnly}
        defaultValue={initialValue.current}
        setDefaultStyle={`font-family: Roboto; font-size: 16px; text-align: ${rtl ? 'right' : 'left'}; direction: ${rtl ? 'rtl' : 'ltr'};`}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(_e: unknown, core: unknown) => syncToolbarLabels(core)}
        onKeyUp={(_e: unknown, core: unknown) => syncToolbarLabels(core)}
        onLoad={handleLoad}
        getSunEditorInstance={getSunEditorInstance}
        setOptions={{
          ...articleEditorOptions,
          plugins,
          rtl,
          resizingBar: true,
          dialogDisplay: 'modal',
          stickyToolbar: 0,
          popupDisplay: 'local',
        }}
      />
    </div>
  )
}

export default ArticleBodyEditor
