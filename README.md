# Blueprint Extractor

Browser extension (Chrome, Edge, Brave, Firefox) that extracts live, rendered web pages into deterministic UI specifications in Markdown (`BLUEPRINT.md`) tailored for AI coding agents such as Cursor, Windsurf, Claude Code, and Cline.

Unlike screenshot-to-code tools that hallucinate colors or scrapers that copy unstyled "div soup", Blueprint Extractor extracts data directly from the rendered DOM and `window.getComputedStyle()`.

---

## The Problem

1. **Screenshot Guessing**: Visual models estimate hex values, padding, line heights, and border radii, leading to drifting layouts and generic AI styling (fantasy purple gradients, inconsistent spacing).
2. **Raw HTML Div Soup**: Copy-pasting page source brings obfuscated CSS Module hashes (`_btn_1a2b3_4`), framework wrappers, and tens of thousands of tokens of non-layout noise.
3. **Multi-Page Disconnect**: Cloned web applications require consistent shared components (navbar, sidebar, footer) and routing maps. Single-page prompts force agents to re-invent shared layouts on every page.
4. **Behind-Login Access**: CLI scrapers cannot easily access authenticated user dashboards, whereas a browser extension operates directly within the authenticated session.

---

## Core Capabilities

- **Computed Design Tokens**: Mines actual HEX color palettes (categorized into background, text, accent, and borders), typography scales (h1-h6, body), spacing scales, border radii, box shadows, and `:root` CSS custom properties.
- **Deep Component Hierarchy (Up to 20 Levels)**: Preserves complete layout trees with flex/grid alignments, dimensions, copywriting, link destinations (`href`), input placeholders, and aria-labels.
- **Asset & Icon Harvesting**: Extracts image dimensions, alt text, unclipped inline SVGs, and icon font classes (Material Design Icons, FontAwesome, Lucide, Tabler).
- **Shared Layout Compiler**: Compares landmark elements (`<header>`, `<nav>`, `<footer>`, `<aside>`) across multiple captured pages. Matching structures are extracted into a modular `Shared Layout` section and replaced with references in individual page trees.
- **Anti-Slop Normalization**:
  - Context-aware CSS stripping: removes default properties (e.g. flex properties on block elements, zero-offset positioning, elevation-0 shadows).
  - Color role determination based on actual DOM frequency (`textCount` vs `bgCount`).
  - Prepends strict Negative Constraints to prevent coding agents from improvising styling or placeholder copy.
- **Framework Detection & Target Stack Override**: Heuristically detects the reference stack (Next.js, React, Vue/Nuxt, SvelteKit, Angular, Tailwind CSS, Bootstrap, Shadcn/Radix, Laravel) and allows selecting a target stack (e.g. Laravel 11 + Blade + Tailwind) in the generated specification.
- **Local & Private**: All extraction and file generation runs entirely client-side inside the browser. No external API calls or remote telemetry.

---

## Architecture

Built with [WXT](https://wxt.dev/), React 19, and TypeScript.

```
web-blueprint-pagespec/
├── entrypoints/
│   ├── background.ts          # Service worker lifecycle & numbered context menus
│   ├── content.ts             # Content script listener & right-clicked element tracker
│   └── popup/                 # React 19 dashboard (cart management, stack override)
├── src/
│   ├── types/
│   │   └── blueprint.ts       # TypeScript schemas for tokens, nodes, and blueprints
│   └── core/
│       ├── extract/
│       │   ├── color.ts       # RGB/RGBA to HEX conversion & role clustering
│       │   ├── tokens.ts      # Global styles, typography, scales, :root CSS vars
│       │   ├── layout.ts      # Deep recursive DOM traversal & copywriting extraction
│       │   ├── assets.ts      # Image, unclipped SVG, and icon font detection
│       │   ├── stack.ts       # Multi-framework heuristic detection
│       │   └── page.ts        # PageBlueprint aggregator
│       ├── normalize/
│       │   ├── defaults.ts    # Context-aware CSS default property filtering
│       │   └── dedupe.ts      # Full fidelity layout preservation
│       ├── compile/
│       │   ├── shared-layout.ts # Cross-page landmark matcher
│       │   ├── markdown.ts    # BLUEPRINT.md compiler with Negative Constraints
│       │   └── zip.ts         # ZIP bundler (BLUEPRINT.md + tokens.json + assets/)
│       ├── storage/
│       │   └── cart.ts        # Storage operations with extension badge sync
│       ├── ui/
│       │   └── toast.ts       # Non-blocking notification toast in isolated Shadow DOM
│       └── utils/
│           └── inject.ts      # On-demand script injection (MV2 & MV3 fallback)
└── tests/                     # Unit test suites (Vitest)
```

---

## Installation & Development

### Prerequisites
- Node.js 18+
- pnpm (`corepack enable pnpm` or `npm install -g pnpm`)

### Installation

```bash
git clone https://github.com/DavidYehudaSurbakti/web-blueprint-pagespec.git
cd web-blueprint-pagespec
pnpm install
```

### Development

```bash
# Run in Chrome with hot-reload
pnpm dev

# Run in Firefox with hot-reload
pnpm dev:firefox
```

### Production Build

```bash
# Build for Chrome / Chromium (Manifest V3) -> .output/chrome-mv3
pnpm build

# Build for Firefox (Manifest V2) -> .output/firefox-mv2
pnpm build:firefox

# Package Firefox zip -> .output/blueprint-extractor-1.0.0-firefox.zip
pnpm zip:firefox
```

### Loading into Browser

#### Mozilla Firefox
1. Navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `manifest.json` inside `.output/firefox-mv2/` (or the zip file in `.output/`).

#### Google Chrome / Brave / Edge
1. Navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `.output/chrome-mv3` folder.

---

## Usage Workflow

1. Navigate to your reference website.
2. Add pages to your blueprint cart:
   - **Full Page**: Right-click anywhere > `1. Tambahkan halaman ke Blueprint` (or click "Tambahkan Halaman Aktif" in the popup).
   - **Specific Component**: Right-click a specific card, navbar, or element > `2. Mode Komponen (Pilih elemen ini)`.
3. Browse to additional routes on the same website and capture them.
4. Open the extension popup:
   - Review captured routes and remove unwanted pages if needed.
   - Select your desired **Target Stack Override** (e.g. Next.js 15, Laravel Blade, Vue 3, React + Tailwind).
   - Click **Unduh .md** for a standalone `BLUEPRINT.md` or **Unduh .zip** for the full package (`BLUEPRINT.md`, `tokens.json`, and SVG assets).
5. Feed the generated `BLUEPRINT.md` directly into your AI coding agent prompt.

---

## Testing

Automated test suites verify normalization algorithms, color clustering, shared layout extraction, and markdown generation:

```bash
pnpm test
```

Type checking:

```bash
pnpm compile
```

---

## Output Format Example

```markdown
# BLUEPRINT SPESIFIKASI UI: EXAMPLE.COM

## 1. ATURAN EKSEKUSI AGENT (NEGATIVE CONSTRAINTS)
1. JANGAN mengimprovisasi warna gradien ungu-biru fantasi atau background glow.
2. Gunakan HANYA palet HEX dan ukuran tipografi yang didefinisikan dalam Global Design Tokens.
...

## 5. GLOBAL DESIGN TOKENS
### Palet Warna Utama
| HEX | Peran Dominan | Frekuensi Penggunaan |
|---|---|---|
| `#0F172A` | background | 45x |
| `#F8FAFC` | text | 120x |
| `#3B82F6` | accent | 14x |

## 6. SHARED LAYOUTS (KOMPONEN BERSAMA)
### Shared [HEADER]
- **<header id="site-header">** `{ display: flex; align-items: center; justify-content: space-between; height: 64px }`
...
```

---

## License

MIT License. See [LICENSE](LICENSE) for details.
