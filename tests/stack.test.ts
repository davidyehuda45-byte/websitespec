import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectTechStack } from '../src/core/extract/stack';

describe('Universal Tech Stack Detection', () => {
  const originalDocument = (globalThis as any).document;
  const originalWindow = (globalThis as any).window;

  afterEach(() => {
    (globalThis as any).document = originalDocument;
    (globalThis as any).window = originalWindow;
  });

  it('reliably detects React + Vite SPA on modern client-rendered apps', () => {
    const mockElements: any[] = [];
    const mockSelectors: Record<string, any> = {
      'script[src*="@vite/client"]': null,
      'script[type="module"][src*="/assets/index-"], script[type="module"][src*="/assets/main-"], link[rel="stylesheet"][href*="/assets/index-"]': { tagName: 'SCRIPT' },
      'link[rel="modulepreload"]': { tagName: 'LINK' },
      'script[type="module"]': { tagName: 'SCRIPT' },
      '[data-reactroot]': null,
      'script[src*="react"], script[src*="react-dom"]': null,
    };

    (globalThis as any).document = {
      documentElement: { outerHTML: '<html>...</html>' },
      getElementById: (id: string) => {
        if (id === 'root') return { id: 'root', children: [{ id: 'child' }] };
        return null;
      },
      querySelector: (sel: string) => mockSelectors[sel] || null,
      querySelectorAll: (sel: string) => (sel === '*' ? mockElements : []),
    };
    (globalThis as any).window = {};

    const detected = detectTechStack();
    expect(detected.some((s) => s.name === 'React')).toBe(true);
    expect(detected.some((s) => s.name === 'Vite')).toBe(true);
  });

  it('reliably detects Laravel Blade + Livewire', () => {
    const mockSelectors: Record<string, any> = {
      'input[name="_token"]': { tagName: 'INPUT' },
      'input[name="_method"]': { tagName: 'INPUT' },
      '[wire\\:id], [wire\\:snapshot], [wire\\:model], [wire\\:click], [wire\\:navigate]': { tagName: 'DIV' },
    };

    (globalThis as any).document = {
      documentElement: { outerHTML: '<html>...</html>' },
      getElementById: () => null,
      querySelector: (sel: string) => mockSelectors[sel] || null,
      querySelectorAll: () => [],
      cookie: 'XSRF-TOKEN=mock; laravel_session=mock',
    };
    (globalThis as any).window = {};

    const detected = detectTechStack();
    const laravel = detected.find((s) => s.name.includes('Laravel'));
    expect(laravel).toBeDefined();
    expect(laravel?.name).toBe('Laravel (Livewire)');
  });

  it('reliably detects Next.js framework', () => {
    const mockSelectors: Record<string, any> = {
      'script[src*="/_next/"]': { tagName: 'SCRIPT' },
    };

    (globalThis as any).document = {
      documentElement: { outerHTML: '<html>...</html>' },
      getElementById: (id: string) => (id === '__next' ? { id: '__next' } : null),
      querySelector: (sel: string) => mockSelectors[sel] || null,
      querySelectorAll: () => [],
    };
    (globalThis as any).window = { __NEXT_DATA__: {} };

    const detected = detectTechStack();
    expect(detected.some((s) => s.name === 'Next.js')).toBe(true);
    expect(detected.some((s) => s.name === 'React')).toBe(true);
  });
});
