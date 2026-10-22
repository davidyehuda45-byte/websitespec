# Project State: Blueprint Extractor

**Status**: Implemented & Verified (v1.0.0 - Universal Resilient Edition)  
**Platform**: Chrome, Edge, Brave, Firefox (MV2 & MV3)  
**Framework**: WXT + React 19 + TypeScript + Vite  

## Key Components Implemented
- `src/core/utils/dom-safe.ts`: Universal Defensive DOM Primitives (`safeString`, `safeTrim`, `safeClassList`, `safeGetComputedStyle`, `safeGetPropertyValue`, `safeQuerySelectorAll`, `safeTextContent`, `safeGetAttribute`). Immune to SVGAnimatedString, unhandled nulls, pseudo-element quirks, and invalid selectors.
- `src/core/utils/inject.ts`: Multi-stage ping-pong handshake (`ensureContentScriptReady`) and dynamic content script injection across Firefox MV2 (`browser.tabs.executeScript`) and Chromium MV3 (`chrome.scripting.executeScript`).
- `src/types/blueprint.ts`: TypeScript data model (`ColorToken`, `DesignTokens`, `LayoutNode`, `DetectedStack`, `PageBlueprint`, `ProjectBlueprint`) with `href`, `ariaLabel`, and `placeholder`.
- `src/core/normalize/defaults.ts`: Context-aware CSS default stripping (only includes flex/grid/position properties when contextually valid; strips all-zero shadows).
- `src/core/normalize/dedupe.ts`: 100% full fidelity mode (no lossy collapse of menu items or card lists).
- `src/core/extract/color.ts`: Converts RGB/RGBA/HSL to 6/8-digit HEX, resolves ancestor effective backgrounds, clusters colors by precise usage statistics (`textCount` vs `bgCount`).
- `src/core/extract/tokens.ts`: Mines global tokens, typography scale, spacing, radius, shadows, `:root` CSS variables (safe against cross-origin CORS), font sources.
- `src/core/extract/layout.ts`: Deep recursive DOM traversal (up to 20 levels) with per-element isolated error boundaries, Shadow DOM traversal (`el.shadowRoot` for Web Components), iframe handling, exact copywriting, placeholders, aria labels, and `href`.
- `src/core/extract/assets.ts`: Extracts `<img>`, unclipped `<svg>`, icon font classes (Material Design Icons, FontAwesome, Tabler, Lucide), and CSS background images.
- `src/core/extract/stack.ts`: Heuristic tech stack detection (Next.js, React, Vue/Nuxt, SvelteKit, Angular, Tailwind CSS, Bootstrap, Shadcn/Radix, Laravel, WordPress) with safe selectors and element sampling.
- `src/core/compile/prd-synthesizer.ts`: Synthesizes PRD sections (User Stories, Acceptance Criteria, Component Specifications, Accessibility).
- `src/core/compile/file-tree.ts`: Generates stack-specific production folder structures (Next.js 15, React+Vite, Laravel 11 Blade/Livewire/Inertia, Vue 3).
- `src/core/compile/tailwind-theme.ts`: Synthesizes ready-to-paste `tailwind.config.ts` theme presets.
- `src/core/compile/shared-layout.ts`: Cross-page comparison of header, nav, footer landmarks; extracts into Shared Layout section and replaces page nodes with modular reference.
- `src/core/compile/markdown.ts`: Generates deterministic, anti-slop `BLUEPRINT.md` combining PRD, negative constraints, tokens, routes, layouts, and verification checklist.
- `src/core/compile/zip.ts`: Packages `BLUEPRINT.md`, `tokens.json`, `assets/`, `AGENTS.md` using JSZip.
- `src/core/ui/toast.ts`: Non-blocking notification toast in an isolated Shadow DOM container.
- `src/core/storage/cart.ts`: Storage operations with badge counter sync.
- `entrypoints/background.ts`: Service worker managing numbered context menus, dynamic handshake injection, download dispatch.
- `entrypoints/content.ts`: Content script listening to extraction messages with ping handshake and tracking last right-clicked element.
- `entrypoints/popup/`: React 19 popup with Lucide SVG icons, target stack override selector, profile toggle, cart page management, download/copy actions.

## Verification
- Unit Tests: `pnpm test` (23 tests across 8 test suites in Vitest passing).
- Type Check: `pnpm compile` (`tsc --noEmit` 0 errors).
- Build Targets:
  - Firefox MV2: `.output/firefox-mv2` & `blueprint-extractor-1.0.0-firefox.zip`
  - Chrome MV3: `.output/chrome-mv3` & `blueprint-extractor-1.0.0-chrome.zip`
