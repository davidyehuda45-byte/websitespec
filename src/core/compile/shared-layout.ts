import type { PageBlueprint, SharedLayoutComponent, LayoutNode } from '../../types/blueprint';

function getLandmarkSignature(node: LayoutNode): string {
  const childTags = (node.children || []).map((c) => c.tag).join(',');
  return `${node.tag}#${node.id || ''}.${node.semanticClass || ''}[${childTags}]`;
}

/**
 * Detects identical or highly similar landmarks (header, nav, footer, sidebar) across 2+ pages.
 */
export function extractSharedLayouts(pages: PageBlueprint[]): {
  sharedLayouts: SharedLayoutComponent[];
  updatedPages: PageBlueprint[];
} {
  if (pages.length < 2) {
    return { sharedLayouts: [], updatedPages: pages };
  }

  const landmarkTags = new Set(['header', 'nav', 'footer', 'aside']);
  const candidates = new Map<string, { node: LayoutNode; landmark: 'header' | 'nav' | 'footer' | 'sidebar'; pages: Set<string> }>();

  for (const page of pages) {
    const root = page.layoutTree;
    const directChildren = root.children || [];

    for (const child of directChildren) {
      if (landmarkTags.has(child.tag)) {
        const sig = getLandmarkSignature(child);
        const landmarkType = child.tag === 'aside' ? 'sidebar' : (child.tag as 'header' | 'nav' | 'footer');

        const existing = candidates.get(sig);
        if (existing) {
          existing.pages.add(page.pathname);
        } else {
          candidates.set(sig, {
            node: child,
            landmark: landmarkType,
            pages: new Set([page.pathname]),
          });
        }
      }
    }
  }

  const sharedLayouts: SharedLayoutComponent[] = [];
  const sharedSignatures = new Set<string>();

  for (const [sig, data] of candidates.entries()) {
    if (data.pages.size >= 2) {
      sharedLayouts.push({
        landmark: data.landmark,
        node: data.node,
        presentInPages: Array.from(data.pages),
      });
      sharedSignatures.add(sig);
    }
  }

  // Replace shared nodes in individual page layout trees with lightweight reference
  const updatedPages = pages.map((page) => {
    const updatedChildren = (page.layoutTree.children || []).map((child) => {
      const sig = getLandmarkSignature(child);
      if (sharedSignatures.has(sig)) {
        return {
          tag: child.tag,
          styles: {},
          children: [],
          text: `[SHARED_COMPONENT: ${child.tag.toUpperCase()}] Dipakai bersama pada ${candidates.get(sig)?.pages.size} halaman. Lihat bagian Shared Layouts.`,
        };
      }
      return child;
    });

    return {
      ...page,
      layoutTree: {
        ...page.layoutTree,
        children: updatedChildren,
      },
    };
  });

  return { sharedLayouts, updatedPages };
}

