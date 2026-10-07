/**
 * Prevents the production failure where opening an Arabic article in the admin editor logged an
 * uncaught `TypeError: functions2.getCharCount is not a function`: SunEditor's counter refresh runs
 * on a 0ms timer bound to the editor's public object, the form re-keys the editor for RTL and
 * destroys the English instance, and `destroy()` empties that object before the timer fires.
 */
import { describe, it, expect, vi } from 'vitest';
import { keepCharCounterInertAfterDestroy, type SunEditorInstanceLike } from '@/fields/articleBody/editor/suneditorCharCounter';

type FakeEditor = SunEditorInstanceLike & { core?: { alive: boolean } };

/** Mirrors SunEditor: `destroy()` removes every own key from the public object. */
const createFakeEditor = () => {
  const editor: FakeEditor = { core: { alive: true }, getCharCount: vi.fn(() => 3008) };
  editor.destroy = vi.fn(() => {
    Object.keys(editor).forEach((key) => delete editor[key as keyof FakeEditor]);
  });
  return editor;
};

/** The refresh SunEditor schedules inside `create()`, bound to the counter element and the public object. */
const pendingCounterRefresh = (counter: { textContent: string }, functions: SunEditorInstanceLike) => () => {
  if (counter.textContent && functions) counter.textContent = String(functions.getCharCount?.('char'));
};

describe('keepCharCounterInertAfterDestroy', () => {
  it('lets a counter refresh that was pending at destroy time run without throwing', () => {
    const editor = createFakeEditor();
    const originalDestroy = editor.destroy;
    const counter = { textContent: '12' };
    const refresh = pendingCounterRefresh(counter, editor);
    keepCharCounterInertAfterDestroy(editor);

    editor.destroy?.();

    expect(originalDestroy).toHaveBeenCalledTimes(1);
    expect(editor.core).toBeUndefined();
    expect(() => refresh()).not.toThrow();
  });

  it('leaves the live editor untouched until destroy is called', () => {
    const editor = createFakeEditor();
    const counter = { textContent: '12' };
    keepCharCounterInertAfterDestroy(editor);

    pendingCounterRefresh(counter, editor)();

    expect(counter.textContent).toBe('3008');
    expect(editor.core?.alive).toBe(true);
  });

  it('is a no-op for an instance without destroy', () => {
    const editor: SunEditorInstanceLike = { getCharCount: () => 1 };
    keepCharCounterInertAfterDestroy(editor);
    expect(editor.destroy).toBeUndefined();
  });
});
