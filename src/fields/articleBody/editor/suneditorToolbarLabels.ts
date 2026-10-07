// @ts-nocheck — direct port of the UA Finance backoffice SunEditor patch (apps/backend/src/views/common/editor); it drives SunEditor internals, which are untyped.
const LABEL_PLUGINS = [
  { name: 'font', listKey: '_fontList', listSelector: 'ul li button' },
  { name: 'fontSize', listKey: '_sizeList', listSelector: 'li button' },
  { name: 'formatBlock', listKey: '_formatList', listSelector: 'li button' }
];

const getCommandButton = (tray, command) => tray.querySelector(`button[data-command="${command}"]`);

export const rebindToolbarLabelTargets = (core) => {
  const tray = core?.context?.element?._buttonTray;
  if (!tray || !core.context) return false;

  let rebound = false;

  for (const { name, listKey, listSelector } of LABEL_PLUGINS) {
    const ctx = core.context[name];
    if (!ctx) continue;

    const button = getCommandButton(tray, name);
    if (!button) continue;

    const nextTarget = button.querySelector('.txt');
    if (nextTarget && ctx.targetText !== nextTarget) {
      ctx.targetText = nextTarget;
      ctx.targetTooltip = button.parentNode?.querySelector('.se-tooltip-text') || ctx.targetTooltip;
      rebound = true;
    }

    const menu = core._menuTray?.[name];
    if (menu && listKey) {
      const nextList = menu.querySelectorAll(listSelector);
      if (nextList?.length) ctx[listKey] = nextList;
    }
  }

  return rebound;
};

const getSelectionStartNode = (core) => {
  try {
    const range = typeof core.getRange === 'function' ? core.getRange() : null;
    if (range?.startContainer) return range.startContainer;
  } catch {
    // fall through
  }

  try {
    return typeof core.getSelectionNode === 'function' ? core.getSelectionNode() : null;
  } catch {
    return null;
  }
};

export const syncToolbarLabelsFromSelectionStart = (core) => {
  if (!core?.plugins || !core.util || !core.context) return false;

  rebindToolbarLabelTargets(core);
  core.effectNode = null;

  const startNode = getSelectionStartNode(core);
  if (!startNode) return false;

  const formatEl = core.util.getFormatElement(startNode, null);
  if (formatEl && core.plugins.formatBlock?.active) {
    core.plugins.formatBlock.active.call(core, formatEl);
  }

  let walkNode = startNode;
  while (walkNode?.firstChild) walkNode = walkNode.firstChild;

  let fontApplied = false;
  let sizeApplied = false;

  for (let element = walkNode; element && !core.util.isWysiwygDiv(element); element = element.parentNode) {
    if (!element || element.nodeType !== 1 || core.util.isBreak(element)) continue;
    if (!fontApplied && core.plugins.font?.active?.call(core, element)) fontApplied = true;
    if (!sizeApplied && core.plugins.fontSize?.active?.call(core, element)) sizeApplied = true;
    if (fontApplied && sizeApplied) break;
  }

  if (!fontApplied) core.plugins.font?.active?.call(core, null);
  if (!sizeApplied) core.plugins.fontSize?.active?.call(core, null);

  return true;
};
