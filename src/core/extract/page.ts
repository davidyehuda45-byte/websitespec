import type { PageBlueprint } from '../../types/blueprint';
import { extractDesignTokens } from './tokens';
import { extractLayoutTree, extractInternalLinks } from './layout';
import { detectTechStack } from './stack';

export function extractPageBlueprint(targetElement?: Element | null): PageBlueprint {
  const tokens = extractDesignTokens(targetElement || document.body);
  const layoutTree = extractLayoutTree(targetElement);
  const detectedStack = detectTechStack();
  const internalLinks = extractInternalLinks();

  const isComponentMode = Boolean(targetElement && targetElement !== document.body);
  const title = isComponentMode
    ? `Component <${targetElement?.tagName.toLowerCase()}> on ${document.title || 'Untitled'}`
    : document.title || 'Untitled Page';

  return {
    id: `${window.location.pathname}_${Date.now()}`,
    url: window.location.href,
    pathname: window.location.pathname,
    title,
    capturedAt: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    detectedStack,
    tokens,
    layoutTree,
    internalLinks,
  };
}

