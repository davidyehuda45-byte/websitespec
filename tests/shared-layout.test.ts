import { describe, it, expect } from 'vitest';
import { extractSharedLayouts } from '../src/core/compile/shared-layout';
import type { PageBlueprint, LayoutNode } from '../src/types/blueprint';

describe('Shared Layout Detection', () => {
  it('detects shared navbar and footer across multiple pages', () => {
    const sharedHeader: LayoutNode = {
      tag: 'header',
      id: 'site-header',
      styles: { display: 'flex' },
      children: [
        { tag: 'nav', styles: {}, children: [], text: 'Home About Contact' },
      ],
    };

    const sharedFooter: LayoutNode = {
      tag: 'footer',
      styles: { padding: '20px' },
      children: [
        { tag: 'p', styles: {}, children: [], text: 'Copyright 2026' },
      ],
    };

    const page1: PageBlueprint = {
      id: 'page-1',
      url: 'https://example.com/',
      pathname: '/',
      title: 'Home',
      capturedAt: '2026-10-22',
      viewport: { width: 1440, height: 900 },
      detectedStack: [],
      tokens: {} as any,
      layoutTree: {
        tag: 'body',
        styles: {},
        children: [
          sharedHeader,
          { tag: 'main', styles: {}, children: [], text: 'Hero Section' },
          sharedFooter,
        ],
      },
      internalLinks: ['/about'],
    };

    const page2: PageBlueprint = {
      id: 'page-2',
      url: 'https://example.com/about',
      pathname: '/about',
      title: 'About Us',
      capturedAt: '2026-10-22',
      viewport: { width: 1440, height: 900 },
      detectedStack: [],
      tokens: {} as any,
      layoutTree: {
        tag: 'body',
        styles: {},
        children: [
          sharedHeader,
          { tag: 'main', styles: {}, children: [], text: 'About Story' },
          sharedFooter,
        ],
      },
      internalLinks: ['/'],
    };

    const { sharedLayouts, updatedPages } = extractSharedLayouts([page1, page2]);

    expect(sharedLayouts.length).toBe(2);
    expect(sharedLayouts.map((s) => s.landmark)).toContain('header');
    expect(sharedLayouts.map((s) => s.landmark)).toContain('footer');

    // Verify that the child nodes in page1 and page2 are replaced with shared references
    const p1Children = updatedPages[0]?.layoutTree.children || [];
    expect(p1Children[0]?.text).toContain('[SHARED_COMPONENT: HEADER]');
    expect(p1Children[2]?.text).toContain('[SHARED_COMPONENT: FOOTER]');
  });
});
