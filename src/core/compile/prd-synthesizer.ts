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
 * Synthesizes User Personas and Role Matrix from the captured routes and copywriting.
 */
export function synthesizeUserPersonas(project: ProjectBlueprint): UserPersona[] {
  const personas: UserPersona[] = [];
  const paths = project.pages.map((p) => p.pathname.toLowerCase());
  const allTexts = project.pages.flatMap((p) => {
    const list: string[] = [];
    const walk = (n: LayoutNode) => {
      if (n.text) list.push(n.text);
      (n.children || []).forEach(walk);
    };
    walk(p.layoutTree);
    return list;
  }).join(' ').toLowerCase();

  // 1. Siswa / Student Role
  if (paths.some((p) => p.includes('siswa') || p.includes('student')) || allTexts.includes('siswa')) {
    personas.push({
      role: 'Siswa',
      title: 'Siswa / Peserta Didik',
      description: 'Pengguna utama yang mencari informasi kegiatan ekstrakurikuler, mendaftar dengan NIS & Token unik, serta memantau kehadiran.',
      accessRoutes: paths.filter((p) => p === '/' || p.includes('siswa') || p.includes('eskul')),
      keyActions: [
        'Mengeksplorasi katalog eskul dan jadwal latihan',
        'Login menggunakan Nomor Induk Siswa (NIS) dan Token 8-digit',
        'Melakukan pendaftaran dan memilih eskul favorit',
      ],
    });
  }

  // 2. Pembina / Coach / Teacher Role
  if (paths.some((p) => p.includes('pembina') || p.includes('guru') || p.includes('teacher')) || allTexts.includes('pembina') || allTexts.includes('wali kelas')) {
    personas.push({
      role: 'Pembina / Wali Kelas',
      title: 'Pembina Eskul & Wali Kelas',
      description: 'Staf pengajar yang bertanggung jawab memvalidasi pendaftaran siswa, mengelola kuota, mencatat absensi latihan, dan memberikan penilaian.',
      accessRoutes: paths.filter((p) => p.includes('pembina') || p.includes('wali') || p.includes('staff')),
      keyActions: [
        'Login staf via username/email dan kata sandi resmi',
        'Mengelola kuota anggota dan jadwal latihan rutin',
        'Memantau absensi kehadiran dan pelaporan kegiatan',
      ],
    });
  }

  // 3. Administrator Role
  if (paths.some((p) => p.includes('admin')) || allTexts.includes('administrator') || allTexts.includes('panel kontrol')) {
    personas.push({
      role: 'Administrator',
      title: 'Administrator Sistem / Tata Usaha',
      description: 'Pengelola teknis sekolah yang mengonfigurasi master data eskul, menerbitkan token kartu pelajar, dan mengelola akun staf.',
      accessRoutes: paths.filter((p) => p.includes('admin')),
      keyActions: [
        'Konfigurasi master data ekstrakurikuler & periode pendaftaran',
        'Manajemen akun pembina dan wali kelas',
        'Penerbitan token baru untuk siswa yang kehilangan token',
        'Audit sistem dan pelaporan rekapan sekolah',
      ],
    });
  }

  // Fallback: General Public / Guest
  if (personas.length === 0) {
    personas.push({
      role: 'Pengunjung / User',
      title: 'Pengguna Utama Sistem',
      description: 'Pengguna publik yang mengakses antarmuka untuk menjelajah fitur, melakukan navigasi, dan berinteraksi dengan layanan.',
      accessRoutes: paths,
      keyActions: ['Navigasi halaman utama', 'Eksplorasi konten dan fitur', 'Interaksi antarmuka'],
    });
  }

  return personas;
}

/**
 * Infers business data entities from form fields, card content, and copywriting.
 */
export function inferDataEntities(project: ProjectBlueprint): DataEntity[] {
  const entities: DataEntity[] = [];

  // Collect all input elements across all pages
  const inputs: Array<{ id?: string; placeholder?: string; label?: string }> = [];
  const textCards: string[] = [];

  const walk = (node: LayoutNode) => {
    if (node.tag === 'input') {
      inputs.push({
        id: node.id,
        placeholder: node.placeholder,
        label: node.ariaLabel,
      });
    }
    if (node.tag === 'h2' || node.tag === 'h3') {
      if (node.text && node.text.length < 50) textCards.push(node.text);
    }
    (node.children || []).forEach(walk);
  };

  project.pages.forEach((p) => walk(p.layoutTree));

  // 1. Siswa / Student Entity (if NIS / Token found)
  const hasNis = inputs.some((i) => (i.id || '').toLowerCase().includes('nis') || (i.placeholder || '').toLowerCase().includes('10001'));
  if (hasNis || textCards.some((t) => t.toLowerCase().includes('siswa'))) {
    entities.push({
      name: 'Siswa (Student)',
      description: 'Entitas data siswa yang terdaftar secara resmi di pangkalan data sekolah.',
      fields: [
        { name: 'id', type: 'string (UUID)', description: 'Identifier unik data siswa' },
        { name: 'nis', type: 'string', description: 'Nomor Induk Siswa resmi (5-10 digit)', example: '10001' },
        { name: 'nama_lengkap', type: 'string', description: 'Nama lengkap siswa sesuai buku induk' },
        { name: 'token_pendaftaran', type: 'string', description: 'Token login 8 digit unik bersifat sekali pakai', example: 'AB82X19K' },
        { name: 'token_status', type: 'enum (active | used | revoked)', description: 'Status masa berlaku token kartu pelajar' },
      ],
    });
  }

  // 2. Ekstrakurikuler Entity (if catalog / eskul found)
  entities.push({
    name: 'Ekstrakurikuler (Activity)',
    description: 'Kegiatan pengembangan minat, bakat, dan keterampilan yang diselenggarakan oleh sekolah.',
    fields: [
      { name: 'id', type: 'string (Slug / UUID)', description: 'Identifier unik kegiatan' },
      { name: 'nama', type: 'string', description: 'Nama cabang ekstrakurikuler', example: 'Futsal / PMR / Audio Sound' },
      { name: 'deskripsi', type: 'string', description: 'Ringkasan kegiatan dan kompetensi yang dipelajari' },
      { name: 'kuota_status', type: 'enum (open | full)', description: 'Status ketersediaan kuota pendaftaran', example: 'Kuota Terbuka' },
      { name: 'pembina_nama', type: 'string', description: 'Nama guru pembina penanggung jawab' },
    ],
  });

  // 3. JadwalLatihan Entity
  entities.push({
    name: 'JadwalLatihan (Schedule)',
    description: 'Jadwal rutin mingguan untuk pelaksanaan sesi latihan ekstrakurikuler.',
    fields: [
      { name: 'id', type: 'string (UUID)', description: 'Identifier jadwal latihan' },
      { name: 'eskul_id', type: 'foreignKey -> Ekstrakurikuler.id', description: 'Relasi ke ekstrakurikuler terkait' },
      { name: 'hari', type: 'enum (Senin - Sabtu)', description: 'Hari pelaksanaan latihan mingguan', example: 'Selasa / Jumat' },
      { name: 'jam_mulai', type: 'string (HH:mm)', description: 'Waktu mulai latihan', example: '15:00' },
      { name: 'jam_selesai', type: 'string (HH:mm)', description: 'Waktu selesai latihan', example: '17:00' },
      { name: 'lokasi', type: 'string', description: 'Fasilitas atau lapangan tempat kegiatan', example: 'Lapangan Utama' },
    ],
  });

  // 4. AkunPengguna / Staf Entity
  const hasStaffLogin = inputs.some((i) => (i.id || '').toLowerCase().includes('login') || (i.id || '').toLowerCase().includes('password'));
  if (hasStaffLogin) {
    entities.push({
      name: 'AkunPengguna (User Account)',
      description: 'Kredensial akses untuk staf pengajar, pembina, dan administrator sistem.',
      fields: [
        { name: 'id', type: 'string (UUID)', description: 'Identifier akun staf' },
        { name: 'username', type: 'string', description: 'Nama pengguna atau alamat email dinas', example: 'pembina.futsal@sekolah.sch.id' },
        { name: 'password_hash', type: 'string (bcrypt)', description: 'Kata sandi terenkripsi' },
        { name: 'role', type: 'enum (pembina | wali_kelas | admin)', description: 'Tingkat kewenangan hak akses dalam sistem' },
      ],
    });
  }

  return entities;
}

/**
 * Synthesizes Functional Requirements and Gherkin Acceptance Criteria per page.
 */
export function synthesizePageSpecs(project: ProjectBlueprint): PageFunctionalSpec[] {
  return project.pages.map((page, idx) => {
    const isHome = page.pathname === '/' || page.pathname === '';
    const isSiswaLogin = page.pathname.includes('siswa');
    const isPembinaLogin = page.pathname.includes('pembina');
    const isAdminLogin = page.pathname.includes('admin');

    const requirements: FunctionalRequirement[] = [];
    const acceptanceCriteria: AcceptanceCriterion[] = [];

    if (isHome) {
      requirements.push({
        id: `FR-${idx + 1}.1`,
        title: 'Hero Banner & Call to Action (CTA)',
        description: 'Menampilkan identitas sekolah, slogan pendaftaran eskul digital, dan tombol navigasi langsung ke portal siswa/pembina.',
        rules: [
          'Tombol "Masuk Siswa (NIS + Token)" mengarahkan ke rute /siswa/login',
          'Tombol "Masuk Pembina / Wali Kelas" mengarahkan ke rute /pembina/login',
          'Tombol "Lihat Katalog Eskul" melakukan smooth-scroll ke section #eskul',
        ],
      });

      requirements.push({
        id: `FR-${idx + 1}.2`,
        title: 'Katalog Ekstrakurikuler Interaktif',
        description: 'Menampilkan kartu eskul dengan status kuota (badge hijau), deskripsi singkat, nama pembina, dan tombol rincian.',
        rules: [
          'Badge kuota menampilkan label "Kuota Terbuka" jika pendaftaran masih aktif',
          'Setiap kartu eskul wajib menampilkan jadwal latihan mingguan (Hari, Jam, dan Lokasi Lapangan)',
        ],
      });

      requirements.push({
        id: `FR-${idx + 1}.3`,
        title: 'Pusat Bantuan & FAQ Interaktif',
        description: 'Menjawab pertanyaan krusial mengenai penanganan token hilang dan kendala validasi NIS.',
        rules: [
          'Memberikan instruksi resmi bagi siswa untuk melapor ke TU sekolah jika token hilang',
        ],
      });

      acceptanceCriteria.push({
        scenario: 'Siswa mengklik tombol login siswa di beranda',
        given: 'Pengguna berada di halaman beranda (/)',
        when: 'Pengguna mengklik tombol "Masuk Siswa (NIS + Token)"',
        then: 'Sistem mengarahkan pengguna ke halaman /siswa/login secara instan',
      });

      acceptanceCriteria.push({
        scenario: 'Mengecek ketersediaan eskul pada katalog',
        given: 'Katalog eskul memuat daftar kegiatan',
        when: 'Pengguna melihat kartu Futsal atau Voli',
        then: 'Kartu menampilkan nama pembina, badge kuota, dan jadwal latihan lengkap',
      });
    } else if (isSiswaLogin) {
      requirements.push({
        id: `FR-${idx + 1}.1`,
        title: 'Formulir Autentikasi NIS & Token Kartu Pelajar',
        description: 'Input kredensial berupa NIS (angka) dan Token 8-digit unik yang tertera pada kartu pelajar.',
        rules: [
          'Field NIS wajib diisi dan divalidasi numerik',
          'Field Token menerima 8 karakter alfanumerik',
          'Menampilkan peringatan keamanan bahwa token bersifat sekali pakai dan hangus setelah pendaftaran selesai',
        ],
      });

      acceptanceCriteria.push({
        scenario: 'Login siswa berhasil dengan NIS dan Token valid',
        given: 'Siswa memasukkan NIS "10001" dan Token 8 digit yang belum pernah digunakan',
        when: 'Siswa menekan tombol "Masuk & Pilih Eskul"',
        then: 'Sistem memvalidasi kredensial dan mengarahkan siswa ke dashboard pemilihan eskul',
      });

      acceptanceCriteria.push({
        scenario: 'Peringatan token kadaluarsa atau salah',
        given: 'Siswa memasukkan token yang sudah pernah dipakai',
        when: 'Siswa mengirim formulir login',
        then: 'Sistem menampilkan pesan error "Token tidak valid atau sudah hangus" dan menyarankan menghubungi TU',
      });
    } else if (isPembinaLogin || isAdminLogin) {
      const roleName = isAdminLogin ? 'Administrator' : 'Pembina / Wali Kelas';
      requirements.push({
        id: `FR-${idx + 1}.1`,
        title: `Otentikasi Kredensial Staf (${roleName})`,
        description: `Formulir login akun resmi untuk staf ${roleName} menggunakan username/email dan kata sandi.`,
        rules: [
          'Field username/email menerima alamat email sekolah atau username staf',
          'Field kata sandi terproteksi dengan tombol toggle intip password',
          'Tersedia tautan "Lupa sandi?" untuk prosedur pemulihan akun',
        ],
      });

      acceptanceCriteria.push({
        scenario: `Login ${roleName} berhasil`,
        given: `Staf berada di halaman ${page.pathname}`,
        when: 'Staf memasukkan kredensial yang sah dan mengklik tombol masuk',
        then: `Sistem memberikan sesi login dan mengarahkan ke panel kontrol ${roleName}`,
      });
    } else {
      requirements.push({
        id: `FR-${idx + 1}.1`,
        title: `Spesifikasi Halaman: ${page.title}`,
        description: `Menyajikan fungsionalitas utama pada rute ${page.pathname}.`,
        rules: ['Pertahankan struktur layout dan navigasi internal sesuai desain acuan'],
      });

      acceptanceCriteria.push({
        scenario: 'Akses halaman berhasil',
        given: `Pengguna membuka URL ${page.pathname}`,
        when: 'Halaman dimuat sempurna oleh browser',
        then: 'Seluruh komponen visual dan teks tampil sesuai spesifikasi PRD',
      });
    }

    return {
      pathname: page.pathname,
      title: page.title || 'Untitled Page',
      overview: `Halaman ${page.title} (${page.pathname}) menangani fungsi ${isHome ? 'pendaratan publik dan etalase kegiatan eskul' : isSiswaLogin ? 'gerbang login khusus siswa berbasis kartu pelajar' : 'portal akses staf terotorisasi'}.`,
      requirements,
      acceptanceCriteria,
    };
  });
}

/**
 * Synthesizes high-level Component Contracts (Props, States, Events) without dummy code dumps.
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
    // Select meaningful macro components
    const isLandmark = ['header', 'footer', 'nav', 'main', 'aside'].includes(node.tag);
    const hasSection = Boolean(node.tag === 'section' || (node.id && ['eskul', 'app-content', 'loginForm'].includes(node.id)));
    const isForm = node.tag === 'form';

    if (isLandmark || hasSection || isForm) {
      let name = '';
      if (node.tag === 'header') name = 'Navbar';
      else if (node.tag === 'footer') name = 'Footer';
      else if (node.tag === 'main') name = 'MainContent';
      else if (node.id === 'eskul' || (node.semanticClass || '').includes('eskul')) name = 'EskulCatalog';
      else if (node.id === 'loginForm') name = 'AuthLoginForm';
      else if (node.tag === 'section' && (node.text || '').includes('Jadwal')) name = 'WeeklyScheduleGrid';
      else if (node.tag === 'section' && (node.text || '').includes('FAQ')) name = 'FaqAccordion';
      else if (node.tag === 'section') name = 'HeroSection';
      else if (node.id) name = toPascalCase(node.id);
      else name = `${toPascalCase(node.tag)}Section`;

      if (!seen.has(name) && name.length >= 3) {
        seen.add(name);

        const texts: string[] = [];
        const collect = (n: LayoutNode) => {
          if (n.text && n.text.length < 80 && !n.text.startsWith('[')) texts.push(n.text);
          (n.children || []).forEach(collect);
        };
        collect(node);

        const props: ComponentProp[] = [];
        if (name === 'EskulCatalog') {
          props.push({ name: 'items', type: 'Array<EskulItem>', optional: false, description: 'Daftar kegiatan eskul beserta kuota dan pembina' });
          props.push({ name: 'onSelectDetail', type: '(id: string) => void', optional: true, description: 'Handler ketika tombol detail diklik' });
        } else if (name === 'AuthLoginForm') {
          props.push({ name: 'role', type: "'siswa' | 'pembina' | 'admin'", optional: false, description: 'Mode peran form otentikasi' });
          props.push({ name: 'onSubmit', type: '(data: LoginPayload) => Promise<void>', optional: false, description: 'Callback pengiriman form' });
        } else if (name === 'WeeklyScheduleGrid') {
          props.push({ name: 'schedules', type: 'Array<ScheduleSession>', optional: false, description: 'Daftar sesi latihan mingguan per hari' });
        } else {
          props.push({ name: 'className', type: 'string', optional: true, description: 'Kelas utility styling tambahan' });
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
          events: name.includes('Form') ? ['onSubmit', 'onInputChange', 'onToggleVisibility'] : ['onNavigate', 'onActionClick'],
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
