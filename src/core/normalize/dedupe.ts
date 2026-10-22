import type { LayoutNode } from '../../types/blueprint';

/**
 * Preserves all sibling nodes without lossy collapse, ensuring full fidelity
 * for menus, card grids, and list items.
 */
export function deduplicateSiblings(children: LayoutNode[]): LayoutNode[] {
  // Always return complete, untruncated child nodes
  return children;
}
