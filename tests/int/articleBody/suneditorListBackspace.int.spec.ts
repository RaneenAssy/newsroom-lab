// @ts-nocheck — passes the legacy, ignored `isRTL` argument (the legacy .d.ts permitted it).
import { describe, it, expect, vi } from 'vitest';
import {
  hasBlockChildStructure,
  isCaretAtListItemStart,
  resolveRtlListBackspaceTarget,
  fallbackUnlistFirstListItem,
  unlistRtlFirstListItem
} from '@/fields/articleBody/editor/suneditorListBackspace';

interface MockNode {
  nodeType: number;
  nodeName: string;
  textContent: string;
  previousSibling: MockNode | null;
  previousElementSibling: MockNode | null;
  nextElementSibling: MockNode | null;
  parentNode: MockNode | null;
  firstChild: MockNode | null;
  firstElementChild: MockNode | null;
  childNodes: MockNode[];
  children: MockNode[];
  querySelector: () => MockNode | null;
  appendChild: (child: MockNode) => MockNode;
  remove: () => void;
  insertBefore: (newNode: MockNode, referenceNode: MockNode | null) => MockNode;
}

const textNode = (text: string): MockNode => ({
  nodeType: 3,
  nodeName: '#text',
  textContent: text,
  previousSibling: null,
  previousElementSibling: null,
  nextElementSibling: null,
  parentNode: null,
  firstChild: null,
  firstElementChild: null,
  childNodes: [],
  children: [],
  querySelector: () => null,
  appendChild: (child) => child,
  remove: () => undefined,
  insertBefore: (newNode) => newNode
});

const syncElementSiblings = (parent: MockNode): void => {
  parent.children.forEach((child, index) => {
    child.previousElementSibling = parent.children[index - 1] || null;
    child.nextElementSibling = parent.children[index + 1] || null;
  });
};

const element = (nodeName: string): MockNode => {
  const node: MockNode = {
    nodeType: 1,
    nodeName,
    children: [],
    childNodes: [],
    previousSibling: null,
    previousElementSibling: null,
    nextElementSibling: null,
    parentNode: null,
    firstElementChild: null,
    firstChild: null,
    textContent: '',
    querySelector: () => null,
    appendChild(child: MockNode) {
      if (child.parentNode && child.parentNode !== node) {
        const oldParent = child.parentNode;
        oldParent.childNodes = oldParent.childNodes.filter((item) => item !== child);
        oldParent.children = oldParent.children.filter((item) => item !== child);
        oldParent.firstChild = oldParent.childNodes[0] || null;
        oldParent.firstElementChild = oldParent.children[0] || null;
        syncElementSiblings(oldParent);
        oldParent.textContent = oldParent.childNodes
          .filter((item) => item.nodeType === 3)
          .map((item) => item.textContent || '')
          .join('');
      }
      child.parentNode = node;
      child.previousSibling = node.childNodes[node.childNodes.length - 1] || null;
      node.childNodes.push(child);
      if (child.nodeType === 1) {
        node.children.push(child);
        node.firstElementChild = node.children[0];
        syncElementSiblings(node);
      }
      node.firstChild = node.childNodes[0];
      node.textContent = node.childNodes
        .filter((item) => item.nodeType === 3)
        .map((item) => item.textContent || '')
        .join('');
      return child;
    },
    remove() {
      const parent = node.parentNode;
      if (!parent) return;
      parent.childNodes = parent.childNodes.filter((child) => child !== node);
      parent.children = parent.children.filter((child) => child !== node);
      parent.firstChild = parent.childNodes[0] || null;
      parent.firstElementChild = parent.children[0] || null;
      syncElementSiblings(parent);
      node.parentNode = null;
      node.previousElementSibling = null;
      node.nextElementSibling = null;
    },
    insertBefore(newNode: MockNode, referenceNode: MockNode | null) {
      newNode.parentNode = node;
      const index = referenceNode ? node.childNodes.indexOf(referenceNode) : -1;
      node.childNodes.splice(index < 0 ? node.childNodes.length : index, 0, newNode);
      if (newNode.nodeType === 1) {
        const refIndex = referenceNode ? node.children.indexOf(referenceNode) : -1;
        node.children.splice(refIndex < 0 ? node.children.length : refIndex, 0, newNode);
        syncElementSiblings(node);
      }
      node.firstChild = node.childNodes[0] || null;
      node.firstElementChild = node.children[0] || null;
      return newNode;
    }
  };
  return node;
};

describe('suneditorListBackspace helpers', () => {
  it('detects block child structure inside LI', () => {
    const p = element('P');
    const li = element('LI');
    li.appendChild(p);
    expect(hasBlockChildStructure(li)).toBe(true);
  });

  it('detects caret at list item start', () => {
    const text = textNode('hello');
    const span = element('SPAN');
    span.appendChild(text);
    const li = element('LI');
    li.appendChild(span);
    expect(isCaretAtListItemStart({ collapsed: true, startOffset: 0, startContainer: text }, li)).toBe(true);
    expect(isCaretAtListItemStart({ collapsed: true, startOffset: 1, startContainer: text }, li)).toBe(false);
  });

  it('resolves the block-child list wipe case for LTR and RTL', () => {
    const text = textNode('item');
    const p = element('P');
    p.appendChild(text);
    const listItem = element('LI');
    listItem.appendChild(p);
    const list = element('UL');
    list.appendChild(listItem);
    list.parentNode = element('DIV');

    const core = {
      getRange: () => ({ collapsed: true, startOffset: 0, startContainer: text }),
      util: {
        getFormatElement: () => p,
        getRangeFormatElement: () => list,
        isList: (node: MockNode | null | undefined) => node?.nodeName === 'UL',
        getParentElement: () => listItem,
        isListCell: (node: MockNode | null | undefined) => node?.nodeName === 'LI'
      }
    };

    expect(resolveRtlListBackspaceTarget({ isRTL: false, event: { key: 'Backspace', keyCode: 8 }, core })).not.toBeNull();

    const target = resolveRtlListBackspaceTarget({
      isRTL: true,
      event: { key: 'Backspace', keyCode: 8 },
      core
    });
    expect(target?.listItem).toBe(listItem);

    listItem.previousElementSibling = element('LI');
    expect(resolveRtlListBackspaceTarget({ isRTL: false, event: { key: 'Backspace', keyCode: 8 }, core })).not.toBeNull();
  });

  it('fallback refuses nested lists and preserves siblings when unlisting', () => {
    const nestedUl = element('UL');
    const liWithNested = element('LI');
    liWithNested.querySelector = () => nestedUl;
    const list = element('UL');
    list.appendChild(liWithNested);
    list.parentNode = element('DIV');

    const core = {
      options: { defaultTag: 'P' },
      util: { createElement: (tag: string) => element(tag) },
      setRange: vi.fn()
    };
    expect(fallbackUnlistFirstListItem(core, list, liWithNested)).toBe(false);

    const text = textNode('first');
    const p = element('P');
    p.appendChild(text);
    const first = element('LI');
    first.appendChild(p);
    const second = element('LI');
    const list2 = element('UL');
    list2.appendChild(first);
    list2.appendChild(second);
    const parent = element('DIV');
    parent.appendChild(list2);

    expect(fallbackUnlistFirstListItem(core, list2, first)).toBe(true);
    expect(parent.children[0].nodeName).toBe('P');
    expect(parent.children[1]).toBe(list2);
    expect(list2.children).toHaveLength(1);
    expect(list2.children[0]).toBe(second);
  });

  it('prefers SunEditor detach and falls back on throw', () => {
    const listItem = element('LI');
    const list = element('UL');
    list.appendChild(listItem);
    list.parentNode = element('DIV');
    const paragraph = element('P');

    const core = {
      detachRangeFormatElement: vi.fn(() => ({ sc: paragraph })),
      setRange: vi.fn()
    };
    expect(unlistRtlFirstListItem(core, list, listItem)).toBe(true);
    expect(core.detachRangeFormatElement).toHaveBeenCalledWith(list, [listItem], null, false, true);

    const text = textNode('fallback');
    const p = element('P');
    p.appendChild(text);
    const fallbackItem = element('LI');
    fallbackItem.appendChild(p);
    const fallbackList = element('UL');
    fallbackList.appendChild(fallbackItem);
    const parent = element('DIV');
    parent.appendChild(fallbackList);

    const fallbackCore = {
      options: { defaultTag: 'P' },
      util: { createElement: (tag: string) => element(tag) },
      detachRangeFormatElement: vi.fn(() => {
        throw new Error('detach failed');
      }),
      setRange: vi.fn()
    };
    expect(unlistRtlFirstListItem(fallbackCore, fallbackList, fallbackItem)).toBe(true);
    expect(parent.children[0].nodeName).toBe('P');
  });
});
