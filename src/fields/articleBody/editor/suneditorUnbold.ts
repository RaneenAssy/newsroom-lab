// @ts-nocheck — direct port of the UA Finance backoffice SunEditor patch (apps/backend/src/views/common/editor); it drives SunEditor internals, which are untyped.
const BOLD_TAG_RE = /^(STRONG|B)$/i;

export const isBoldCommand = (command) => typeof command === 'string' && /^(bold|removeFormat)$/i.test(command);

export const findNearestAncestorBoldWrapper = (core, formatEl) => {
  if (!core?.util || !formatEl) return null;

  const util = core.util;
  let node = formatEl.parentNode;

  while (node && !util.isWysiwygDiv(node)) {
    if (BOLD_TAG_RE.test(node.nodeName)) return node;
    node = node.parentNode;
  }

  return null;
};

/** @deprecated Use findNearestAncestorBoldWrapper / extractSelectedBlocksFromBoldWrappers */
export const findAncestorBoldWrappers = (core, formatEl) => {
  const wrapper = findNearestAncestorBoldWrapper(core, formatEl);
  return wrapper ? [wrapper] : [];
};

export const extractDirectChildFromWrapper = (child, wrapper) => {
  const parent = wrapper?.parentNode;
  if (!parent || !child || child.parentNode !== wrapper) return false;

  const doc = wrapper.ownerDocument || document;
  const wrapperTag = wrapper.nodeName;

  if (child.previousSibling) {
    const beforeWrapper = doc.createElement(wrapperTag);
    while (wrapper.firstChild && wrapper.firstChild !== child) {
      beforeWrapper.appendChild(wrapper.firstChild);
    }
    parent.insertBefore(beforeWrapper, wrapper);
  }

  parent.insertBefore(child, wrapper);

  if (!wrapper.firstChild) {
    parent.removeChild(wrapper);
  }

  return true;
};

export const extractFormatElementFromBoldWrapper = (formatEl, wrapper) => {
  if (!formatEl || !wrapper || !wrapper.contains(formatEl)) return false;

  if (formatEl.parentNode === wrapper) {
    return extractDirectChildFromWrapper(formatEl, wrapper);
  }

  // Nested markup: promote the format block until it is a direct child, then extract.
  while (formatEl.parentNode && formatEl.parentNode !== wrapper) {
    const nestedParent = formatEl.parentNode;
    if (!extractDirectChildFromWrapper(formatEl, nestedParent)) return false;
  }

  return extractDirectChildFromWrapper(formatEl, wrapper);
};

export const getSelectedFormatElements = (core) => {
  if (!core) return [];

  if (typeof core.getSelectedElements === 'function') {
    const selected = core.getSelectedElements(null);
    if (Array.isArray(selected) && selected.length > 0) return selected;
  }

  let range;
  try {
    range = core.getRange();
  } catch {
    return [];
  }
  if (!range || !core.util) return [];

  const formatEl =
    core.util.getFormatElement(range.startContainer, null) || core.util.getFormatElement(range.commonAncestorContainer, null);
  return formatEl ? [formatEl] : [];
};

export const extractSelectedBlocksFromBoldWrappers = (core) => {
  if (!core?.util) return { changed: false, selectedCount: 0, extractedCount: 0, wrapperChildCount: 0 };

  const lineNodes = getSelectedFormatElements(core);
  if (lineNodes.length === 0) {
    return { changed: false, selectedCount: 0, extractedCount: 0, wrapperChildCount: 0 };
  }

  let extractedCount = 0;
  let wrapperChildCount = 0;

  for (let i = lineNodes.length - 1; i >= 0; i -= 1) {
    const formatEl = lineNodes[i];
    const wrapper = findNearestAncestorBoldWrapper(core, formatEl);
    if (!wrapper) continue;

    wrapperChildCount = Math.max(wrapperChildCount, wrapper.childNodes?.length || 0);
    if (extractFormatElementFromBoldWrapper(formatEl, wrapper)) {
      extractedCount += 1;
    }
  }

  if (extractedCount === 0) {
    return { changed: false, selectedCount: lineNodes.length, extractedCount: 0, wrapperChildCount };
  }

  const focusEl = lineNodes[0];
  if (focusEl && typeof core.setRange === 'function') {
    try {
      const textNode = core.util.getChildElement(focusEl, (current) => current.nodeType === 3, false) || focusEl;
      if (textNode.nodeType === 3) {
        core.setRange(textNode, 0, textNode, Math.min(1, textNode.textContent.length));
      } else {
        core.setRange(focusEl, 0, focusEl, 0);
      }
    } catch {
      // Selection restore is best-effort; extract already succeeded.
    }
  }

  return {
    changed: true,
    selectedCount: lineNodes.length,
    extractedCount,
    wrapperChildCount
  };
};

export const unwrapAncestorBoldWrappers = (core) => extractSelectedBlocksFromBoldWrappers(core).changed;

export const finalizeBoldRemoval = (core, command) => {
  if (!isBoldCommand(command)) return false;
  return extractSelectedBlocksFromBoldWrappers(core).changed;
};
