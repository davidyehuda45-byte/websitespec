import type { LayoutNode, ProjectBlueprint } from '../../types/blueprint';

export interface UserPersona {
  role: string;
  title: string;
  description: string;
  accessRoutes: string[];
  keyActions: string[];
}

export interface DataField {
  name: string;
  type: string;
  description: string;
  example?: string;
}

export interface DataEntity {
  name: string;
  description: string;
  fields: DataField[];
}

export interface FunctionalRequirement {
  id: string;
  title: string;
  description: string;
  rules: string[];
}

export interface AcceptanceCriterion {
  scenario: string;
  given: string;
  when: string;
  then: string;
}

export interface PageFunctionalSpec {
  pathname: string;
  title: string;
  overview: string;
  requirements: FunctionalRequirement[];
  acceptanceCriteria: AcceptanceCriterion[];
}

export interface ComponentProp {
  name: string;
  type: string;
  optional: boolean;
  description: string;
}

export interface ComponentContract {
  name: string;
  targetFile: string;
  description: string;
  props: ComponentProp[];
  visualSpecs: {
    layout: string;
    dimensions: string;
    colors: string;
    borderRadius?: string;
    shadow?: string;
  };
  copywriting: string[];
  states: string[];
  events: string[];
}

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[a-z]/, (chr) => chr.toUpperCase())
    .replace(/^(V|Stel|El)([A-Z])/, '$2');
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Universal Dynamic User Persona Miner
 * Dynamically detects user roles and personas from route segments, authentication links, and button copywriting.
 */
export function synthesizeUserPersonas(project: ProjectBlueprint): UserPersona[] {
  const personas: UserPersona[] = [];
  const seenRoles = new Set<string>();

  // Collect all pathnames and interactive texts across all pages
  const paths = project.pages.map((p) => p.pathname);
  const buttonAndLinkTexts: string[] = [];

  const collectTexts = (n: LayoutNode) => {
    if ((n.tag === 'button' || n.tag === 'a') && n.text) {
      buttonAndLinkTexts.push(n.text.trim());
    }
    if ((n.tag === 'h1' || n.tag === 'h2') && n.text) {
      buttonAndLinkTexts.push(n.text.trim());
    }
    (n.children || []).forEach(collectTexts);
  };
  project.pages.forEach((p) => collectTexts(p.layoutTree));

  const allInteractions = buttonAndLinkTexts.join(' ').toLowerCase();

  // Helper to add role
  const addRole = (roleKey: string, title: string, desc: string, pathPredicate: (path: string) => boolean, actions: string[]) => {
    if (!seenRoles.has(roleKey)) {
      seenRoles.add(roleKey);
      const matchedRoutes = paths.filter(pathPredicate);
      personas.push({
        role: roleKey,
        title,
        description: desc,
        accessRoutes: matchedRoutes.length > 0 ? matchedRoutes : ['/'],
        keyActions: actions,
      });
    }
  };

  // 1. Role Detection from Route Segments
  paths.forEach((p) => {
    const lower = p.toLowerCase();
    const segments = lower.split('/').filter(Boolean);

    segments.forEach((seg) => {
      if (['admin', 'administrator', 'operator', 'backend'].includes(seg)) {
        addRole(
          'Administrator',
          'Administrator Sistem',
          'Pengguna dengan hak akses tertinggi untuk konfigurasi sistem, master data, dan pemantauan menyeluruh.',
          (path) => path.toLowerCase().includes('admin'),
          ['Mengelola konfigurasi sistem & master data', 'Audit keamanan dan laporan analitik', 'Manajemen hak akses pengguna']
        );
      } else if (['staff', 'pembina', 'guru', 'teacher', 'manager', 'editor', 'wali'].includes(seg)) {
        addRole(
          toPascalCase(seg),
          `Staf / ${toPascalCase(seg)}`,
          `Pengguna internal pengelola operasional harian dan data yang relevan dengan tanggung jawabnya.`,
          (path) => path.toLowerCase().includes(seg),
          ['Autentikasi akun staf terotorisasi', 'Pengelolaan data operasional', 'Pencatatan aktivitas dan pelaporan berkala']
        );
      } else if (['siswa', 'student', 'member', 'buyer', 'client', 'customer', 'patient', 'user'].includes(seg)) {
        addRole(
          toPascalCase(seg),
          `Pengguna / ${toPascalCase(seg)}`,
          `Pengguna utama sistem yang memanfaatkan layanan inti secara mandiri.`,
          (path) => path.toLowerCase().includes(seg) || path === '/',
          ['Mengakses layanan utama pada portal', 'Melakukan pendaftaran / transaksi / aktivitas inti', 'Memantau status dan riwayat interaksi']
        );
      }
    });
  });

  // 2. Role Detection from Copywriting Clues (e.g. "Portal Siswa", "Portal Pembina", "Login Admin")
  buttonAndLinkTexts.forEach((text) => {
    const match = text.match(/(?:portal|masuk sebagai|login)\s+([A-Za-z0-9\s/]+)/i);
    if (match && match[1]) {
      const rawRole = match[1].trim().split(/\s+/).slice(0, 3).join(' ');
      if (rawRole.length >= 3 && !seenRoles.has(rawRole.toLowerCase())) {
        seenRoles.add(rawRole.toLowerCase());
        personas.push({
          role: toPascalCase(rawRole),
          title: `Pengguna: ${rawRole}`,
          description: `Peran pengguna terdeteksi langsung dari antarmuka "${text}".`,
          accessRoutes: paths.filter((p) => p.toLowerCase().includes(rawRole.toLowerCase().split('/')[0]?.trim() || 'never')),
          keyActions: [`Navigasi ke area ${rawRole}`, `Interaksi fungsional sesuai peran`],
        });
      }
    }
  });

  // 3. Fallback: Standard Public Visitor & Authenticated Member if no specific roles
  if (personas.length === 0) {
    personas.push({
      role: 'Pengunjung Publik',
      title: 'Pengunjung / Tamu (Guest/Visitor)',
      description: 'Pengguna umum yang mengakses antarmuka publik untuk menjelajahi konten, informasi, dan fitur umum.',
      accessRoutes: paths.filter((p) => !p.includes('admin') && !p.includes('dashboard')),
      keyActions: ['Menjelajah halaman publik dan informasi', 'Melihat etalase/katalog layanan', 'Menuju halaman pendaftaran/kontak'],
    });

    if (paths.some((p) => p.includes('login') || p.includes('auth') || p.includes('sign') || allInteractions.includes('login'))) {
      personas.push({
        role: 'Pengguna Terdaftar',
        title: 'Pengguna Terdaftar / Member',
        description: 'Pengguna yang telah memiliki akun resmi untuk mengakses portal dan fitur terproteksi.',
        accessRoutes: paths,
        keyActions: ['Login menggunakan kredensial akun', 'Mengakses fitur personal atau dashboard'],
      });
    }
  }

  return personas;
}

/**
 * Universal Dynamic Entity Inference Engine
 * Mines data entities purely from actual forms, inputs, and repeating card grids in the DOM.
 */
export function inferDataEntities(project: ProjectBlueprint): DataEntity[] {
  const entities: DataEntity[] = [];
  const seenEntityNames = new Set<string>();

  // A. Mine Entities from Forms (Input Elements)
  const forms: Array<{ formId: string; inputs: Array<{ name: string; type: string; placeholder?: string }> }> = [];

  const scanForms = (node: LayoutNode) => {
    if (node.tag === 'form' || node.id === 'loginForm' || (node.semanticClass || '').includes('form')) {
      const formInputs: Array<{ name: string; type: string; placeholder?: string }> = [];
      const collectInputs = (sub: LayoutNode) => {
        if (sub.tag === 'input' || sub.tag === 'textarea' || sub.tag === 'select') {
          const inputName = sub.id || (sub.placeholder ? sub.placeholder.split(' ')[0] : '') || 'field';
          formInputs.push({
            name: inputName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase(),
            type: inputName.includes('password') ? 'string (password)' : 'string',
            placeholder: sub.placeholder,
          });
        }
        (sub.children || []).forEach(collectInputs);
      };
      collectInputs(node);

      if (formInputs.length > 0) {
        forms.push({
          formId: node.id || 'FormInput',
          inputs: formInputs,
        });
      }
    }
    (node.children || []).forEach(scanForms);
  };
  project.pages.forEach((p) => scanForms(p.layoutTree));

  forms.forEach((form) => {
    const entityName = toPascalCase(form.formId.replace(/form$/i, '')) || 'DataFormulir';
    if (!seenEntityNames.has(entityName)) {
      seenEntityNames.add(entityName);
      entities.push({
        name: entityName,
        description: `Entitas transaksi/autentikasi yang disintesis dari formulir #${form.formId}.`,
        fields: form.inputs.map((inp) => ({
          name: inp.name,
          type: inp.type,
          description: `Input formulir: ${inp.name}`,
          example: inp.placeholder || undefined,
        })),
      });
    }
  });

  // B. Mine Entities from Repeating Card Grids (Lists, Catalogs, Product Cards)
  project.pages.forEach((page) => {
    const scanCards = (node: LayoutNode, inheritedHeading: string = '') => {
      // Find heading in this node or its immediate children
      let heading = inheritedHeading;
      if ((node.tag === 'h1' || node.tag === 'h2' || node.tag === 'h3') && node.text && node.text.length < 80) {
        heading = node.text.trim();
      } else {
        const directHeading = (node.children || []).find(
          (c) => (c.tag === 'h1' || c.tag === 'h2' || c.tag === 'h3') && c.text && c.text.length < 80
        );
        if (directHeading && directHeading.text) {
          heading = directHeading.text.trim();
        }
      }

      // Check if this node contains repeating card-like children (2+ items)
      const cardCandidates = (node.children || []).filter(
        (c) => c.tag === 'div' || c.tag === 'article' || c.tag === 'li' || c.tag === 'section'
      );

      const hasRepeatingCards =
        cardCandidates.length >= 2 &&
        cardCandidates.every((c) => (c.children || []).length > 0 || c.text);

      if (hasRepeatingCards && heading) {
        const cleanName = heading
          .replace(/^(Katalog|Daftar|List|Semua|Tabel|Data|Koleksi|Rekomendasi|Popular|Featured)\s+/i, '')
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .trim();
        const entityName = toPascalCase(cleanName);

        if (entityName.length >= 3 && !seenEntityNames.has(entityName)) {
          seenEntityNames.add(entityName);

          const sampleCard = cardCandidates[0]!;
          const cardTexts: string[] = [];
          let cardTitle = '';
          let badgeText = '';

          const inspectCard = (cn: LayoutNode) => {
            if ((cn.tag === 'h3' || cn.tag === 'h4' || cn.tag === 'h2') && !cardTitle && cn.text) {
              cardTitle = cn.text.trim();
            }
            if (
              (cn.styles['border-radius']?.includes('9999px') || cn.styles['border-radius']?.includes('50%')) &&
              cn.text &&
              !badgeText
            ) {
              badgeText = cn.text.trim();
            }
            if (cn.text && cn.text.length < 60) {
              cardTexts.push(cn.text.trim());
            }
            (cn.children || []).forEach(inspectCard);
          };
          inspectCard(sampleCard);

          const fields: DataField[] = [
            { name: 'id', type: 'string (UUID / Slug)', description: 'Identifier unik entitas' },
            { name: 'nama', type: 'string', description: 'Nama atau judul utama item', example: cardTitle || 'Item' },
          ];

          if (badgeText) {
            fields.push({
              name: 'status',
              type: 'string / enum',
              description: 'Status atau badge penanda item',
              example: badgeText,
            });
          }

          // Search for key-value labels (e.g. "Pembina: ...", "Harga: ...", "Lokasi: ...")
          cardTexts.forEach((txt) => {
            const kvMatch = txt.match(/^([A-Za-z0-9\s]{2,15}):\s*(.+)$/);
            if (kvMatch && kvMatch[1] && kvMatch[2]) {
              const keyName = kvMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
              if (!fields.some((f) => f.name === keyName)) {
                fields.push({
                  name: keyName,
                  type: 'string',
                  description: `Atribut ${kvMatch[1].trim()}`,
                  example: kvMatch[2].trim(),
                });
              }
            }
          });

          entities.push({
            name: entityName,
            description: `Entitas data yang disintesis dari section berulang "${heading}".`,
            fields,
          });
        }
      }

      (node.children || []).forEach((c) => scanCards(c, heading));
    };

    scanCards(page.layoutTree);
  });

  // Fallback: If no forms or grids, create generic model based on primary title
  if (entities.length === 0) {
    const cleanTitle = (project.pages[0]?.title || 'System').split(/[-—|]/)[0]?.trim() || 'Item';
    entities.push({
      name: toPascalCase(cleanTitle) || 'DataModel',
      description: `Model data entitas utama yang disintesis dari halaman ${cleanTitle}.`,
      fields: [
        { name: 'id', type: 'string (UUID)', description: 'Identifier unik data' },
        { name: 'title', type: 'string', description: 'Judul atau entri utama', example: cleanTitle },
        { name: 'createdAt', type: 'timestamp', description: 'Waktu pembuatan entri data' },
      ],
    });
  }

  return entities.slice(0, 6);
}

/**
 * Universal Dynamic Page Functional Specs
 * Derives functional requirements and acceptance criteria directly from actual buttons, inputs, and sections.
 */
export function synthesizePageSpecs(project: ProjectBlueprint): PageFunctionalSpec[] {
  return project.pages.map((page, idx) => {
    const requirements: FunctionalRequirement[] = [];
    const acceptanceCriteria: AcceptanceCriterion[] = [];

    // Collect interactive elements on this page
    const buttons: string[] = [];
    const forms: string[] = [];
    const headings: string[] = [];

    const walk = (n: LayoutNode) => {
      if (n.tag === 'button' || n.tag === 'a') {
        if (n.text && n.text.length < 50 && !buttons.includes(n.text.trim())) {
          buttons.push(n.text.trim());
        }
      }
      if (n.tag === 'form' || n.id?.toLowerCase().includes('form')) {
        forms.push(n.id || 'form');
      }
      if ((n.tag === 'h1' || n.tag === 'h2') && n.text && n.text.length < 80) {
        headings.push(n.text.trim());
      }
      (n.children || []).forEach(walk);
    };
    walk(page.layoutTree);

    // 1. Navigation / Hero Requirement
    if (headings.length > 0) {
      requirements.push({
        id: `FR-${idx + 1}.1`,
        title: `Penyajian Konten Utama: ${headings[0]}`,
        description: `Menyajikan antarmuka utama halaman dengan copywriting dan tata letak terstruktur.`,
        rules: [
          `Menampilkan judul utama "${headings[0]}" dengan hierarki visual yang jelas`,
          buttons.length > 0 ? `Menyediakan tombol aksi: ${buttons.slice(0, 3).map((b) => `"${b}"`).join(', ')}` : 'Mempertahankan navigasi halaman',
        ],
      });
    }

    // 2. Form Requirement (if forms or inputs exist)
    if (forms.length > 0 || page.pathname.includes('login') || page.pathname.includes('auth')) {
      requirements.push({
        id: `FR-${idx + 1}.2`,
        title: `Formulir Masukan & Validasi Data`,
        description: `Menangani input data pengguna dengan validasi format dan umpan balik kesalahan.`,
        rules: [
          'Memvalidasi seluruh field input yang wajib diisi sebelum pengiriman',
          'Memberikan respon visual saat status proses (loading) maupun gagal (error)',
        ],
      });

      acceptanceCriteria.push({
        scenario: 'Pengiriman formulir dengan data yang valid',
        given: `Pengguna berada pada halaman ${page.pathname}`,
        when: 'Pengguna mengisi data yang sah dan menekan tombol konfirmasi',
        then: 'Sistem memproses input dan memberikan konfirmasi keberhasilan',
      });

      acceptanceCriteria.push({
        scenario: 'Penanganan validasi data kosong atau tidak sesuai format',
        given: 'Formulir berada dalam keadaan kosong atau format tidak tepat',
        when: 'Pengguna menekan tombol pengiriman',
        then: 'Sistem menampilkan pesan peringatan validasi pada field yang bermasalah',
      });
    }

    // 3. Action Buttons & Navigation Criteria
    if (buttons.length > 0) {
      const primaryBtn = buttons[0];
      acceptanceCriteria.push({
        scenario: `Interaksi pada tombol "${primaryBtn}"`,
        given: `Halaman ${page.title || page.pathname} berhasil dimuat sempurna`,
        when: `Pengguna mengklik tombol "${primaryBtn}"`,
        then: 'Sistem mengeksekusi aksi navigasi atau pemrosesan sesuai target tujuan',
      });
    }

    // Default fallback criterion if none created
    if (acceptanceCriteria.length === 0) {
      acceptanceCriteria.push({
        scenario: 'Pemuatan halaman sukses',
        given: `Pengguna membuka URL ${page.pathname}`,
        when: 'Halaman diakses di browser',
        then: 'Semua komponen dan tata letak tampil sesuai spesifikasi PRD',
      });
    }

    return {
      pathname: page.pathname,
      title: page.title || 'Untitled Page',
      overview: `Halaman ${page.title} (${page.pathname}) menangani fungsi ${headings.length > 0 ? headings[0] : 'presentasi antarmuka dan interaksi pengguna'}.`,
      requirements,
      acceptanceCriteria,
    };
  });
}

/**
 * Universal Dynamic Component Architecture Contracts
 * Synthesizes reusable component specifications without fake scaffolding dumps.
 */
export function synthesizeComponentContracts(project: ProjectBlueprint): ComponentContract[] {
  const contracts: ComponentContract[] = [];
  const seen = new Set<string>();

  const stack = (project.targetStack || '').toLowerCase();
  const isBlade = stack.includes('laravel') || stack.includes('blade');
  const isVue = stack.includes('vue') || stack.includes('nuxt');
  const ext = isBlade ? '.blade.php' : isVue ? '.vue' : '.tsx';
  const folder = isBlade ? 'resources/views/components/' : isVue ? 'src/components/' : 'components/ui/';

  const walk = (node: LayoutNode) => {
    const isLandmark = ['header', 'footer', 'nav', 'main', 'aside'].includes(node.tag);
    const hasSection = Boolean(node.tag === 'section' || node.tag === 'form' || (node.id && node.id.length > 2 && !node.id.startsWith('__')));

    if (isLandmark || hasSection) {
      let name = '';
      if (node.tag === 'header') name = 'Navbar';
      else if (node.tag === 'footer') name = 'Footer';
      else if (node.tag === 'main') name = 'MainContent';
      else if (node.tag === 'form' || (node.id || '').toLowerCase().includes('form')) name = 'InputForm';
      else if (node.id) name = toPascalCase(node.id);
      else name = `${toPascalCase(node.tag)}Section`;

      if (!seen.has(name) && name.length >= 3) {
        seen.add(name);

        const texts: string[] = [];
        const collect = (n: LayoutNode) => {
          if (n.text && n.text.length < 80 && !n.text.startsWith('[')) texts.push(n.text.trim());
          (n.children || []).forEach(collect);
        };
        collect(node);

        const props: ComponentProp[] = [];
        if (name.includes('Form')) {
          props.push({ name: 'onSubmit', type: '(data: any) => Promise<void>', optional: false, description: 'Callback pengiriman form' });
          props.push({ name: 'loading', type: 'boolean', optional: true, description: 'Status indikator proses submit' });
        } else {
          props.push({ name: 'className', type: 'string', optional: true, description: 'Utility class styling tambahan' });
          props.push({ name: 'children', type: 'React.ReactNode', optional: true, description: 'Komponen anak bersarang' });
        }

        contracts.push({
          name,
          targetFile: `${folder}${isBlade ? toKebabCase(name) : name}${ext}`,
          description: `Komponen arsitektural untuk mengelola presentasi dan logika ${name}.`,
          props,
          visualSpecs: {
            layout: `Display: ${node.styles['display'] || 'block'}; Gap: ${node.styles['gap'] || 'normal'}`,
            dimensions: `Width: ${node.styles['width'] || '100%'}; Height: ${node.styles['height'] || 'auto'}`,
            colors: `Background: ${node.styles['background-color'] || 'transparent'}; Text: ${node.styles['color'] || 'inherit'}`,
            borderRadius: node.styles['border-radius'],
            shadow: node.styles['box-shadow'],
          },
          copywriting: texts.slice(0, 4),
          states: ['default', 'loading', 'error', 'responsive-collapsed'],
          events: name.includes('Form') ? ['onSubmit', 'onInputChange'] : ['onNavigate', 'onActionClick'],
        });
      }
    }

    (node.children || []).forEach(walk);
  };

  project.pages.forEach((p) => walk(p.layoutTree));

  if (contracts.length === 0) {
    contracts.push({
      name: 'MainLayout',
      targetFile: `${folder}MainLayout${ext}`,
      description: 'Komponen penampung utama (Main Container) halaman.',
      props: [{ name: 'children', type: 'React.ReactNode', optional: true, description: 'Konten halaman' }],
      visualSpecs: {
        layout: 'Display: flex; Gap: 16px',
        dimensions: 'Width: 100%; Height: 100vh',
        colors: 'Background: #FFFFFF; Text: #111827',
      },
      copywriting: [],
      states: ['default', 'loading'],
      events: ['onMount'],
    });
  }

  return contracts.slice(0, 8);
}
