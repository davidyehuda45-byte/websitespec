import { describe, it, expect } from 'vitest';
import {
  synthesizeUserPersonas,
  inferDataEntities,
  synthesizePageSpecs,
  synthesizeComponentContracts,
} from '../src/core/compile/prd-synthesizer';
import type { ProjectBlueprint, LayoutNode } from '../src/types/blueprint';

describe('Intelligent Universal PRD Synthesizer', () => {
  const mockTree: LayoutNode = {
    tag: 'body',
    styles: {},
    children: [
      {
        tag: 'header',
        styles: { display: 'flex', 'background-color': '#1E293B', height: '64px' },
        children: [{ tag: 'span', styles: {}, text: 'Bagimu Extra', children: [] }],
      },
      {
        tag: 'section',
        id: 'eskul',
        styles: { display: 'grid' },
        children: [
          { tag: 'h2', styles: {}, text: 'Katalog Ekstrakurikuler', children: [] },
          {
            tag: 'div',
            styles: { display: 'flex' },
            children: [
              { tag: 'h3', styles: {}, text: 'Futsal', children: [] },
              { tag: 'span', styles: { 'border-radius': '9999px' }, text: 'Kuota Terbuka', children: [] },
              { tag: 'p', styles: {}, text: 'Pembina: Bangkit Gunawan', children: [] },
            ],
          },
          {
            tag: 'div',
            styles: { display: 'flex' },
            children: [
              { tag: 'h3', styles: {}, text: 'Voli', children: [] },
              { tag: 'span', styles: { 'border-radius': '9999px' }, text: 'Kuota Terbuka', children: [] },
              { tag: 'p', styles: {}, text: 'Pembina: Bangkit Gunawan', children: [] },
            ],
          },
        ],
      },
      {
        tag: 'form',
        id: 'loginForm',
        styles: { display: 'block' },
        children: [
          { tag: 'input', id: 'nis', placeholder: 'cth: 10001', styles: {}, children: [] },
          { tag: 'input', id: 'token', placeholder: '••••••••', styles: {}, children: [] },
        ],
      },
    ],
  };

  const project: ProjectBlueprint = {
    domain: 'bagimuextra.smkbagimunegeriku.sch.id',
    targetStack: 'React + Vite + Tailwind CSS',
    outputProfile: 'full',
    pages: [
      {
        pathname: '/',
        title: 'Bagimu Extra — Pendaftaran Eskul',
        layoutTree: mockTree,
        internalLinks: ['/siswa/login', '/pembina/login'],
      } as any,
      {
        pathname: '/siswa/login',
        title: 'Login Siswa',
        layoutTree: mockTree,
        internalLinks: ['/'],
      } as any,
    ],
    sharedLayouts: [],
    createdAt: '2026-10-22',
  };

  it('synthesizes user personas dynamically from route segments and buttons', () => {
    const personas = synthesizeUserPersonas(project);
    expect(personas.length).toBeGreaterThanOrEqual(1);

    const siswaPersona = personas.find((p) => p.role.includes('Siswa'));
    expect(siswaPersona).toBeDefined();
    expect(siswaPersona?.keyActions.length).toBeGreaterThan(0);
  });

  it('infers business data entities from forms and repeating cards without hardcoding', () => {
    const entities = inferDataEntities(project);
    expect(entities.length).toBeGreaterThanOrEqual(2);

    const eskulEntity = entities.find((e) => e.name.includes('Ekstrakurikuler'));
    expect(eskulEntity).toBeDefined();
    expect(eskulEntity?.fields.some((f) => f.name === 'nama')).toBe(true);
    expect(eskulEntity?.fields.some((f) => f.name === 'pembina')).toBe(true);
  });

  it('synthesizes functional requirements and Gherkin acceptance criteria per page', () => {
    const specs = synthesizePageSpecs(project);
    expect(specs.length).toBe(2);

    const homeSpec = specs.find((s) => s.pathname === '/');
    expect(homeSpec).toBeDefined();
    expect(homeSpec?.requirements.length).toBeGreaterThan(0);
    expect(homeSpec?.acceptanceCriteria.length).toBeGreaterThan(0);
  });

  it('universally infers e-commerce data entities on non-school websites', () => {
    const ecommerceTree: LayoutNode = {
      tag: 'body',
      styles: {},
      children: [
        {
          tag: 'section',
          styles: { display: 'grid' },
          children: [
            { tag: 'h2', styles: {}, text: 'Daftar Produk Populer', children: [] },
            {
              tag: 'div',
              styles: { display: 'flex' },
              children: [
                { tag: 'h3', styles: {}, text: 'Sepatu Running Pro', children: [] },
                { tag: 'span', styles: { 'border-radius': '9999px' }, text: 'Diskon 20%', children: [] },
                { tag: 'p', styles: {}, text: 'Harga: Rp 750.000', children: [] },
              ],
            },
            {
              tag: 'div',
              styles: { display: 'flex' },
              children: [
                { tag: 'h3', styles: {}, text: 'Jersey Sport Breathable', children: [] },
                { tag: 'span', styles: { 'border-radius': '9999px' }, text: 'Stok Terbatas', children: [] },
                { tag: 'p', styles: {}, text: 'Harga: Rp 250.000', children: [] },
              ],
            },
          ],
        },
        {
          tag: 'form',
          id: 'checkoutForm',
          styles: { display: 'block' },
          children: [
            { tag: 'input', id: 'alamat_pengiriman', placeholder: 'Alamat lengkap', styles: {}, children: [] },
            { tag: 'input', id: 'kode_pos', placeholder: '12345', styles: {}, children: [] },
          ],
        },
      ],
    };

    const ecommerceProject: ProjectBlueprint = {
      domain: 'shop-sport.com',
      targetStack: 'Next.js 15 (App Router) + Tailwind CSS',
      outputProfile: 'full',
      pages: [
        {
          pathname: '/shop',
          title: 'Shop Sport Store',
          layoutTree: ecommerceTree,
          internalLinks: ['/cart', '/admin'],
        } as any,
      ],
      sharedLayouts: [],
      createdAt: '2026-10-22',
    };

    const entities = inferDataEntities(ecommerceProject);
    expect(entities.some((e) => e.name.includes('ProdukPopuler'))).toBe(true);
    expect(entities.some((e) => e.name.includes('Checkout'))).toBe(true);

    const productEntity = entities.find((e) => e.name.includes('ProdukPopuler'))!;
    expect(productEntity.fields.some((f) => f.name === 'harga')).toBe(true);
  });

  it('correctly clusters portfolio projects and timeline milestones without fragmenting into individual cards or hero CTA entities', () => {
    const portfolioTree: LayoutNode = {
      tag: 'div',
      id: 'root',
      styles: { height: '7313px' },
      children: [
        {
          tag: 'header',
          id: 'nav',
          styles: {},
          children: [{ tag: 'nav', styles: {}, text: 'David Yehuda', children: [] }],
        },
        // Hero section with CTA buttons
        {
          tag: 'section',
          id: 'home',
          styles: {},
          children: [
            { tag: 'h1', styles: {}, text: 'Curious builder,', children: [] },
            {
              tag: 'div',
              styles: { display: 'flex' },
              children: [
                { tag: 'a', styles: {}, text: 'Get in touch', children: [] },
                { tag: 'a', styles: {}, text: 'View Projects', children: [] },
              ],
            },
          ],
        },
        // Projects section with 2 project cards
        {
          tag: 'section',
          id: 'projects',
          styles: {},
          children: [
            { tag: 'h2', styles: {}, text: 'Featured Projects', children: [] },
            {
              tag: 'div',
              styles: { display: 'grid' },
              children: [
                {
                  tag: 'div',
                  styles: {},
                  children: [
                    { tag: 'h3', styles: {}, text: 'PetCare: Sistem Penitipan Hewan', children: [] },
                    { tag: 'p', styles: {}, text: 'Sistem reservasi dan manajemen penitipan hewan modern berbasis web.', children: [] },
                    { tag: 'span', styles: { 'border-radius': '9999px' }, text: 'Laravel + Tailwind', children: [] },
                  ],
                },
                {
                  tag: 'div',
                  styles: {},
                  children: [
                    { tag: 'h3', styles: {}, text: 'Personal Portfolio Dev', children: [] },
                    { tag: 'p', styles: {}, text: 'Web portfolio modern dengan animasi interaktif dan dark mode.', children: [] },
                    { tag: 'span', styles: { 'border-radius': '9999px' }, text: 'React + Vite', children: [] },
                  ],
                },
              ],
            },
          ],
        },
        // Journey / Timeline section with 3 semester cards
        {
          tag: 'section',
          id: 'journey',
          styles: {},
          children: [
            { tag: 'h2', styles: {}, text: 'My Journey', children: [] },
            {
              tag: 'div',
              styles: { display: 'flex' },
              children: [
                {
                  tag: 'div',
                  styles: {},
                  children: [
                    { tag: 'h3', styles: {}, text: 'Semester 1 - Foundation', children: [] },
                    { tag: 'p', styles: {}, text: 'Mempelajari dasar algoritma pemrograman dan logika dasar komputer.', children: [] },
                  ],
                },
                {
                  tag: 'div',
                  styles: {},
                  children: [
                    { tag: 'h3', styles: {}, text: 'Semester 2 - Web Development', children: [] },
                    { tag: 'p', styles: {}, text: 'Membangun aplikasi web interaktif menggunakan HTML, CSS, JavaScript.', children: [] },
                  ],
                },
                {
                  tag: 'div',
                  styles: {},
                  children: [
                    { tag: 'h3', styles: {}, text: 'Semester 3 - Modern Development', children: [] },
                    { tag: 'p', styles: {}, text: 'Pengembangan arsitektur backend REST API dan framework frontend modern.', children: [] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const portfolioProject: ProjectBlueprint = {
      domain: 'reactportfolio-six-virid.vercel.app',
      targetStack: 'React + Vite + Tailwind CSS',
      outputProfile: 'full',
      pages: [
        {
          pathname: '/',
          title: 'David Yehuda Surbakti — Full-Stack Developer',
          layoutTree: portfolioTree,
          internalLinks: ['/'],
        } as any,
      ],
      sharedLayouts: [],
      createdAt: '2026-10-22',
    };

    const entities = inferDataEntities(portfolioProject);

    // 1. Hero should NOT be inferred as an entity
    expect(entities.some((e) => e.name.toLowerCase().includes('curious'))).toBe(false);

    // 2. Projects should be clustered into Project / Proyek, NOT separate PetCare entity
    expect(entities.some((e) => e.name === 'Project' || e.name === 'Proyek')).toBe(true);
    expect(entities.some((e) => e.name.includes('PetCare'))).toBe(false);

    // 3. Semesters should be clustered into JourneyMilestone, NOT Semester1, Semester2, Semester3
    expect(entities.some((e) => e.name === 'JourneyMilestone' || e.name === 'TimelineMilestone')).toBe(true);
    expect(entities.some((e) => e.name.includes('Semester1'))).toBe(false);

    // 4. Component contracts should skip #root and name home as HeroSection
    const contracts = synthesizeComponentContracts(portfolioProject);
    expect(contracts.some((c) => c.name.toLowerCase() === 'root')).toBe(false);
    expect(contracts.some((c) => c.name === 'HeroSection')).toBe(true);
    expect(contracts.some((c) => c.name === 'Projects')).toBe(true);
    expect(contracts.some((c) => c.name === 'Journey')).toBe(true);
  });
});
