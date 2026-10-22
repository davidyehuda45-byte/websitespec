import type { LayoutNode } from '../../types/blueprint';
import { stripDefaultStyles } from '../normalize/defaults';
import { deduplicateSiblings } from '../normalize/dedupe';
import { extractAssetsFromElement } from './assets';
import { cssColorToHex } from './color';

const ESSENTIAL_STYLE_PROPERTIES = [
  'display',
  'flex-direction',
  'align-items',
  'justify-content',
  'gap',
  'flex-wrap',
  'grid-template-columns',
  'width',
  'max-width',
  'min-width',
  'height',
  'padding',
  'margin',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'z-index',
  'background-color',
  'color',
  'border-radius',
  'border',
  'box-shadow',
];

/**
 * Strips random hash classes like CSS modules (_header_1a2b3_4) or Webflow random utilities,
 * keeping only meaningful semantic names.
 */
function cleanSemanticClass(rawClass: string): string | undefined {
  if (!rawClass) return undefined;
  const classes = rawClass
    .trim()
    .split(/\s+/)
    .filter((c) => {
      // Exclude generated hashes, e.g. _3a9b1c, css-12345, svelte-1a2b3c
      if (/^(_|css-|svelte-|jsx-|w-node-)/i.test(c)) return false;
      if (/[0-9a-f]{6,}/i.test(c)) return false;
      return true;
    });

  return classes.length > 0 ? classes.slice(0, 3).join(' ') : undefined;
}

/**
 * Checks if an element is visible in the viewport or layout.
 */
function isElementVisible(el: Element, style: CSSStyleDeclaration): boolean {
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (style.opacity === '0') return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;

  const rect = el.getBoundingClientRect();
  // Allow 0-height/width only if it contains visible children
  if (rect.width === 0 && rect.height === 0 && el.children.length === 0) {
    return false;
  }

  return true;
}

/**
 * Recursively extracts a LayoutNode tree from a DOM element.
 */
export function extractLayoutNode(el: Element, depth: number = 0, maxDepth: number = 8): LayoutNode | null {
  if (depth > maxDepth) return null;

  const tagName = el.tagName.toLowerCase();

  // Skip script, style, noscript, svg internal nodes, iframe, meta
  if (['script', 'style', 'noscript', 'meta', 'link', 'template'].includes(tagName)) {
    return null;
  }

  const computed = window.getComputedStyle(el);
  if (!isElementVisible(el, computed)) {
    return null;
  }

  // Extract non-default styles
  const rawStyles: Record<string, string> = {};
  for (const prop of ESSENTIAL_STYLE_PROPERTIES) {
    const val = computed.getPropertyValue(prop);
    if (val) {
      if (prop === 'background-color' || prop === 'color') {
        const hex = cssColorToHex(val);
        if (hex) rawStyles[prop] = hex;
      } else {
        rawStyles[prop] = val;
      }
    }
  }

  const cleanedStyles = stripDefaultStyles(rawStyles, depth === 0);

  // Extract direct text content (excluding nested elements)
  let directText = '';
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i];
    if (node && node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim() || '';
      if (text) {
        directText = directText ? `${directText} ${text}` : text;
      }
    }
  }

  // Extract Assets (images, svgs, background images)
  const asset = extractAssetsFromElement(el);

  // Extract Children
  const rawChildren: LayoutNode[] = [];
  if (tagName !== 'svg') {
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i];
      if (!child) continue;
      const childNode = extractLayoutNode(child, depth + 1, maxDepth);
      if (childNode) {
        rawChildren.push(childNode);
      }
    }
  }

  // Deduplicate repeating card/grid structures
  const children = deduplicateSiblings(rawChildren);

  const node: LayoutNode = {
    tag: tagName,
    styles: cleanedStyles,
    children,
  };

  if (el.id) node.id = el.id;
  const semanticClass = cleanSemanticClass(el.className);
  if (semanticClass) node.semanticClass = semanticClass;

  const role = el.getAttribute('role') || undefined;
  if (role) node.role = role;

  if (directText) node.text = directText;
  if (asset) node.assets = asset;

  return node;
}

/**
 * Extracts the primary landmarks or page root.
 * If targetElement is provided (Component Mode), extracts only that element.
 */
export function extractLayoutTree(targetElement?: Element | null): LayoutNode {
  if (targetElement && targetElement !== document.body) {
    const node = extractLayoutNode(targetElement, 0, 8);
    return (
      node || {
        tag: targetElement.tagName.toLowerCase(),
        styles: {},
        children: [],
      }
    );
  }

  // Full Page extraction: start from body
  const bodyNode = extractLayoutNode(document.body, 0, 8);
  return (
    bodyNode || {
      tag: 'body',
      styles: {},
      children: [],
    }
  );
}

/**
 * Collects internal navigation links (a[href]) within the same domain.
 */
export function extractInternalLinks(): string[] {
  const currentOrigin = window.location.origin;
  const links = new Set<string>();

  document.querySelectorAll('a[href]').forEach((el) => {
    try {
      const url = new URL((el as HTMLAnchorElement).href, currentOrigin);
      if (url.origin === currentOrigin && url.pathname) {
        links.add(url.pathname);
      }
    } catch {
      // Ignore invalid URLs
    }
  });

  return Array.from(links).slice(0, 30);
}
