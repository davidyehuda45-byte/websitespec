import type { DetectedStack } from '../../types/blueprint';

export function detectTechStack(): DetectedStack[] {
  const detected: DetectedStack[] = [];
  const html = document.documentElement.outerHTML;

  // 1. Next.js
  if (
    document.getElementById('__next') ||
    document.querySelector('script[src*="/_next/"]') ||
    (window as any).__NEXT_DATA__
  ) {
    detected.push({
      name: 'Next.js',
      category: 'framework',
      confidence: 'high',
      evidence: 'Ditemukan container #__next atau script /_next/',
    });
  }

  // 2. React
  const hasReactFiber = Array.from(document.querySelectorAll('*')).some((el) => {
    return Object.keys(el).some((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$'));
  });
  if (
    document.querySelector('[data-reactroot]') ||
    hasReactFiber ||
    (window as any)._reactRootContainer ||
    detected.some((s) => s.name === 'Next.js')
  ) {
    if (!detected.some((s) => s.name === 'React')) {
      detected.push({
        name: 'React',
        category: 'library',
        confidence: 'high',
        evidence: 'Ditemukan React fiber / data-reactroot container',
      });
    }
  }

  // 3. Vue / Nuxt (Safe attribute check, no invalid [data-v-] selector)
  let hasVueScopedAttr = false;
  const elements = document.querySelectorAll('*');
  const maxEl = Math.min(elements.length, 500);

  for (let i = 0; i < maxEl; i++) {
    const el = elements[i];
    if (!el) continue;
    const attrs = el.attributes;
    for (let j = 0; j < attrs.length; j++) {
      const attr = attrs[j];
      if (attr && attr.name.startsWith('data-v-')) {
        hasVueScopedAttr = true;
        break;
      }
    }
    if (hasVueScopedAttr) break;
  }

  if (document.getElementById('__nuxt') || (window as any).__NUXT__) {
    detected.push({
      name: 'Nuxt.js',
      category: 'framework',
      confidence: 'high',
      evidence: 'Ditemukan #__nuxt atau objek global __NUXT__',
    });
  }

  if (hasVueScopedAttr || (window as any).__VUE__ || detected.some((s) => s.name === 'Nuxt.js')) {
    if (!detected.some((s) => s.name === 'Vue.js')) {
      detected.push({
        name: 'Vue.js',
        category: 'framework',
        confidence: 'high',
        evidence: 'Ditemukan scoped attribute data-v-* pada elemen DOM',
      });
    }
  }

  // 4. Svelte / SvelteKit
  const hasSvelteClass = Array.from(document.querySelectorAll('*')).some((el) =>
    Array.from(el.classList).some((cls) => cls.startsWith('svelte-'))
  );
  if (
    document.getElementById('__svelte') ||
    document.querySelector('script[src*="_app/immutable/"]') ||
    hasSvelteClass
  ) {
    detected.push({
      name: 'Svelte / SvelteKit',
      category: 'framework',
      confidence: 'high',
      evidence: 'Ditemukan penamaan class svelte-* atau bundle _app/immutable',
    });
  }

  // 5. Angular
  if (
    document.querySelector('[ng-version]') ||
    document.querySelector('*[_ngcontent-]') ||
    document.querySelector('*[_nghost-]')
  ) {
    detected.push({
      name: 'Angular',
      category: 'framework',
      confidence: 'high',
      evidence: 'Ditemukan atribut ng-version atau _ngcontent-*',
    });
  }

  // 6. Tailwind CSS
  const tailwindPatterns = /^(flex|grid|hidden|block|inline|absolute|relative|fixed|sticky|(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|w|h|max-w|min-w|rounded|text|bg|border|shadow|z|items|justify|space|leading|tracking)-[a-z0-9\.\/\[\]\-\#]+)$/;
  let tailwindMatchCount = 0;
  let totalClassCount = 0;

  for (let i = 0; i < maxEl; i++) {
    const el = elements[i];
    if (!el) continue;
    const classList = el.classList;
    for (let c = 0; c < classList.length; c++) {
      totalClassCount++;
      const cls = classList[c];
      if (cls && tailwindPatterns.test(cls)) {
        tailwindMatchCount++;
      }
    }
  }

  if (tailwindMatchCount > 20 && totalClassCount > 0 && tailwindMatchCount / totalClassCount > 0.35) {
    detected.push({
      name: 'Tailwind CSS',
      category: 'css',
      confidence: 'high',
      evidence: `${tailwindMatchCount} class cocok dengan pola utility Tailwind`,
    });
  }

  // 7. Bootstrap
  const hasBootstrap =
    document.querySelector('link[href*="bootstrap"]') ||
    (document.querySelector('.container, .container-fluid') &&
      document.querySelector('.row') &&
      document.querySelector('[class*="col-"]'));
  if (hasBootstrap) {
    detected.push({
      name: 'Bootstrap',
      category: 'css',
      confidence: 'high',
      evidence: 'Ditemukan grid class (container, row, col-*) atau stylesheet Bootstrap',
    });
  }

  // 8. Radix UI / Shadcn UI
  const hasRadix = Array.from(document.querySelectorAll('*')).some((el) => {
    return Array.from(el.attributes).some((a) => a.name.startsWith('data-radix-') || a.name === 'data-state');
  });
  if (hasRadix && detected.some((s) => s.name === 'Tailwind CSS')) {
    detected.push({
      name: 'Shadcn UI / Radix',
      category: 'library',
      confidence: 'high',
      evidence: 'Ditemukan atribut Radix data-state/data-radix-* dipadukan dengan Tailwind',
    });
  }

  // 9. Laravel (Blade / Livewire / Inertia)
  const isLivewire = document.querySelector('[wire\\:id], [wire\\:snapshot]');
  const isInertia = document.getElementById('app')?.hasAttribute('data-page');
  const hasCsrf = document.querySelector('meta[name="csrf-token"]');

  if (isLivewire || isInertia || hasCsrf) {
    let sub = 'Blade';
    if (isLivewire) sub = 'Livewire';
    if (isInertia) sub = 'Inertia.js';

    detected.push({
      name: `Laravel (${sub})`,
      category: 'backend-heuristic',
      confidence: isLivewire || isInertia ? 'high' : 'medium',
      evidence: `Dugaan backend dari front-end: ${isLivewire ? 'wire:id Livewire' : isInertia ? 'Inertia data-page' : 'meta csrf-token'}`,
    });
  }

  // 10. WordPress
  if (
    html.includes('/wp-content/') ||
    html.includes('/wp-includes/') ||
    document.querySelector('meta[name="generator"][content*="WordPress"]')
  ) {
    detected.push({
      name: 'WordPress',
      category: 'framework',
      confidence: 'high',
      evidence: 'Ditemukan direktori wp-content/wp-includes atau generator WordPress',
    });
  }

  return detected;
}
