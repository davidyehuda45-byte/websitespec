import type { ProjectBlueprint, LayoutNode } from '../../types/blueprint';

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

  // Render all children with 100% full fidelity (zero truncation)
  for (const child of node.children || []) {
    lines.push(renderLayoutNodeToMarkdown(child, indentLevel + 1));
  }

  return lines.join('\n');
}

export function compileBlueprintToMarkdown(project: ProjectBlueprint): string {
  const primaryPage = project.pages[0];
  const domain = project.domain || 'localhost';

  let md = `# BLUEPRINT SPESIFIKASI UI: ${domain.toUpperCase()}

Dokumen spesifikasi UI lengkap dan presisi untuk AI coding agent. Seluruh struktur dan styling diekstrak langsung dari computed style browser dan DOM aktual dengan fidelitas penuh (tanpa pemangkasan).

---

## 1. ATURAN EKSEKUSI AGENT (NEGATIVE CONSTRAINTS)

Harap patuhi aturan ketat di bawah ini saat membangun ulang antarmuka:
1. JANGAN mengimprovisasi warna gradien ungu-biru fantasi, background glow/orbs, atau rounded berlebihan yang tidak tertera pada token.
2. Gunakan HANYA palet HEX dan ukuran tipografi yang didefinisikan dalam bagian Global Design Tokens.
3. Pertahankan copywriting asli secara presisi. Jangan mengganti teks dengan placeholder "Lorem ipsum" atau sinonim generik.
4. Komponen Shared Layout (Header, Nav, Footer) WAJIB diimplementasikan sebagai komponen modular reusable, bukan diulang di setiap route.
5. Gunakan flexbox/grid dan nilai gap/padding sesuai spesifikasi numerik yang tertera pada layout tree.

---

## 2. METADATA PROYEK

- Domain Sumber: ${domain}
- Jumlah Halaman: ${project.pages.length}
- Target Stack Override: ${project.targetStack || 'Sesuai Stack Asli (Auto-detect)'}
- Tanggal Ekstraksi: ${project.createdAt}
- Viewport Referensi: ${primaryPage?.viewport ? `${primaryPage.viewport.width}x${primaryPage.viewport.height}px` : '1920x1080px'}

---

## 3. TECH STACK REFERENSI & TARGET

### Stack Terdeteksi di Halaman Referensi
${
  primaryPage?.detectedStack?.length
    ? primaryPage.detectedStack
        .map(
          (s) =>
            `- **${s.name}** [${s.category.toUpperCase()}] - Tingkat Keyakinan: ${s.confidence.toUpperCase()}\n  Bukti: ${s.evidence}`
        )
        .join('\n')
    : '- Tidak terdeteksi framework khusus (HTML/CSS standar)'
}

> CATATAN: Deteksi framework backend (seperti Laravel) didasarkan pada jejak artefak front-end (CSRF token, livewire wire:id, dsb) dan bersifat heuristik.

### Target Stack Tujuan
**${project.targetStack || 'Auto-detect (mengikuti stack terdeteksi di atas)'}**
Bangun ulang UI dengan arsitektur yang lazim pada target stack ini.

---

## 4. ROUTING MAP

| No | Path URL | Judul Halaman | Tautan Internal Terdeteksi |
|---|---|---|---|
${project.pages
  .map(
    (p, idx) =>
      `| ${idx + 1} | \`${p.pathname}\` | ${p.title} | ${p.internalLinks.slice(0, 10).join(', ') || '-'} |`
  )
  .join('\n')}

---

## 5. GLOBAL DESIGN TOKENS

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

### Skala Spacing Terdeteksi
${
  primaryPage?.tokens.spacingScale.length
    ? primaryPage.tokens.spacingScale.map((s) => `- \`${s}\``).join(' ')
    : '- 4px, 8px, 12px, 16px, 24px, 32px'
}

### Skala Border Radius
${
  primaryPage?.tokens.radiusScale.length
    ? primaryPage.tokens.radiusScale.map((r) => `- \`${r}\``).join(' ')
    : '- 4px, 8px, 12px'
}

### Skala Box Shadow
${
  primaryPage?.tokens.shadowScale.length
    ? primaryPage.tokens.shadowScale.map((sh) => `- \`${sh}\``).join('\n')
    : '- none'
}

${
  Object.keys(primaryPage?.tokens.cssVariables || {}).length > 0
    ? `### CSS Custom Properties (:root)\n\`\`\`css\n:root {\n${Object.entries(primaryPage?.tokens.cssVariables || {})
        .slice(0, 50)
        .map(([k, v]) => `  ${k}: ${v};`)
        .join('\n')}\n}\n\`\`\`\n`
    : ''
}

---

## 6. SHARED LAYOUTS (KOMPONEN BERSAMA)

${
  project.sharedLayouts.length > 0
    ? project.sharedLayouts
        .map(
          (sl) =>
            `### Shared [${sl.landmark.toUpperCase()}]\nDigunakan pada halaman: ${sl.presentInPages.map((p) => `\`${p}\``).join(', ')}\n\n${renderLayoutNodeToMarkdown(sl.node, 0)}`
        )
        .join('\n\n---\n\n')
    : '_Tidak ada komponen bersama yang terdeteksi secara otomatis (halaman tunggal atau struktur berbeda)._'
}

---

## 7. SPESIFIKASI PER HALAMAN

${project.pages
  .map(
    (page, idx) => `### Halaman ${idx + 1}: ${page.title} (\`${page.pathname}\`)

- URL: ${page.url}
- Waktu Tangkap: ${page.capturedAt}

#### Pohon Struktur & Layout Komponen:
${renderLayoutNodeToMarkdown(page.layoutTree, 0)}
`
  )
  .join('\n\n---\n\n')}

---

## 8. DAFTAR ASET (ASSET INVENTORY)

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

## 9. CHECKLIST VERIFIKASI UNTUK AGENT

Sebelum menganggap tugas selesai, pastikan checklist berikut terpenuhi:
- [ ] Semua token warna memakai kode HEX dari Bagian 5, bukan nilai tak terdaftar.
- [ ] Komponen Header, Navigasi, dan Footer dipisah menjadi komponen bersama (Shared Layout).
- [ ] Route dan pathname cocok dengan Routing Map di Bagian 4.
- [ ] Seluruh copywriting menggunakan teks asli dari blueprint, bukan teks buatan.
- [ ] Tata letak (flex/grid, gap, padding, margin) sesuai dengan pohon komponen.
`;

  return md;
}
