import type { ProjectBlueprint, LayoutNode } from '../../types/blueprint';
import { generateProjectFileTree } from './file-tree';
import { generateTailwindThemeConfig } from './tailwind-theme';
import {
  synthesizeUserPersonas,
  inferDataEntities,
  synthesizePageSpecs,
  synthesizeComponentContracts,
} from './prd-synthesizer';

export function resolveTargetStack(project: ProjectBlueprint): string {
  if (project.targetStack && !project.targetStack.toLowerCase().includes('auto-detect') && project.targetStack.trim() !== '') {
    return project.targetStack;
  }
  const detected = project.pages[0]?.detectedStack || [];
  const laravel = detected.find((s) => s.name.startsWith('Laravel'));
  const next = detected.find((s) => s.name === 'Next.js');
  const vue = detected.find((s) => s.name === 'Vue.js' || s.name === 'Nuxt.js');
  const svelte = detected.find((s) => s.name.includes('Svelte'));
  const react = detected.find((s) => s.name === 'React');
  const tailwind = detected.some((s) => s.name === 'Tailwind CSS');

  if (laravel) return `${laravel.name} + ${tailwind ? 'Tailwind CSS' : 'CSS'}`;
  if (next) return `Next.js 15 (App Router) + ${tailwind ? 'Tailwind CSS' : 'CSS'}`;
  if (vue) return `Vue 3 + Vite + ${tailwind ? 'Tailwind CSS' : 'CSS'}`;
  if (svelte) return `SvelteKit + ${tailwind ? 'Tailwind CSS' : 'CSS'}`;
  if (react) return `React + Vite + ${tailwind ? 'Tailwind CSS' : 'CSS'}`;

  return tailwind ? 'HTML5 + Tailwind CSS' : 'HTML5 + CSS Murni';
}

function synthesizeProductOverview(project: ProjectBlueprint): {
  problemStatement: string;
  valuePropositions: string[];
  inScopeFeatures: string[];
  nonGoals: string[];
} {
  const primaryTitle = project.pages[0]?.title || project.domain;
  const cleanTitle = primaryTitle.split(/[-—|]/)[0]?.trim() || primaryTitle;
  const allHeadings: string[] = [];
  const allButtons: string[] = [];

  project.pages.forEach((p) => {
    const walk = (n: LayoutNode) => {
      if ((n.tag === 'h1' || n.tag === 'h2') && n.text && n.text.length < 80) {
        allHeadings.push(n.text.trim());
      }
      if ((n.tag === 'button' || n.tag === 'a') && n.text && n.text.length < 40) {
        allButtons.push(n.text.trim());
      }
      (n.children || []).forEach(walk);
    };
    walk(p.layoutTree);
  });

  const valuePropositions: string[] = [];
  if (allHeadings.length > 0) {
    valuePropositions.push(`**Penyajian Layanan & Informasi**: Mempublikasikan "${allHeadings[0]}" secara terstruktur dan mudah diakses.`);
  }
  if (project.pages.some((p) => p.pathname.includes('login') || p.pathname.includes('auth'))) {
    valuePropositions.push('**Otentikasi & Gerbang Akses**: Membatasi akses area terproteksi sesuai dengan peran pengguna yang sah.');
  }
  if (allButtons.length > 0) {
    valuePropositions.push(`**Alur Kerja Digital Cepat**: Menyediakan tombol aksi langsung (${allButtons.slice(0, 3).map((b) => `"${b}"`).join(', ')}) untuk mempercepat konversi pengguna.`);
  }
  if (valuePropositions.length === 0) {
    valuePropositions.push(`**Pengalaman Pengguna Responsif**: Menjamin konsistensi visual dan kemudahan navigasi pada domain ${cleanTitle}.`);
  }

  const inScopeFeatures = project.pages.map((p) => {
    const shortTitle = p.title ? p.title.split(/[-—|]/)[0]?.trim() : p.pathname;
    return `Rute \`${p.pathname}\`: Penyajian dan interaksi ${shortTitle}`;
  });

  return {
    problemStatement: `Antarmuka web untuk domain ${project.domain} dibangun untuk memfasilitasi kebutuhan pengguna terkait "${cleanTitle}", menyatukan alur navigasi, dan menyajikan informasi secara terorganisir.`,
    valuePropositions,
    inScopeFeatures,
    nonGoals: [
      'Fitur dan endpoint di luar daftar rute yang teranalisis pada blueprint ini.',
      'Modifikasi skema warna atau tipografi di luar token sistem desain resmi.',
    ],
  };
}

export function compileBlueprintToMarkdown(project: ProjectBlueprint): string {
  const primaryPage = project.pages[0];
  const domain = project.domain || 'localhost';
  const targetStackName = resolveTargetStack(project);

  // Synthesize PRD Artifacts
  const personas = synthesizeUserPersonas(project);
  const dataEntities = inferDataEntities(project);
  const pageSpecs = synthesizePageSpecs(project);
  const componentContracts = synthesizeComponentContracts(project);
  const componentNames = componentContracts.map((c) => c.name);
  const overview = synthesizeProductOverview(project);

  // Dynamic file tree and tailwind theme
  const fileTree = generateProjectFileTree(project, componentNames, targetStackName);
  const tailwindConfig = primaryPage ? generateTailwindThemeConfig(primaryPage.tokens) : '';

  // Generate Mermaid User Flow
  const mermaidLines = ['flowchart TD'];
  mermaidLines.push('  Landing["/ (Beranda Publik)"]');
  project.pages.forEach((p) => {
    if (p.pathname === '/' || p.pathname === '') return;
    const cleanId = p.pathname.replace(/[^a-zA-Z0-9]/g, '_');
    const label = p.title ? p.title.split('—')[0]?.trim() || p.pathname : p.pathname;
    mermaidLines.push(`  Node${cleanId}["${p.pathname}<br/>(${label})"]`);
    mermaidLines.push(`  Landing -->|Akses Navigasi| Node${cleanId}`);
    mermaidLines.push(`  Node${cleanId} -.->|Kembali ke Beranda| Landing`);
  });
  const mermaidDiagram = mermaidLines.join('\n');

  return `# PRODUCT REQUIREMENTS DOCUMENT (PRD) & UI BLUEPRINT
# SISTEM: ${domain.toUpperCase()}

> Dokumen Spesifikasi Kebutuhan Produk (PRD), Arsitektur Sistem, Model Data, dan Desain Terukur untuk AI Coding Agent (Cursor, Windsurf, Claude Code, Cline). Dihasilkan secara dinamis dari DOM aktual halaman.

---

## 1. ATURAN EKSEKUSI AGENT (NEGATIVE CONSTRAINTS)

Harap patuhi aturan ketat di bawah ini saat membangun ulang antarmuka:
1. **Zero Hallucination**: JANGAN mengimprovisasi warna gradien ungu-biru fantasi, background glow/orbs, atau radius yang tidak tertera pada token.
2. **Strict Design System**: Gunakan HANYA palet HEX dan ukuran tipografi yang didefinisikan dalam Bagian 9 (Design System).
3. **Preserve Copywriting**: Pertahankan copywriting asli secara presisi. Jangan mengganti teks dengan placeholder "Lorem ipsum" atau sinonim generik.
4. **Clean Component Architecture**: Ikuti pohon struktur file pada Bagian 8 dan pisahkan komponen reusable sesuai Bagian 7.
5. **No Fake Scaffolding**: Tulis kode implementasi fungsional penuh berdasarkan spesifikasi props dan acceptance criteria di dokumen ini.

---

## 2. PRD EXECUTIVE SUMMARY & PRODUCT SCOPE

### 2.1 Ringkasan Produk
- **Domain Sumber**: \`${domain}\`
- **Jumlah Halaman Teranalisis**: ${project.pages.length} Halaman
- **Target Stack Tujuan**: **${targetStackName}**
- **Tanggal Ekstraksi**: ${project.createdAt}
- **Viewport Acuan**: ${primaryPage?.viewport ? `${primaryPage.viewport.width}x${primaryPage.viewport.height}px` : '1920x1080px'}

### 2.2 Problem Statement & Value Proposition
${overview.problemStatement}

**Nilai Utama Platform (Value Propositions)**:
${overview.valuePropositions.map((vp) => `- ${vp}`).join('\n')}

### 2.3 Cakupan Fitur (In-Scope vs Non-Goals)
- **In-Scope**:
${overview.inScopeFeatures.map((f) => `  - ${f}`).join('\n')}
- **Non-Goals**:
${overview.nonGoals.map((ng) => `  - ${ng}`).join('\n')}

---

## 3. USER PERSONAS & ROLE-BASED ACCESS CONTROL (RBAC)

Matriks peran dan tanggung jawab pengguna dalam sistem:

${personas
  .map(
    (persona, idx) => `### 3.${idx + 1} Persona: ${persona.title} (\`${persona.role}\`)
- **Deskripsi**: ${persona.description}
- **Akses Rute Halaman**: ${persona.accessRoutes.map((r) => `\`${r}\``).join(', ')}
- **Tindakan Kunci (Key Actions)**:
${persona.keyActions.map((act) => `  - ${act}`).join('\n')}
`
  )
  .join('\n---\n\n')}

---

## 4. USER FLOWS & NAVIGATION ARCHITECTURE

### 4.1 Routing Map Antar Halaman
| No | Path URL | Judul Halaman | Akses Peran | Tautan Navigasi Terdeteksi |
|---|---|---|---|---|
${project.pages
  .map((p, idx) => {
    let role = 'Publik';
    if (p.pathname.includes('siswa')) role = 'Siswa';
    else if (p.pathname.includes('pembina') || p.pathname.includes('wali')) role = 'Pembina / Wali Kelas';
    else if (p.pathname.includes('admin')) role = 'Administrator';
    return `| ${idx + 1} | \`${p.pathname}\` | ${p.title} | ${role} | ${p.internalLinks.slice(0, 6).map((l) => `\`${l}\``).join(', ') || '-'} |`;
  })
  .join('\n')}

### 4.2 Diagram Alur Pengguna (User Flow)
\`\`\`mermaid
${mermaidDiagram}
\`\`\`

---

## 5. SPESIFIKASI FUNGSIONAL PER HALAMAN & ACCEPTANCE CRITERIA

${pageSpecs
  .map(
    (spec, idx) => `### 5.${idx + 1} Halaman: ${spec.title} (\`${spec.pathname}\`)

**Ringkasan**: ${spec.overview}

#### Kebutuhan Fungsional (Functional Requirements):
${spec.requirements
  .map(
    (req) => `- **[${req.id}] ${req.title}**:
  ${req.description}
  *Aturan Bisnis*:
${req.rules.map((rule) => `  - ${rule}`).join('\n')}`
  )
  .join('\n\n')}

#### Kriteria Penerimaan (Acceptance Criteria - Gherkin):
${spec.acceptanceCriteria
  .map(
    (ac, acIdx) => `**Skenario ${acIdx + 1}: ${ac.scenario}**
- **Given** ${ac.given}
- **When** ${ac.when}
- **Then** ${ac.then}
`
  )
  .join('\n')}
`
  )
  .join('\n---\n\n')}

---

## 6. INFERRED BUSINESS DATA ENTITIES & SCHEMAS

Struktur entitas data bisnis yang disintesis dari formulir, placeholder, dan elemen kartu pada antarmuka:

${dataEntities
  .map(
    (entity, idx) => `### 6.${idx + 1} Entitas: \`${entity.name}\`
${entity.description}

| Nama Field | Tipe Data | Keterangan | Contoh Nilai |
|---|---|---|---|
${entity.fields.map((f) => `| \`${f.name}\` | \`${f.type}\` | ${f.description} | ${f.example ? `\`${f.example}\`` : '-'} |`).join('\n')}
`
  )
  .join('\n---\n\n')}

---

## 7. SPESIFIKASI ARSITEKTUR KOMPONEN MODULAR

Spesifikasi antarmuka komponen yang dapat digunakan ulang (reusable UI components) beserta kontrak props dan state:

${componentContracts
  .map(
    (comp, idx) => `### 7.${idx + 1} Komponen: \`<${comp.name} />\`

- **Target File**: \`${comp.targetFile}\`
- **Fungsi**: ${comp.description}
- **Spesifikasi Visual**:
  - Layout: ${comp.visualSpecs.layout}
  - Dimensi: ${comp.visualSpecs.dimensions}
  - Warna: ${comp.visualSpecs.colors}
  ${comp.visualSpecs.borderRadius ? `- Border Radius: \`${comp.visualSpecs.borderRadius}\`` : ''}
  ${comp.visualSpecs.shadow ? `- Box Shadow: \`${comp.visualSpecs.shadow}\`` : ''}

#### Kontrak Props:
| Nama Prop | Tipe Data | Wajib / Opsional | Keterangan |
|---|---|---|---|
${comp.props.map((p) => `| \`${p.name}\` | \`${p.type}\` | ${p.optional ? 'Opsional' : '**Wajib**'} | ${p.description} |`).join('\n')}

- **State UI yang Didukung**: ${comp.states.map((s) => `\`${s}\``).join(', ')}
- **Event Handlers**: ${comp.events.map((e) => `\`${e}\``).join(', ')}
${comp.copywriting.length > 0 ? `- **Copywriting Kunci**: ${comp.copywriting.map((txt) => `"${txt}"`).join(', ')}` : ''}
`
  )
  .join('\n---\n\n')}

---

## 8. ARSITEKTUR STRUKTUR FILE PROYEK (TARGET STACK)

Struktur direktori modular siap pakai untuk target stack **${targetStackName}**:

\`\`\`
${fileTree}
\`\`\`

---

## 9. DESIGN SYSTEM TOKENS & KONFIGURASI TEMA TAILWIND

### 9.1 Konfigurasi Tema: \`tailwind.config.js\`
Salin konfigurasi ini langsung ke proyek target Anda:

\`\`\`javascript
${tailwindConfig}
\`\`\`

### 9.2 Palet Warna Utama (HEX Palette)
| HEX | Peran Dominan | Frekuensi Kemunculan |
|---|---|---|
${
  primaryPage?.tokens.palette.length
    ? primaryPage.tokens.palette
        .map((c) => `| \`${c.hex}\` | ${c.role} | ${c.count}x |`)
        .join('\n')
    : '| `#FFFFFF` | text | Dasar |\n| `#121212` | background | Dasar |'
}

### 9.3 Skala Tipografi
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

### 9.4 Skala Spacing & Radius
- **Spacing**: ${primaryPage?.tokens.spacingScale.length ? primaryPage.tokens.spacingScale.map((s) => `\`${s}\``).join(', ') : '4px, 8px, 12px, 16px'}
- **Border Radius**: ${primaryPage?.tokens.radiusScale.length ? primaryPage.tokens.radiusScale.map((r) => `\`${r}\``).join(', ') : '4px, 8px, 22px'}
- **Box Shadow**: ${primaryPage?.tokens.shadowScale.length ? primaryPage.tokens.shadowScale.map((sh) => `\`${sh}\``).join('; ') : 'none'}

${
  Object.keys(primaryPage?.tokens.cssVariables || {}).length > 0
    ? `### 9.5 CSS Custom Properties (:root)\n\`\`\`css\n:root {\n${Object.entries(primaryPage?.tokens.cssVariables || {})
        .slice(0, 40)
        .map(([k, v]) => `  ${k}: ${v};`)
        .join('\n')}\n}\n\`\`\`\n`
    : ''
}

---

## 10. CHECKLIST AUDIT & QUALITY ASSURANCE

Sebelum menganggap implementasi selesai, pastikan checklist pengujian ini terpenuhi:
- [ ] Seluruh warna antarmuka menggunakan kode HEX dari Bagian 9, bukan warna improvisasi.
- [ ] Arsitektur file dan komponen disusun sesuai pohon direktori Bagian 8.
- [ ] Seluruh skenario Acceptance Criteria (Given-When-Then) pada Bagian 5 telah diuji dan lolos.
- [ ] Skema model data pada Bagian 6 diimplementasikan dengan validasi form yang sesuai.
- [ ] Copywriting teks, label tombol, dan placeholder persis sesuai dokumen PRD.
- [ ] Tata letak responsif (desktop, tablet, mobile) mempertahankan hierarki visual yang seimbang.
`;
}
