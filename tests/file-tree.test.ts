import { describe, it, expect } from 'vitest';
import { generateProjectFileTree } from '../src/core/compile/file-tree';
import type { ProjectBlueprint } from '../src/types/blueprint';

describe('Project File Tree Generator', () => {
  const mockProject: ProjectBlueprint = {
    domain: 'example.com',
    targetStack: 'Laravel 11 + Blade + Tailwind CSS',
    outputProfile: 'full',
    pages: [
      { pathname: '/', title: 'Home' } as any,
      { pathname: '/pricing', title: 'Pricing' } as any,
    ],
    sharedLayouts: [],
    createdAt: '2026-10-22',
  };

  it('generates Laravel Blade file tree with layouts and components', () => {
    const tree = generateProjectFileTree(mockProject, ['Navbar', 'SearchPill']);
    expect(tree).toContain('app.blade.php');
    expect(tree).toContain('navbar.blade.php');
    expect(tree).toContain('search-pill.blade.php');
    expect(tree).toContain('home.blade.php');
    expect(tree).toContain('pricing.blade.php');
    expect(tree).toContain('web.php');
  });

  it('generates Next.js 15 App Router file tree', () => {
    const nextProject = { ...mockProject, targetStack: 'Next.js 15 (App Router) + Tailwind CSS' };
    const tree = generateProjectFileTree(nextProject, ['Navbar', 'SearchPill']);
    expect(tree).toContain('layout.tsx');
    expect(tree).toContain('page.tsx');
    expect(tree).toContain('pricing');
    expect(tree).toContain('Navbar.tsx');
    expect(tree).toContain('SearchPill.tsx');
    expect(tree).toContain('tailwind.config.ts');
  });
});
