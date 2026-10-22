import JSZip from 'jszip';
import type { ProjectBlueprint, LayoutNode } from '../../types/blueprint';
import { compileBlueprintToMarkdown } from './markdown';

export async function compileBlueprintToZip(project: ProjectBlueprint): Promise<Blob> {
  const zip = new JSZip();

  // 1. BLUEPRINT.md
  const markdown = compileBlueprintToMarkdown(project);
  zip.file('BLUEPRINT.md', markdown);

  // 2. tokens.json (Machine readable)
  const primaryPage = project.pages[0];
  if (primaryPage) {
    zip.file('tokens.json', JSON.stringify(primaryPage.tokens, null, 2));
  }

  // 3. AGENTS.md (Quick instruction prompt for Cursor / Claude Code)
  const agentsPrompt = `# Agent Prompt Context

You are tasked with cloning the user interface for **${project.domain}**.
Target Stack: **${project.targetStack || 'Modern Frontend'}**

Read \`BLUEPRINT.md\` carefully.
- Strictly adhere to the negative constraints in Section 1.
- Use the design tokens in Section 5.
- Implement the shared layouts in Section 6 as reusable components.
- Do NOT improvise non-existent styling or placeholder copy.
`;
  zip.file('AGENTS.md', agentsPrompt);

  // 4. assets/ folder (SVGs)
  const assetsFolder = zip.folder('assets');
  if (assetsFolder) {
    let svgIndex = 1;
    project.pages.forEach((p) => {
      const traverse = (node: LayoutNode) => {
        if (node.assets?.type === 'svg' && node.assets.svgContent) {
          assetsFolder.file(`icon-${svgIndex++}.svg`, node.assets.svgContent);
        }
        (node.children || []).forEach(traverse);
      };
      traverse(p.layoutTree);
    });
  }

  return await zip.generateAsync({ type: 'blob' });
}

