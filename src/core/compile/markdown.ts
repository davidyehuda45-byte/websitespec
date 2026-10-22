import type { ProjectBlueprint, LayoutNode } from '../../types/blueprint';
import { generateProjectFileTree } from './file-tree';
import { generateTailwindThemeConfig } from './tailwind-theme';
import { synthesizeComponentsFromBlueprint } from './prd-synthesizer';

function formatStyles(styles: Record<string, string>): string {
  const entries = Object.entries(styles);
  if (entries.length === 0) return '';
  return entries.map(([k, v]) => `${k}: ${v}`).join('; ');
}

function renderLayoutNodeToMarkdown(node: LayoutNode, indentLevel: number = 0): string {
  const indent = '  '.repeat(indentLevel);
  const hrefAttr = node.href ? ` href="${node.href}"` : '';
  const tagDesc = `<${node.tag}${node.id ? ` id="${node.id}"` : ''}${node.semanticClass ? ` class="${node.semanticClass}"` : ''}${hrefAttr}>`;
  const repeatDesc = node.repeatCount ? ` [REPEATS x${node.repeatCount}]` : '';

  let lines: string[] = [];
  const styleStr = formatStyles(node.styles);

  lines.push(`${indent}- **${tagDesc}**${repeatDesc}${styleStr ? ` \`{ ${styleStr} }\`` : ''}`);

  if (node.text) {
    const safeText = node.text.replace(/\n+/g, ' ');
    lines.push(`${indent}  Text: "${safeText}"`);
  }

  if (node.ariaLabel) {
    lines.push(`${indent}  Aria-Label: "${node.ariaLabel}"`);
  }

  if (node.placeholder) {
    lines.push(`${indent}  Placeholder: "${node.placeholder}"`);
  }

  if (node.assets) {
    if (node.assets.type === 'img') {
      lines.push(`${indent}  Asset (Image): src="${node.assets.src}" alt="${node.assets.alt || ''}" [${node.assets.dimensions?.width}x${node.assets.dimensions?.height}px]`);
    } else if (node.assets.type === 'svg') {
      lines.push(`${indent}  Asset (SVG): [${node.assets.dimensions?.width}x${node.assets.dimensions?.height}px]`);
    } else if (node.assets.type === 'icon') {
      lines.push(`${indent}  Asset (Icon Font): "${node.assets.alt}"`);
    } else if (node.assets.type === 'bg-image') {
      lines.push(`${indent}  Asset (BG): url="${node.assets.src}"`);
    }
  }

  // Render all children with 100% full fidelity
  for (const child of node.children || []) {
    lines.push(renderLayoutNodeToMarkdown(child, indentLevel + 1));
  }

  return lines.join('\n');
}

export function compileBlueprintToMarkdown(project: ProjectBlueprint): string {
  const primaryPage = project.pages[0];
  const domain = project.domain || 'localhost';
  const targetStackName = project.targetStack || 'Modern Frontend Framework';

  // Synthesize modular components
  const modularComponents = synthesizeComponentsFromBlueprint(project);
  const componentNames = modularComponents.map((c) => c.name);

  // Generate dynamic file tree and tailwind theme
  const fileTree = generateProjectFileTree(project, componentNames);
  const tailwindConfig = primaryPage ? generateTailwindThemeConfig(primaryPage.tokens) : '';

  return `# UI PRD & IMPLEMENTATION BLUEPRINT: ${domain.toUpperCase()}

> Dokumen Spesifikasi Kebutuhan Produk (PRD), Arsitektur Struktur File, Design Tokens, dan Scaffolding Kode Siap Pakai untuk AI Coding Agent (Cursor, Windsurf, Claude Code, Cline).

---

## 1. ATURAN EKSEKUSI AGENT (NEGATIVE CONSTRAINTS)

Harap patuhi aturan ketat di bawah ini saat membangun ulang antarmuka:
1. **Zero Hallucination**: JANGAN mengimprovisasi warna gradien ungu-biru fantasi, background glow/orbs, atau radius yang tidak tertera pada token.
2. **Strict Design System**: Gunakan HANYA palet HEX dan ukuran tipografi yang didefinisikan dalam Bagian 4 (Design System).
3. **Preserve Copywriting**: Pertahankan copywriting asli secara presisi. Jangan mengganti teks dengan placeholder "Lorem ipsum" atau sinonim generik.
4. **Modular Architecture**: Ikuti pohon struktur file pada Bagian 3 dan pisahkan komponen reusable sesuai Bagian 6.
5. **Exact Layout Geometry**: Gunakan flexbox/grid dan nilai gap/padding numerik sesuai spesifikasi layout tree.

---

## 2. PRD EXECUTIVE SUMMARY & SPESIFIKASI UMUM

- **Domain Referensi**: ${domain}
- **Jumlah Halaman**: ${project.pages.length}
- **Target Stack Tujuan**: **${targetStackName}**
- **Tanggal Ekstraksi**: ${project.createdAt}
- **Viewport Referensi**: ${primaryPage?.viewport ? `${primaryPage.viewport.width}x${primaryPage.viewport.height}px` : '1920x1080px'}

### Stack Terdeteksi di Halaman Referensi
${
  primaryPage?.detectedStack?.length
    ? primaryPage.detectedStack
        .map(
          (s) =>
            `- **${s.name}** [${s.category.toUpperCase()}] - Tingkat Keyakinan: ${s.confidence.toUpperCase()}\n  Bukti: ${s.evidence}`
        )
        .join('\n')
    : '- HTML5 / CSS Modern standar'
}

### Routing Map & Alur Navigasi
| No | Path URL | Judul Halaman | Tautan Internal Terdeteksi |
|---|---|---|---|
${project.pages
  .map(
    (p, idx) =>
      `| ${idx + 1} | \`${p.pathname}\` | ${p.title} | ${p.internalLinks.slice(0, 10).join(', ') || '-'} |`
  )
  .join('\n')}

---

## 3. ARSITEKTUR STRUKTUR FILE PROYEK (TARGET STACK)

Gunakan struktur direktori modular di bawah ini saat menyusun proyek di repo lokal Anda:

\`\`\`
${fileTree}
\`\`\`

---

## 4. DESIGN SYSTEM & KONFIGURASI TEMA TAILWIND

### Siap Pakai: \`tailwind.config.js\`
Salin konfigurasi ini langsung ke proyek target Anda:

\`\`\`javascript
${tailwindConfig}
\`\`\`

### Palet Warna Utama
| HEX | Peran Dominan | Frekuensi Penggunaan |
|---|---|---|
${
  primaryPage?.tokens.palette.length
    ? primaryPage.tokens.palette
        .map((c) => `| \`${c.hex}\` | ${c.role} | ${c.count}x |`)
        .join('\n')
    : '| `#FFFFFF` | text | Dasar |\n| `#121212` | background | Dasar |'
}

### Skala Tipografi
| Tag / Level | Font Family | Size | Weight | Line Height | Letter Spacing | Color |
|---|---|---|---|---|---|---|
${
  primaryPage?.tokens.typography.length
    ? primaryPage.tokens.typography
        .map(
          (t) =>
            `| ${t.tag} | ${t.fontFamily} | ${t.fontSize} | ${t.fontWeight} | ${t.lineHeight} | ${t.letterSpacing} | \`${t.color}\` |`
        )
        .join('\n')
    : '| body | sans-serif | 16px | 400 | normal | 0px | `#111827` |'
}

### Skala Spacing & Radius
- **Spacing**: ${primaryPage?.tokens.spacingScale.length ? primaryPage.tokens.spacingScale.map((s) => `\`${s}\``).join(', ') : '4px, 8px, 12px, 16px'}
- **Border Radius**: ${primaryPage?.tokens.radiusScale.length ? primaryPage.tokens.radiusScale.map((r) => `\`${r}\``).join(', ') : '4px, 8px, 22px'}
- **Box Shadow**: ${primaryPage?.tokens.shadowScale.length ? primaryPage.tokens.shadowScale.map((sh) => `\`${sh}\``).join('; ') : 'none'}

${
  Object.keys(primaryPage?.tokens.cssVariables || {}).length > 0
    ? `### CSS Custom Properties (:root)\n\`\`\`css\n:root {\n${Object.entries(primaryPage?.tokens.cssVariables || {})
        .slice(0, 40)
        .map(([k, v]) => `  ${k}: ${v};`)
        .join('\n')}\n}\n\`\`\`\n`
    : ''
}

---

## 5. SHARED LAYOUT ARCHITECTURE

Komponen layout bersama yang digunakan lintas rute:

${
  project.sharedLayouts.length > 0
    ? project.sharedLayouts
        .map(
          (sl) =>
            `### Shared [${sl.landmark.toUpperCase()}]\nDigunakan pada rute: ${sl.presentInPages.map((p) => `\`${p}\``).join(', ')}\n\n${renderLayoutNodeToMarkdown(sl.node, 0)}`
        )
        .join('\n\n---\n\n')
    : '_Tidak ada shared layout multi-halaman yang identik. Buat layout master sesuai Bagian 3._'
}

---

## 6. KATALOG KOMPONEN MODULAR & TEMPLATE KODE (SCAFFOLDING)

Komponen-komponen modular yang disintesis dari halaman aktif beserta template kodenya:

${modularComponents
  .map(
    (c, idx) => `### 6.${idx + 1} Komponen: \`<${c.name} />\`

- **Target File**: \`${c.targetFile}\`
- **Deskripsi**: ${c.description}
- **Spesifikasi Visual**:
  - Tata Letak: ${c.visualSpecs.layout}
  - Dimensi: ${c.visualSpecs.dimensions}
  - Warna: ${c.visualSpecs.colors}
  ${c.visualSpecs.borderRadius ? `- Radius: \`${c.visualSpecs.borderRadius}\`` : ''}
  ${c.visualSpecs.shadow ? `- Shadow: \`${c.visualSpecs.shadow}\`` : ''}
${c.copywriting.length > 0 ? `- **Copywriting Asli**: ${c.copywriting.map((txt) => `"${txt}"`).join(', ')}` : ''}
${c.attributes.placeholder ? `- **Input Placeholder**: "${c.attributes.placeholder}"` : ''}
${c.attributes.ariaLabel ? `- **Aria Label**: "${c.attributes.ariaLabel}"` : ''}
${c.attributes.href ? `- **Link Href**: \`${c.attributes.href}\`` : ''}

#### Scaffolding Kode Template:
\`\`\`tsx
${c.codeTemplate}
\`\`\`
`
  )
  .join('\n---\n\n')}

---

## 7. POHON STRUKTUR LAYOUT HALAMAN LENGKAP

Struktur DOM bersarang lengkap dengan seluruh style non-default:

${project.pages
  .map(
    (page, idx) => `### Halaman ${idx + 1}: ${page.title} (\`${page.pathname}\`)

- URL: ${page.url}
- Waktu Tangkap: ${page.capturedAt}

#### Hierarchy Node:
${renderLayoutNodeToMarkdown(page.layoutTree, 0)}
`
  )
  .join('\n\n---\n\n')}

---

## 8. DAFTAR ASET & IKON (ASSET REGISTRY)

| Tipe | Lokasi / Identifier | Dimensi Rendered | Keterangan / Alt |
|---|---|---|---|
${project.pages
  .flatMap((p) => {
    const assets: string[] = [];
    const traverse = (node: LayoutNode) => {
      if (node.assets) {
        if (node.assets.type === 'img') {
          assets.push(
            `| Image | \`${node.assets.src?.slice(0, 70)}...\` | ${node.assets.dimensions?.width}x${node.assets.dimensions?.height}px | ${node.assets.alt || '-'} |`
          );
        } else if (node.assets.type === 'svg') {
          assets.push(
            `| Inline SVG | Icon / Graphic | ${node.assets.dimensions?.width}x${node.assets.dimensions?.height}px | Vektor Inline |`
          );
        } else if (node.assets.type === 'icon') {
          assets.push(
            `| Icon Font | \`${node.assets.alt}\` | ${node.assets.dimensions?.width}x${node.assets.dimensions?.height}px | Kelas Ikon |`
          );
        }
      }
      (node.children || []).forEach(traverse);
    };
    traverse(p.layoutTree);
    return assets;
  })
  .slice(0, 60)
  .join('\n') || '| - | Tidak ada aset gambar eksternal | - | - |'}

---

## 9. RENCANA EKSEKUSI BERTAHAP UNTUK AI AGENT

Instruksi eksekusi untuk Cursor, Windsurf, atau Claude Code:
1. **Fase 1 (Design Tokens)**: Buka file konfigurasi tema (\`tailwind.config.js\` atau CSS variables) dan masukkan palet warna HEX, radius, dan font sesuai Bagian 4.
2. **Fase 2 (Shared Layout)**: Buat komponen layout master (\`AppLayout\` / \`app.blade.php\`) dan navigasi bersama sesuai Bagian 5.
3. **Fase 3 (Modular Components)**: Buat file komponen modular di folder target masing-masing sesuai Bagian 6 menggunakan template kode yang telah disediakan.
4. **Fase 4 (Page Assembly)**: Rakit halaman dan routing sesuai Bagian 2 dan Bagian 7. Hubungkan event handler atau dummy state.
5. **Fase 5 (Audit & Verifikasi)**: Jalankan checklist Bagian 10 untuk memastikan tidak ada warna atau teks yang melenceng.

---

## 10. CHECKLIST AUDIT & VERIFIKASI

Sebelum menganggap tugas selesai, pastikan checklist berikut terpenuhi:
- [ ] Semua token warna memakai kode HEX dari Bagian 4, bukan nilai tebakan.
- [ ] Seluruh file komponen dibuat sesuai struktur direktori pada Bagian 3.
- [ ] Komponen Header, Navigasi, dan Footer dipisah menjadi komponen bersama (Shared Layout).
- [ ] Route dan pathname cocok dengan Routing Map di Bagian 2.
- [ ] Seluruh copywriting menggunakan teks asli dari blueprint, bukan teks buatan.
- [ ] Tata letak (flex/grid, gap, padding, margin) sesuai dengan spesifikasi komponen.
`;
}
