import { describe, it, expect } from 'vitest';
import {
  synthesizeUserPersonas,
  inferDataEntities,
  synthesizePageSpecs,
  synthesizeComponentContracts,
} from '../src/core/compile/prd-synthesizer';
import type { ProjectBlueprint, LayoutNode } from '../src/types/blueprint';

describe('Intelligent PRD Synthesizer', () => {
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
        styles: { display: 'block', 'background-color': '#FFFFFF' },
        children: [
          { tag: 'h2', styles: {}, text: 'Katalog Ekstrakurikuler', children: [] },
          { tag: 'h3', styles: {}, text: 'Futsal', children: [] },
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

  it('synthesizes user personas and role matrix accurately', () => {
    const personas = synthesizeUserPersonas(project);
    expect(personas.length).toBeGreaterThanOrEqual(1);

    const siswaPersona = personas.find((p) => p.role.includes('Siswa'));
    expect(siswaPersona).toBeDefined();
    expect(siswaPersona?.keyActions.length).toBeGreaterThan(0);
  });

  it('infers business data entities from forms and cards', () => {
    const entities = inferDataEntities(project);
    expect(entities.length).toBeGreaterThanOrEqual(2);

    const siswaEntity = entities.find((e) => e.name.includes('Siswa'));
    expect(siswaEntity).toBeDefined();
    expect(siswaEntity?.fields.some((f) => f.name === 'nis')).toBe(true);

    const eskulEntity = entities.find((e) => e.name.includes('Ekstrakurikuler'));
    expect(eskulEntity).toBeDefined();
    expect(eskulEntity?.fields.some((f) => f.name === 'nama')).toBe(true);
  });

  it('synthesizes functional requirements and Gherkin acceptance criteria per page', () => {
    const specs = synthesizePageSpecs(project);
    expect(specs.length).toBe(2);

    const homeSpec = specs.find((s) => s.pathname === '/');
    expect(homeSpec).toBeDefined();
    expect(homeSpec?.requirements.length).toBeGreaterThan(0);
    expect(homeSpec?.acceptanceCriteria.length).toBeGreaterThan(0);
    expect(homeSpec?.acceptanceCriteria[0]?.given).toBeDefined();
    expect(homeSpec?.acceptanceCriteria[0]?.when).toBeDefined();
    expect(homeSpec?.acceptanceCriteria[0]?.then).toBeDefined();
  });

  it('synthesizes clean component contracts without dummy code dumps', () => {
    const contracts = synthesizeComponentContracts(project);
    expect(contracts.length).toBeGreaterThanOrEqual(2);

    const catalogContract = contracts.find((c) => c.name.includes('EskulCatalog'));
    expect(catalogContract).toBeDefined();
    expect(catalogContract?.props.length).toBeGreaterThan(0);
    expect(catalogContract?.states).toContain('loading');
  });
});
