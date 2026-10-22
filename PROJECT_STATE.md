# Project State: Blueprint Extractor

**Status**: Implemented & Verified (v1.0.0)  
**Platform**: Chrome, Edge, Brave, Firefox  
**Framework**: WXT + React 19 + TypeScript + Vite  

## Key Components Implemented
- `src/types/blueprint.ts`: Strong TypeScript data model (`ColorToken`, `DesignTokens`, `LayoutNode`, `DetectedStack`, `PageBlueprint`, `ProjectBlueprint`).
- `src/core/normalize/defaults.ts`: Strips noisy CSS browser defaults, normalizes 4-way box-model shorthand.
- `src/core/normalize/dedupe.ts`: Detects contiguous repeating sibling elements (cards/grid) and collapses into representative node with `repeatCount`.
- `src/core/extract/color.ts`: Converts RGB/RGBA/HSL to 6/8-digit HEX, resolves ancestor effective backgrounds, clusters colors by role.
- `src/core/extract/tokens.ts`: Mines global tokens, typography scale, spacing, radius, shadows, `:root` CSS variables, font sources.
- `src/core/extract/layout.ts`: Recursive DOM traversal with computed style filtering, copywriting extraction, component mode support.
- `src/core/extract/assets.ts`: Extracts `<img>`, inline `<svg>`, and CSS background images.
- `src/core/extract/stack.ts`: Heuristic tech stack detection (Next.js, React, Vue/Nuxt, SvelteKit, Angular, Tailwind CSS, Bootstrap, Shadcn/Radix, Laravel, WordPress).
- `src/core/compile/shared-layout.ts`: Cross-page comparison of header, nav, footer landmarks; extracts into Shared Layout section and replaces page nodes with modular reference.
- `src/core/compile/markdown.ts`: Generates deterministic, anti-slop `BLUEPRINT.md` with negative constraints, tokens, routes, layouts, and verification checklist.
- `src/core/compile/zip.ts`: Packages `BLUEPRINT.md`, `tokens.json`, `assets/`, `AGENTS.md` using JSZip.
- `src/core/ui/toast.ts`: Non-blocking notification toast in an isolated Shadow DOM container.
- `src/core/storage/cart.ts`: Storage operations with badge counter sync.
- `entrypoints/background.ts`: Service worker managing numbered context menus, on-demand script injection, download dispatch.
- `entrypoints/content.ts`: Content script listening to extraction messages and tracking last right-clicked element.
- `entrypoints/popup/`: React 19 popup with Lucide SVG icons, target stack override selector, profile toggle, cart page management, download/copy actions.

## Verification
- Unit Tests: `pnpm test` (11 tests in Vitest passing).
- Type Check: `pnpm compile` (`tsc --noEmit` 0 errors).
- Extension Build: `pnpm build` (`wxt build` successfully emits production Chrome MV3 bundle into `.output/chrome-mv3`).

