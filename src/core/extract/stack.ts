import type { DetectedStack } from '../../types/blueprint';
import {
  safeClassList,
  safeQuerySelector,
  safeQuerySelectorAll,
} from '../utils/dom-safe';

export function detectTechStack(): DetectedStack[] {
  const detected: DetectedStack[] = [];

  try {
    const html = document.documentElement?.outerHTML || '';
    const elements = safeQuerySelectorAll(document, '*');
    const maxScan = Math.min(elements.length, 500);

    // 1. Next.js
    if (
      document.getElementById('__next') ||
      safeQuerySelector(document, 'script[src*="/_next/"]') ||
      (window as any).__NEXT_DATA__
    ) {
      detected.push({
        name: 'Next.js',
        category: 'framework',
        confidence: 'high',
        evidence: 'Ditemukan container #__next atau script /_next/',
      });
    }

    // 2. Vite (Universal Bundler & Modern Dev Tool)
    const hasViteClient = Boolean(safeQuerySelector(document, 'script[src*="@vite/client"]'));
    const hasViteModuleAsset = Boolean(
      safeQuerySelector(document, 'script[type="module"][src*="/assets/index-"], script[type="module"][src*="/assets/main-"], link[rel="stylesheet"][href*="/assets/index-"]')
    );
    const hasModulePreload = Boolean(safeQuerySelector(document, 'link[rel="modulepreload"]'));
    const isVite = hasViteClient || (hasViteModuleAsset && (hasModulePreload || Boolean(safeQuerySelector(document, 'script[type="module"]'))));

    if (isVite) {
      detected.push({
        name: 'Vite',
        category: 'framework',
        confidence: 'high',
        evidence: 'Ditemukan bundle aset Vite (modulepreload / /assets/index-*.js)',
      });
    }

    // 3. React
    let hasReactFiber = false;
    for (let i = 0; i < maxScan; i++) {
      const el = elements[i];
      if (!el) continue;
      try {
        if (Object.keys(el).some((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$'))) {
          hasReactFiber = true;
          break;
        }
      } catch {
        // Ignore restricted properties
      }
    }

    const rootEl = document.getElementById('root');
    const hasReactSpaRoot = Boolean(
      rootEl &&
      rootEl.children.length > 0 &&
      !document.getElementById('__nuxt') &&
      !document.getElementById('__svelte') &&
      !safeQuerySelector(document, '[ng-version]')
    );

    const hasReactScript = Boolean(
      safeQuerySelector(document, 'script[src*="react"], script[src*="react-dom"]')
    );

    if (
      safeQuerySelector(document, '[data-reactroot]') ||
      hasReactFiber ||
      (window as any)._reactRootContainer ||
      (hasReactSpaRoot && (isVite || hasReactScript || Boolean(safeQuerySelector(document, 'script[type="module"]')))) ||
      detected.some((s) => s.name === 'Next.js')
    ) {
      if (!detected.some((s) => s.name === 'React')) {
        detected.push({
          name: 'React',
          category: 'library',
          confidence: 'high',
          evidence: hasReactFiber
            ? 'Ditemukan React fiber property'
            : hasReactSpaRoot
            ? 'Ditemukan container #root dengan modul bundling SPA'
            : 'Ditemukan container React',
        });
      }
    }

    // 3. Vue / Nuxt (Safe attribute check, no invalid [data-v-] selector)
    let hasVueScopedAttr = false;
    for (let i = 0; i < maxScan; i++) {
      const el = elements[i];
      if (!el || !el.attributes) continue;
      const attrs = el.attributes;
      for (let j = 0; j < attrs.length; j++) {
        const attr = attrs[j];
        if (attr && attr.name && attr.name.startsWith('data-v-')) {
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
    let hasSvelteClass = false;
    for (let i = 0; i < maxScan; i++) {
      const el = elements[i];
      if (!el) continue;
      if (safeClassList(el).some((cls) => cls.startsWith('svelte-'))) {
        hasSvelteClass = true;
        break;
      }
    }

    if (
      document.getElementById('__svelte') ||
      safeQuerySelector(document, 'script[src*="_app/immutable/"]') ||
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
      safeQuerySelector(document, '[ng-version]') ||
      safeQuerySelector(document, '*[_ngcontent-]') ||
      safeQuerySelector(document, '*[_nghost-]')
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

    for (let i = 0; i < maxScan; i++) {
      const el = elements[i];
      if (!el) continue;
      const classList = safeClassList(el);
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
      safeQuerySelector(document, 'link[href*="bootstrap"]') ||
      (safeQuerySelector(document, '.container, .container-fluid') &&
        safeQuerySelector(document, '.row') &&
        safeQuerySelector(document, '[class*="col-"]'));
    if (hasBootstrap) {
      detected.push({
        name: 'Bootstrap',
        category: 'css',
        confidence: 'high',
        evidence: 'Ditemukan grid class (container, row, col-*) atau stylesheet Bootstrap',
      });
    }

    // 8. Radix UI / Shadcn UI
    let hasRadix = false;
    for (let i = 0; i < maxScan; i++) {
      const el = elements[i];
      if (!el || !el.attributes) continue;
      for (let a = 0; a < el.attributes.length; a++) {
        const attr = el.attributes[a];
        if (attr && (attr.name.startsWith('data-radix-') || attr.name === 'data-state')) {
          hasRadix = true;
          break;
        }
      }
      if (hasRadix) break;
    }

    if (hasRadix && detected.some((s) => s.name === 'Tailwind CSS')) {
      detected.push({
        name: 'Shadcn UI / Radix',
        category: 'library',
        confidence: 'high',
        evidence: 'Ditemukan atribut Radix data-state/data-radix-* dipadukan dengan Tailwind',
      });
    }

    // 9. Alpine.js
    const hasAlpine = safeQuerySelector(document, '[x-data], [x-init], [x-show], [x-model], [x-cloak]');
    if (hasAlpine || (window as any).Alpine) {
      detected.push({
        name: 'Alpine.js',
        category: 'library',
        confidence: 'high',
        evidence: 'Ditemukan direktif x-data/x-init atau objek window.Alpine',
      });
    }

    // 10. Laravel (Blade / Livewire / Inertia)
    const hasCsrfInput = safeQuerySelector(document, 'input[name="_token"]');
    const hasMethodInput = safeQuerySelector(document, 'input[name="_method"]');
    const hasCsrfMeta = safeQuerySelector(document, 'meta[name="csrf-token"]');
    const hasLaravelCookie =
      typeof document !== 'undefined' &&
      typeof document.cookie === 'string' &&
      (document.cookie.includes('XSRF-TOKEN') || document.cookie.includes('laravel_session'));
    const isLivewire = safeQuerySelector(document, '[wire\\:id], [wire\\:snapshot], [wire\\:model], [wire\\:click], [wire\\:navigate]');
    const isInertia = document.getElementById('app')?.hasAttribute('data-page') || safeQuerySelector(document, '[data-page]');
    const hasLaravelViteAssets = safeQuerySelector(document, 'script[src*="/build/assets/"], link[href*="/build/assets/"]');

    if (hasCsrfInput || hasMethodInput || hasCsrfMeta || hasLaravelCookie || isLivewire || isInertia || (hasAlpine && hasLaravelViteAssets)) {
      let sub = 'Blade';
      if (isLivewire) sub = 'Livewire';
      else if (isInertia) sub = 'Inertia.js';

      const evidences: string[] = [];
      if (hasCsrfInput) evidences.push('input[name="_token"] CSRF Blade');
      if (hasCsrfMeta) evidences.push('meta csrf-token');
      if (hasLaravelCookie) evidences.push('cookie XSRF-TOKEN/laravel_session');
      if (isLivewire) evidences.push('direktif Livewire (wire:id/wire:model)');
      if (isInertia) evidences.push('container data-page Inertia');
      if (hasLaravelViteAssets) evidences.push('asset bundle Vite /build/assets/');

      detected.push({
        name: `Laravel (${sub})`,
        category: 'backend-heuristic',
        confidence: hasCsrfInput || isLivewire || isInertia || hasLaravelCookie ? 'high' : 'medium',
        evidence: `Dugaan backend dari front-end: ${evidences.join(', ')}`,
      });
    }

    // 11. WordPress
    if (
      html.includes('/wp-content/') ||
      html.includes('/wp-includes/') ||
      safeQuerySelector(document, 'meta[name="generator"][content*="WordPress"]')
    ) {
      detected.push({
        name: 'WordPress',
        category: 'framework',
        confidence: 'high',
        evidence: 'Ditemukan direktori wp-content/wp-includes atau generator WordPress',
      });
    }
  } catch (err) {
    console.debug('Safe tech stack detection caught exception:', err);
  }

  return detected;
}
