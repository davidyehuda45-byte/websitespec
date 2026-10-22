import type { LayoutNode } from '../../types/blueprint';

/**
 * Creates a structural signature of a node (tag + display + child tags signature)
 * to detect repeating siblings like cards in a grid or items in a list.
 */
function getStructuralSignature(node: LayoutNode): string {
  const display = node.styles['display'] || 'block';
  const childTags = (node.children || []).map((c) => c.tag).join('>');
  return `${node.tag}[${display}](${childTags})`;
}

/**
 * Deduplicates contiguous identical sibling nodes.
 * If 3 or more identical cards/items appear consecutively, collapses them into 1 node with `repeatCount`.
 */
export function deduplicateSiblings(children: LayoutNode[]): LayoutNode[] {
  if (!children || children.length <= 2) {
    return children;
  }

  const result: LayoutNode[] = [];
  let i = 0;

  while (i < children.length) {
    const current = children[i];
    if (!current) {
      i++;
      continue;
    }
    const signature = getStructuralSignature(current);
    let count = 1;

    let j = i + 1;
    while (j < children.length) {
      const next = children[j];
      if (next && getStructuralSignature(next) === signature) {
        count++;
        j++;
      } else {
        break;
      }
    }

    if (count >= 2) {
      result.push({
        ...current,
        repeatCount: count,
      });
      i = j;
    } else {
      result.push(current);
      i++;
    }
  }

  return result;
}
