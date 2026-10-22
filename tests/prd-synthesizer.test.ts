import { describe, it, expect } from 'vitest';
import { synthesizeComponentsFromBlueprint } from '../src/core/compile/prd-synthesizer';
import type { ProjectBlueprint, LayoutNode } from '../src/types/blueprint';

describe('PRD Component Synthesizer', () => {
  it('identifies landmarks and high-intent containers into modular components with code scaffolding', () => {
    const mockTree: LayoutNode = {
      tag: 'body',
      styles: {},
      children: [
        {
          tag: 'nav',
          id: 'main-nav',
          styles: { display: 'flex', 'background-color': '#1E293B', height: '64px' },
          children: [
            { tag: 'span', styles: {}, text: 'Brand Logo', children: [] },
          ],
        },
        {
          tag: 'div',
          semanticClass: 'search-pill sky-control',
          placeholder: 'Search constellations...',
          styles: { display: 'flex', 'border-radius': '22px', 'background-color': '#334155' },
          children: [],
        },
      ],
    };

    const project: ProjectBlueprint = {
      domain: 'test.com',
      targetStack: 'React + Vite + Tailwind CSS',
      outputProfile: 'full',
      pages: [
        {
          pathname: '/',
          title: 'Home',
          layoutTree: mockTree,
        } as any,
      ],
      sharedLayouts: [],
      createdAt: '2026-10-22',
    };

    const components = synthesizeComponentsFromBlueprint(project);
    expect(components.length).toBeGreaterThanOrEqual(2);

    const navComp = components.find((c) => c.name.includes('Nav'));
    expect(navComp).toBeDefined();
    expect(navComp?.visualSpecs.dimensions).toContain('Height: 64px');
    expect(navComp?.codeTemplate).toContain('export function');

    const searchComp = components.find((c) => c.name.includes('Search'));
    expect(searchComp).toBeDefined();
    expect(searchComp?.attributes.placeholder).toBe('Search constellations...');
    expect(searchComp?.codeTemplate).toContain("placeholder = 'Search constellations...'");
  });
});
