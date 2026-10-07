// @ts-nocheck — direct port of the UA Finance backoffice SunEditor patch (apps/backend/src/views/common/editor); it drives SunEditor internals, which are untyped.
const BLOCK_IN_LI_RE = /^(P|DIV|H[1-6])$/i;
const ZERO_WIDTH_ONLY_RE = /^[\u200B\uFEFF\s]*$/;

export const hasBlockChildStructure = (listItem) =>
  Boolean(listItem?.children?.length >= 1 && BLOCK_IN_LI_RE.test(listItem.firstElementChild?.nodeName || ''));

export const isCaretAtListItemStart = (range, listItem) => {
  if (!range?.collapsed || range.startOffset !== 0 || !listItem) return false;

  let node = range.startContainer;
  while (node && node !== listItem) {
    if (node.previousSibling) {
      const prev = node.previousSibling;
      const ignorable =
        (prev.nodeType === 3 && ZERO_WIDTH_ONLY_RE.test(prev.textContent || '')) || (prev.nodeName === 'BR' && !prev.previousSibling);
      if (!ignorable) return false;
    }
    node = node.parentNode;
  }

  return node === listItem;
};

export const resolveListBackspaceWipeTarget = ({ event, core }) => {
  if (!core) return null;

  const isBackspace = event?.key === 'Backspace' || event?.keyCode === 8;
  if (!isBackspace) return null;

  const util = core.util;
  const range = core.getRange();
  if (!range?.collapsed || range.startOffset !== 0) return null;

  const formatEl = util.getFormatElement(range.startContainer, null);
  const rangeEl = util.getRangeFormatElement(formatEl, null);
  if (!rangeEl || !util.isList(rangeEl)) return null;

  const listItem = util.getParentElement(formatEl, 'LI');
  if (!listItem || listItem.parentNode !== rangeEl) return null;
  if (!isCaretAtListItemStart(range, listItem)) return null;
  if (!hasBlockChildStructure(listItem)) return null;
  if (util.isListCell(rangeEl.parentNode)) return null;

  return { list: rangeEl, listItem, range };
};

/** @deprecated Use resolveListBackspaceWipeTarget */
export const resolveRtlListBackspaceTarget = ({ event, core }) => resolveListBackspaceWipeTarget({ event, core });

const moveListItemContentToParagraph = (core, listItem) => {
  if (listItem.querySelector?.('ul, ol')) return null;

  const defaultTag = core.options?.defaultTag || 'P';
  const paragraph = core.util.createElement(defaultTag);
  const onlyBlock =
    listItem.children.length === 1 && BLOCK_IN_LI_RE.test(listItem.firstElementChild?.nodeName || '') ? listItem.firstElementChild : null;
  const source = onlyBlock || listItem;

  while (source.firstChild) {
    paragraph.appendChild(source.firstChild);
  }

  if (!paragraph.firstChild) {
    paragraph.innerHTML = '<br>';
  }

  return paragraph;
};

export const fallbackUnlistListItem = (core, list, listItem) => {
  const parent = list?.parentNode;
  if (!parent || !listItem || listItem.parentNode !== list) return false;

  const paragraph = moveListItemContentToParagraph(core, listItem);
  if (!paragraph) return false;

  const previousSibling = listItem.previousElementSibling;
  const nextSibling = listItem.nextElementSibling;

  if (!previousSibling && !nextSibling) {
    parent.insertBefore(paragraph, list);
    listItem.remove();
    list.remove();
  } else if (!previousSibling) {
    parent.insertBefore(paragraph, list);
    listItem.remove();
  } else if (!nextSibling) {
    parent.insertBefore(paragraph, list.nextSibling);
    listItem.remove();
  } else {
    const nextList = list.cloneNode(false);
    let sibling = nextSibling;
    while (sibling) {
      const current = sibling;
      sibling = sibling.nextElementSibling;
      nextList.appendChild(current);
    }
    parent.insertBefore(paragraph, list.nextSibling);
    parent.insertBefore(nextList, paragraph.nextSibling);
    listItem.remove();
  }

  if (list.isConnected === false || !list.children?.length) {
    if (list.parentNode) list.remove();
  }

  const focusNode = paragraph.firstChild?.nodeType === 3 ? paragraph.firstChild : paragraph;
  core.setRange(focusNode, 0, focusNode, 0);
  return true;
};

export const fallbackUnlistFirstListItem = fallbackUnlistListItem;

export const unlistListItemPreservingContent = (core, list, listItem) => {
  if (!core || !list?.parentNode || !listItem) return false;

  try {
    const edge = core.detachRangeFormatElement(list, [listItem], null, false, true);
    if (edge?.sc) {
      core.setRange(edge.sc, 0, edge.sc, 0);
      return true;
    }
  } catch {
    // Fall through to the narrow DOM fallback.
  }

  return fallbackUnlistListItem(core, list, listItem);
};

/** @deprecated Use unlistListItemPreservingContent */
export const unlistRtlFirstListItem = unlistListItemPreservingContent;
