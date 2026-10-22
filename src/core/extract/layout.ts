import type { LayoutNode } from '../../types/blueprint';
import { stripDefaultStyles } from '../normalize/defaults';
import { deduplicateSiblings } from '../normalize/dedupe';
import { extractAssetsFromElement } from './assets';
import { cssColorToHex } from './color';
import {
  safeTrim,
  safeClassList,
  safeGetComputedStyle,
  safeGetPropertyValue,
  safeTextContent,
  safeGetAttribute,
  safeQuerySelectorAll,
} from '../utils/dom-safe';

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
 * keeping only meaningful semantic names. Safe for SVGAnimatedString and non-HTML nodes.
 */
function cleanSemanticClass(el: Element): string | undefined {
  const classes = safeClassList(el).filter((c) => {
    // Exclude generated hashes, e.g. _3a9b1c, css-12345, svelte-1a2b3c
    if (/^(_|css-|svelte-|jsx-|w-node-)/i.test(c)) return false;
    if (/[0-9a-f]{6,}/i.test(c)) return false;
    return true;
  });

  return classes.length > 0 ? classes.slice(0, 4).join(' ') : undefined;
}

/**
 * Checks if an element is visible in the viewport or layout.
 * Never drops elements with aria-hidden="true" (which icons commonly use).
 */
function isElementVisible(el: Element, style: CSSStyleDeclaration | null): boolean {
  if (!style) return true;
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (style.opacity === '0') return false;

  try {
    const rect = el.getBoundingClientRect();
    // Allow 0-height/width only if it contains children or has text/assets
    if (rect.width === 0 && rect.height === 0 && el.children.length === 0 && !safeTrim(safeTextContent(el))) {
      return false;
    }
  } catch {
    // Fall back to visible if getBoundingClientRect throws
  }

  return true;
}

/**
 * Recursively extracts a LayoutNode tree from a DOM element with full depth (up to 20).
 * Wrapped in an error boundary per node to guarantee zero extraction crashes on any website.
 */
export function extractLayoutNode(
  el: Element,
  depth: number = 0,
  maxDepth: number = 20,
  visited: WeakSet<Element> = new WeakSet()
): LayoutNode | null {
  if (!el || depth > maxDepth) return null;

  // Prevent infinite loops in cyclic DOM structures
  if (visited.has(el)) return null;
  visited.add(el);

  try {
    const tagName = (el.tagName || 'div').toLowerCase();

    // Skip non-rendering internal nodes
    if (['script', 'style', 'noscript', 'meta', 'link', 'template'].includes(tagName)) {
      return null;
    }

    const computed = safeGetComputedStyle(el);
    if (!isElementVisible(el, computed)) {
      return null;
    }

    // Extract non-default styles defensively
    const rawStyles: Record<string, string> = {};
    if (computed) {
      for (const prop of ESSENTIAL_STYLE_PROPERTIES) {
        const val = safeGetPropertyValue(computed, prop);
        if (val) {
          if (prop === 'background-color' || prop === 'color') {
            const hex = cssColorToHex(val);
            if (hex) rawStyles[prop] = hex;
          } else {
            rawStyles[prop] = val;
          }
        }
      }
    }

    const cleanedStyles = stripDefaultStyles(rawStyles, depth === 0);

    // Extract direct text content (excluding nested elements)
    let directText = '';
    const childNodes = el.childNodes;
    if (childNodes) {
      for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];
        if (node && (node.nodeType === 3 || (typeof Node !== 'undefined' && node.nodeType === Node.TEXT_NODE))) {
          const text = safeTrim(safeTextContent(node));
          if (text) {
            directText = directText ? `${directText} ${text}` : text;
          }
        }
      }
    }

    // Extract Assets (images, svgs, icon fonts, background images)
    const asset = extractAssetsFromElement(el);

    // Extract Children (including open Shadow DOM for Web Components)
    const rawChildren: LayoutNode[] = [];

    // Traverse Shadow Root if available (Web Components)
    const shadow = (el as any).shadowRoot;
    if (shadow && shadow.children) {
      for (let i = 0; i < shadow.children.length; i++) {
        const shadowChild = shadow.children[i];
        if (!shadowChild) continue;
        const childNode = extractLayoutNode(shadowChild, depth + 1, maxDepth, visited);
        if (childNode) rawChildren.push(childNode);
      }
    }

    // Traverse standard DOM children (skip child nodes of svg to prevent svg geometry explosion)
    if (tagName !== 'svg' && el.children) {
      for (let i = 0; i < el.children.length; i++) {
        const child = el.children[i];
        if (!child) continue;
        const childNode = extractLayoutNode(child, depth + 1, maxDepth, visited);
        if (childNode) rawChildren.push(childNode);
      }
    }

    // Handle iframe gracefully (same-origin extraction or descriptive placeholder)
    if (tagName === 'iframe') {
      try {
        const iframe = el as HTMLIFrameElement;
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && doc.body) {
          const iframeBody = extractLayoutNode(doc.body, depth + 1, maxDepth, visited);
          if (iframeBody) rawChildren.push(iframeBody);
        } else {
          directText = `[Iframe: ${safeGetAttribute(el, 'src') || 'external'}]`;
        }
      } catch {
        directText = `[Iframe: ${safeGetAttribute(el, 'src') || 'cross-origin'}]`;
      }
    }

    // Fallback text for leaf nodes
    if (!directText && rawChildren.length === 0) {
      const allText = safeTrim(safeTextContent(el));
      if (allText && allText.length < 160) {
        directText = allText;
      }
    }

    if (tagName === 'canvas') {
      directText = '[Canvas/WebGL Viewport: Area render grafis interaktif]';
    }

    // Preserve all children for 100% full fidelity
    const children = deduplicateSiblings(rawChildren);

    const node: LayoutNode = {
      tag: tagName,
      styles: cleanedStyles,
      children,
    };

    if (el.id) node.id = el.id;
    const semanticClass = cleanSemanticClass(el);
    if (semanticClass) node.semanticClass = semanticClass;

    const role = safeGetAttribute(el, 'role');
    if (role) node.role = role;

    const ariaLabel = safeGetAttribute(el, 'aria-label') || safeGetAttribute(el, 'title');
    if (ariaLabel) node.ariaLabel = ariaLabel;

    if (tagName === 'a') {
      const href = safeGetAttribute(el, 'href');
      if (href) node.href = href;
    }

    if (tagName === 'input') {
      const ph = (el as HTMLInputElement).placeholder || safeGetAttribute(el, 'placeholder');
      if (ph) node.placeholder = ph;
    }

    if (directText) node.text = directText;
    if (asset) node.assets = asset;

    return node;
  } catch (err) {
    // Isolated element error boundary: never crash the parent extraction
    console.debug('Safe layout node fallback on element:', el, err);
    let tag = 'div';
    try {
      if (el && typeof el.tagName === 'string') {
        tag = el.tagName.toLowerCase();
      }
    } catch {
      tag = 'div';
    }
    return {
      tag,
      styles: {},
      children: [],
    };
  }
}

/**
 * Extracts the primary landmarks or page root up to full depth 20.
 */
export function extractLayoutTree(targetElement?: Element | null): LayoutNode {
  if (targetElement && targetElement !== document.body) {
    const node = extractLayoutNode(targetElement, 0, 20);
    return (
      node || {
        tag: (targetElement.tagName || 'div').toLowerCase(),
        styles: {},
        children: [],
      }
    );
  }

  // Full Page extraction: start from body with full depth
  const bodyNode = extractLayoutNode(document.body, 0, 20);
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

  const anchors = safeQuerySelectorAll(document, 'a[href]');
  anchors.forEach((el) => {
    try {
      const rawHref = safeGetAttribute(el, 'href');
      if (!rawHref) return;
      const url = new URL(rawHref, currentOrigin);
      if (url.origin === currentOrigin && url.pathname) {
        links.add(url.pathname);
      }
    } catch {
      // Ignore invalid URLs
    }
  });

  return Array.from(links).slice(0, 50);
}
