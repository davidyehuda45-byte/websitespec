/**
 * Universal Defensive DOM Primitives
 * 
 * Protects extraction logic from any DOM quirks, SVGAnimatedString variations,
 * cross-origin security restrictions, or invalid query selector exceptions.
 */

export function safeString(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);

  // SVGAnimatedString support (.baseVal / .animVal)
  if (typeof val === 'object') {
    if (typeof val.baseVal === 'string') return val.baseVal;
    if (typeof val.animVal === 'string') return val.animVal;
    if (typeof val.toString === 'function' && val.toString !== Object.prototype.toString) {
      try {
        return val.toString();
      } catch {
        return '';
      }
    }
  }

  return '';
}

export function safeTrim(val: any): string {
  return safeString(val).trim();
}

export function safeGetComputedStyle(el: any): CSSStyleDeclaration | null {
  if (!el || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return null;
  }
  // Elements must be connected or valid node to avoid Firefox/Chrome internal throws
  try {
    return window.getComputedStyle(el);
  } catch {
    return null;
  }
}

export function safeGetPropertyValue(style: CSSStyleDeclaration | null | undefined, prop: string): string {
  if (!style || typeof style.getPropertyValue !== 'function') {
    return '';
  }
  try {
    return style.getPropertyValue(prop) || '';
  } catch {
    return '';
  }
}

export function safeClassList(el: any): string[] {
  if (!el) return [];

  // Try standard classList
  try {
    if (el.classList && typeof el.classList.contains === 'function') {
      return Array.from(el.classList).map((c) => safeTrim(c)).filter(Boolean);
    }
  } catch {
    // Fall back to attribute or className
  }

  // Fallback to class attribute or className property (SVG / XML)
  const raw = (typeof el.getAttribute === 'function' ? el.getAttribute('class') : null) || el.className;
  const str = safeTrim(raw);
  if (!str) return [];

  return str.split(/\s+/).filter(Boolean);
}

export function safeQuerySelector(root: ParentNode | null | undefined, selector: string): Element | null {
  if (!root || typeof root.querySelector !== 'function') return null;
  try {
    return root.querySelector(selector);
  } catch {
    return null;
  }
}

export function safeQuerySelectorAll(root: ParentNode | null | undefined, selector: string): Element[] {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch {
    return [];
  }
}

export function safeTextContent(node: Node | null | undefined): string {
  if (!node) return '';
  try {
    return safeString(node.textContent);
  } catch {
    return '';
  }
}

export function safeGetAttribute(el: Element | null | undefined, attr: string): string | null {
  if (!el || typeof el.getAttribute !== 'function') return null;
  try {
    return el.getAttribute(attr);
  } catch {
    return null;
  }
}

