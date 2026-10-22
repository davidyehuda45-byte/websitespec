import { describe, it, expect } from 'vitest';
import {
  safeString,
  safeTrim,
  safeClassList,
  safeGetComputedStyle,
  safeGetPropertyValue,
  safeQuerySelectorAll,
  safeQuerySelector,
} from '../src/core/utils/dom-safe';
import { extractLayoutNode } from '../src/core/extract/layout';

describe('Universal Defensive DOM Primitives (dom-safe)', () => {
  it('safeString correctly handles all data types without throwing', () => {
    expect(safeString('hello world')).toBe('hello world');
    expect(safeString(12345)).toBe('12345');
    expect(safeString(true)).toBe('true');
    expect(safeString(null)).toBe('');
    expect(safeString(undefined)).toBe('');
    expect(safeString(Symbol('sym'))).toBe('');
    expect(safeString({})).toBe('');
  });

  it('safeTrim handles SVGAnimatedString properly (resolving bagimuextra SVG crash)', () => {
    const svgAnimatedClass = {
      baseVal: '  w-5 h-5 text-blue-500  ',
      animVal: 'w-5 h-5',
    };
    expect(safeTrim(svgAnimatedClass)).toBe('w-5 h-5 text-blue-500');
  });

  it('safeClassList extracts class arrays from both HTML and SVG-like objects', () => {
    // Mock HTML element with classList
    const mockHtmlEl = {
      classList: {
        contains: () => true,
        [Symbol.iterator]: function* () {
          yield 'flex';
          yield 'items-center';
          yield 'justify-between';
        },
      },
    };
    expect(safeClassList(mockHtmlEl as any)).toEqual(['flex', 'items-center', 'justify-between']);

    // Mock SVG element where className is an SVGAnimatedString
    const mockSvgEl = {
      tagName: 'SVG',
      className: { baseVal: 'lucide lucide-search w-4 h-4' },
      getAttribute: (attr: string) => (attr === 'class' ? 'lucide lucide-search w-4 h-4' : null),
    };
    expect(safeClassList(mockSvgEl as any)).toEqual(['lucide', 'lucide-search', 'w-4', 'h-4']);

    // Null / undefined safe
    expect(safeClassList(null)).toEqual([]);
    expect(safeClassList(undefined)).toEqual([]);
  });

  it('safeGetComputedStyle and safeGetPropertyValue never throw on null or detached nodes', () => {
    expect(safeGetComputedStyle(null)).toBeNull();
    expect(safeGetPropertyValue(null, 'display')).toBe('');
  });

  it('safeQuerySelectorAll handles malformed/invalid CSS selectors gracefully without DOMException', () => {
    const mockRoot = {
      querySelectorAll: (sel: string) => {
        if (sel.includes('invalid')) {
          throw new Error("SyntaxError: 'div:invalid-pseudo(' is not a valid selector");
        }
        return [];
      },
      querySelector: (sel: string) => {
        if (sel.includes('invalid')) {
          throw new Error("SyntaxError: 'div:invalid-pseudo(' is not a valid selector");
        }
        return null;
      },
    };

    expect(safeQuerySelectorAll(mockRoot as any, 'span')).toEqual([]);
    expect(safeQuerySelectorAll(mockRoot as any, 'div:invalid-pseudo(')).toEqual([]);
    expect(safeQuerySelector(mockRoot as any, 'div:invalid-pseudo(')).toBeNull();
  });

  it('extractLayoutNode extracts layout from element with SVGAnimatedString without crashing', () => {
    const mockChild: any = {
      tagName: 'SPAN',
      childNodes: [{ nodeType: 3, textContent: 'Action Button' }],
      children: [],
      className: { baseVal: 'btn btn-primary' },
      getAttribute: () => null,
      getBoundingClientRect: () => ({ width: 100, height: 40 }),
    };

    const mockContainer: any = {
      id: 'test-container',
      tagName: 'DIV',
      childNodes: [],
      children: [mockChild],
      className: 'container mx-auto',
      getAttribute: (attr: string) => (attr === 'id' ? 'test-container' : null),
      getBoundingClientRect: () => ({ width: 1200, height: 600 }),
    };

    const layout = extractLayoutNode(mockContainer as any);
    expect(layout).not.toBeNull();
    expect(layout?.tag).toBe('div');
    expect(layout?.id).toBe('test-container');
    expect(layout?.children.length).toBe(1);
    expect(layout?.children[0]?.tag).toBe('span');
    expect(layout?.children[0]?.text).toBe('Action Button');
  });

  it('extractLayoutNode handles throw inside element gracefully via error boundary', () => {
    const explodingEl: any = {
      get tagName() {
        throw new Error('Unexpected DOM tree corruption');
      },
    };

    // Should not throw, should return fallback safe node
    const fallback = extractLayoutNode(explodingEl);
    expect(fallback).not.toBeNull();
    expect(fallback?.tag).toBe('div');
    expect(fallback?.children).toEqual([]);
  });
});

