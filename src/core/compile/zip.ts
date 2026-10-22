import JSZip from 'jszip';
import type { ProjectBlueprint, LayoutNode } from '../../types/blueprint';
import { compileBlueprintToMarkdown } from './markdown';
import { generateTailwindThemeConfig } from './tailwind-theme';
import { synthesizeComponentsFromBlueprint } from './prd-synthesizer';

export async function compileBlueprintToZip(project: ProjectBlueprint): Promise<Blob> {
  const zip = new JSZip();

  // 1. BLUEPRINT.md (Comprehensive PRD & Architecture Blueprint)
  const markdown = compileBlueprintToMarkdown(project);
  zip.file('BLUEPRINT.md', markdown);

  // 2. tailwind.config.js
  const primaryPage = project.pages[0];
  if (primaryPage) {
    const tailwindConfig = generateTailwindThemeConfig(primaryPage.tokens);
    zip.file('tailwind.config.js', tailwindConfig);
    zip.file('tokens.json', JSON.stringify(primaryPage.tokens, null, 2));
  }

  // 3. scaffolding/ folder with ready-to-run component templates
  const modularComponents = synthesizeComponentsFromBlueprint(project);
  const scaffoldingFolder = zip.folder('scaffolding');
  if (scaffoldingFolder) {
    modularComponents.forEach((comp) => {
      // e.g. "components/ui/SearchPill.tsx" -> filename "SearchPill.tsx"
      const simpleName = comp.targetFile.split('/').pop() || `${comp.name}.tsx`;
      scaffoldingFolder.file(simpleName, comp.codeTemplate);
    });
  }

  // 4. AGENTS.md (Quick instruction prompt for Cursor / Claude Code)
  const agentsPrompt = `# AI Agent Instruction Prompt

You are tasked with cloning the UI for **${project.domain}**.
Target Stack: **${project.targetStack || 'Modern Frontend'}**

Follow \`BLUEPRINT.md\` carefully:
1. Review the Project File Tree in Section 3 and place files accordingly.
2. Drop \`tailwind.config.js\` into your project root.
3. Check the \`scaffolding/\` folder in this zip for starter component templates.
4. Strictly follow the Negative Constraints in Section 1 (no hallucinated gradients or placeholder copy).
5. Implement the modular components in Section 6 and assemble the pages in Section 7.
`;
  zip.file('AGENTS.md', agentsPrompt);

  // 5. assets/ folder (SVGs)
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
