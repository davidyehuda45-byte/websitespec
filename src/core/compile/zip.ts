import JSZip from 'jszip';
import type { ProjectBlueprint, LayoutNode } from '../../types/blueprint';
import { compileBlueprintToMarkdown } from './markdown';
import { generateTailwindThemeConfig } from './tailwind-theme';
import { synthesizeComponentContracts } from './prd-synthesizer';

export async function compileBlueprintToZip(project: ProjectBlueprint): Promise<Blob> {
  const zip = new JSZip();

  // 1. PRD.md (Comprehensive Product Requirements Document & Architecture Blueprint)
  const markdown = compileBlueprintToMarkdown(project);
  zip.file('PRD.md', markdown);
  zip.file('BLUEPRINT.md', markdown);

  // 2. tailwind.config.js & tokens.json
  const primaryPage = project.pages[0];
  if (primaryPage) {
    const tailwindConfig = generateTailwindThemeConfig(primaryPage.tokens);
    zip.file('tailwind.config.js', tailwindConfig);
    zip.file('tokens.json', JSON.stringify(primaryPage.tokens, null, 2));
  }

  // 3. AGENTS.md (Quick instruction prompt for Cursor / Claude Code)
  const componentContracts = synthesizeComponentContracts(project);
  const agentsPrompt = `# AI Agent Execution Guide
## System: ${project.domain}
## Target Stack: ${project.targetStack || 'Modern Frontend Framework'}

You are tasked with implementing the UI and functionality for **${project.domain}** according to \`PRD.md\`.

### Execution Order:
1. Review the **Executive Summary & Scope** in Section 2.
2. Align with the **User Personas & Role Matrix** in Section 3.
3. Follow the **User Flows (Mermaid)** in Section 4.
4. Implement each page according to **Functional Requirements & Acceptance Criteria** in Section 5.
5. Model your state/database schemas using **Inferred Business Data Entities** in Section 6.
6. Build the modular components according to the **Component Architecture & Props Contracts** in Section 7:
${componentContracts.map((c) => `   - \`<${c.name} />\` -> \`${c.targetFile}\``).join('\n')}
7. Adopt the directory layout in Section 8 and apply the \`tailwind.config.js\` from Section 9.
8. Strictly follow the Negative Constraints in Section 1 (no phantom purple/blue gradients or placeholder copy).
9. Verify all Acceptance Criteria using the checklist in Section 10.
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
