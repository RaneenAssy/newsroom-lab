// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import {
  findNearestAncestorBoldWrapper,
  extractDirectChildFromWrapper,
  extractSelectedBlocksFromBoldWrappers,
  finalizeBoldRemoval
} from '@/fields/articleBody/editor/suneditorUnbold';

const textNode = (text) => ({
  nodeType: 3,
  nodeName: '#text',
  textContent: text,
  parentNode: null,
  firstChild: null,
  childNodes: [],
  previousSibling: null,
  nextSibling: null
});

const element = (nodeName) => {
  const node = {
    nodeType: 1,
    nodeName,
    children: [],
    childNodes: [],
    parentNode: null,
    firstChild: null,
    previousSibling: null,
    nextSibling: null,
    textContent: '',
    ownerDocument: {
      createElement(tag) {
        return element(tag);
      }
    },
    contains(child) {
      let cur = child;
      while (cur) {
        if (cur === node) return true;
        cur = cur.parentNode;
      }
      return false;
    },
    appendChild(child) {
      if (child.parentNode) child.parentNode.removeChild(child);
      child.parentNode = node;
      child.previousSibling = node.childNodes[node.childNodes.length - 1] || null;
      child.nextSibling = null;
      if (child.previousSibling) child.previousSibling.nextSibling = child;
      node.childNodes.push(child);
      if (child.nodeType === 1) node.children.push(child);
      node.firstChild = node.childNodes[0];
      node.textContent = node.childNodes.map((item) => item.textContent || '').join('');
      return child;
    },
    insertBefore(child, ref) {
      if (child.parentNode) child.parentNode.removeChild(child);
      const idx = ref ? node.childNodes.indexOf(ref) : node.childNodes.length;
      node.childNodes.splice(idx, 0, child);
      child.parentNode = node;
      child.previousSibling = node.childNodes[idx - 1] || null;
      child.nextSibling = node.childNodes[idx + 1] || null;
      if (child.previousSibling) child.previousSibling.nextSibling = child;
      if (child.nextSibling) child.nextSibling.previousSibling = child;
      node.children = node.childNodes.filter((item) => item.nodeType === 1);
      node.firstChild = node.childNodes[0] || null;
      node.textContent = node.childNodes.map((item) => item.textContent || '').join('');
      return child;
    },
    removeChild(child) {
      const idx = node.childNodes.indexOf(child);
      if (idx === -1) return child;
      const prev = child.previousSibling;
      const next = child.nextSibling;
      if (prev) prev.nextSibling = next;
      if (next) next.previousSibling = prev;
      node.childNodes.splice(idx, 1);
      node.children = node.childNodes.filter((item) => item.nodeType === 1);
      node.firstChild = node.childNodes[0] || null;
      child.parentNode = null;
      child.previousSibling = null;
      child.nextSibling = null;
      node.textContent = node.childNodes.map((item) => item.textContent || '').join('');
      return child;
    }
  };
  return node;
};

describe('suneditorUnbold scoped extract', () => {
  it('finds nearest STRONG wrapper around a paragraph', () => {
    const wysiwyg = element('DIV');
    const strong = element('STRONG');
    const p = element('P');
    strong.appendChild(p);
    wysiwyg.appendChild(strong);

    const core = { util: { isWysiwygDiv: (node) => node === wysiwyg } };
    expect(findNearestAncestorBoldWrapper(core, p)).toBe(strong);
  });

  it('extracts only the selected paragraph and keeps sibling paragraphs bold', () => {
    const wysiwyg = element('DIV');
    const strong = element('STRONG');
    const p1 = element('P');
    const p2 = element('P');
    const p3 = element('P');
    p1.appendChild(textNode('one'));
    p2.appendChild(textNode('two'));
    p3.appendChild(textNode('three'));
    strong.appendChild(p1);
    strong.appendChild(p2);
    strong.appendChild(p3);
    wysiwyg.appendChild(strong);

    extractDirectChildFromWrapper(p2, strong);

    expect(wysiwyg.childNodes.map((n) => n.nodeName)).toEqual(['STRONG', 'P', 'STRONG']);
    expect(wysiwyg.childNodes[0].childNodes).toEqual([p1]);
    expect(wysiwyg.childNodes[1]).toBe(p2);
    expect(wysiwyg.childNodes[2].childNodes).toEqual([p3]);
  });

  it('extractSelectedBlocksFromBoldWrappers only touches selected lines', () => {
    const wysiwyg = element('DIV');
    const strong = element('STRONG');
    const p1 = element('P');
    const p2 = element('P');
    p1.appendChild(textNode('one'));
    p2.appendChild(textNode('two'));
    strong.appendChild(p1);
    strong.appendChild(p2);
    wysiwyg.appendChild(strong);

    const setRange = vi.fn();
    const core = {
      util: {
        isWysiwygDiv: (node) => node === wysiwyg,
        getFormatElement: () => p2,
        getChildElement: (root, pred) => {
          for (const child of root.childNodes || []) {
            if (pred(child)) return child;
          }
          return null;
        }
      },
      getSelectedElements: () => [p2],
      getRange: () => ({ startContainer: p2, commonAncestorContainer: p2 }),
      setRange
    };

    const result = extractSelectedBlocksFromBoldWrappers(core);
    expect(result.changed).toBe(true);
    expect(result.extractedCount).toBe(1);
    expect(result.wrapperChildCount).toBe(2);
    expect(wysiwyg.childNodes.map((n) => n.nodeName)).toEqual(['STRONG', 'P']);
    expect(wysiwyg.childNodes[0].childNodes).toEqual([p1]);
    expect(wysiwyg.childNodes[1]).toBe(p2);
  });

  it('finalizeBoldRemoval ignores non-bold commands', () => {
    expect(finalizeBoldRemoval({}, 'italic')).toBe(false);
  });
});
