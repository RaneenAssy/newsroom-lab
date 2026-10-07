export type SunEditorInstanceLike = {
  getCharCount?: (_charCounterType?: string) => number;
  destroy?: () => void;
};

/**
 * SunEditor refreshes its character counter on a 0ms timer whose callback is bound to the editor's
 * public `functions` object and calls `functions.getCharCount()`. `destroy()` deletes every key on
 * that object, so a refresh still pending when the editor is torn down fires against an emptied
 * object and throws `functions.getCharCount is not a function` as an uncaught page error.
 *
 * The first such refresh is scheduled inside `create()` itself, before React hands us the instance,
 * and the article form tears editors down right after creating them: React StrictMode's dev
 * double-mount, and the re-key to RTL when an Arabic article arrives after the form mounted in
 * English. Wrapping `destroy` leaves a callable `getCharCount` behind, so a pending refresh writes
 * to the detached counter and nothing else. The live counter is untouched and keeps counting the
 * same way for LTR and RTL content.
 */
export function keepCharCounterInertAfterDestroy(editor: SunEditorInstanceLike): void {
  const originalDestroy = editor.destroy;
  if (typeof originalDestroy !== 'function') return;

  editor.destroy = () => {
    originalDestroy.call(editor);
    editor.getCharCount = () => 0;
  };
}
