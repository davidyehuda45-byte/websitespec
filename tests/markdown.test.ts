import { describe, it, expect } from 'vitest';
import { compileBlueprintToMarkdown } from '../src/core/compile/markdown';
import type { ProjectBlueprint, PageBlueprint } from '../src/types/blueprint';

describe('Markdown PRD Blueprint Compiler', () => {
  it('generates deterministic, professional PRD without dummy code dumps', () => {
    const mockPage: PageBlueprint = {
      id: 'test-page-1',
      url: 'https://example.com/dashboard',
      pathname: '/dashboard',
      title: 'Dashboard Overview',
      capturedAt: '2026-10-22T06:00:00.000Z',
      viewport: { width: 1440, height: 900 },
      detectedStack: [
        {
          name: 'Next.js',
          category: 'framework',
          confidence: 'high',
          evidence: 'Ditemukan container #__next',
        },
        {
          name: 'Tailwind CSS',
          category: 'css',
          confidence: 'high',
          evidence: '45 class cocok dengan pola Tailwind',
        },
      ],
      tokens: {
        global: {
          backgroundColor: '#0F172A',
          textColor: '#F8FAFC',
          fontFamily: 'Inter',
          baseFontSize: '16px',
        },
        palette: [
          { hex: '#0F172A', count: 20, role: 'background' },
          { hex: '#F8FAFC', count: 18, role: 'text' },
          { hex: '#3B82F6', count: 6, role: 'accent' },
        ],
        typography: [
          {
            tag: 'h1',
            fontFamily: 'Inter',
            fontSize: '32px',
            fontWeight: '700',
            lineHeight: '40px',
            letterSpacing: '-0.02em',
            color: '#F8FAFC',
          },
        ],
        spacingScale: ['8px', '16px', '24px'],
        radiusScale: ['4px', '8px'],
        shadowScale: ['0 4px 6px -1px rgba(0,0,0,0.1)'],
        cssVariables: { '--primary': '#3B82F6' },
        fontSources: [],
      },
      layoutTree: {
        tag: 'main',
        styles: { display: 'flex', 'flex-direction': 'column', gap: '24px' },
        children: [
          {
            tag: 'h1',
            styles: { color: '#F8FAFC' },
            text: 'Welcome back, Admin',
            children: [],
          },
        ],
      },
      internalLinks: ['/settings', '/analytics'],
    };

    const project: ProjectBlueprint = {
      domain: 'example.com',
      targetStack: 'Laravel 11 + Blade + Tailwind CSS',
      outputProfile: 'compact',
      pages: [mockPage],
      sharedLayouts: [],
      createdAt: '22 Oktober 2026',
    };

    const markdown = compileBlueprintToMarkdown(project);

    // 1. Check Title & Executive Summary
    expect(markdown).toContain('PRODUCT REQUIREMENTS DOCUMENT (PRD)');
    expect(markdown).toContain('PRD EXECUTIVE SUMMARY & PRODUCT SCOPE');

    // 2. Check User Personas & Role Matrix
    expect(markdown).toContain('USER PERSONAS & ROLE-BASED ACCESS CONTROL');

    // 3. Check Mermaid User Flow Diagram
    expect(markdown).toContain('```mermaid');
    expect(markdown).toContain('flowchart TD');

    // 4. Check Functional Specs & Acceptance Criteria
    expect(markdown).toContain('SPESIFIKASI FUNGSIONAL PER HALAMAN & ACCEPTANCE CRITERIA');
    expect(markdown).toContain('Given');
    expect(markdown).toContain('When');
    expect(markdown).toContain('Then');

    // 5. Check Inferred Data Entities
    expect(markdown).toContain('INFERRED BUSINESS DATA ENTITIES & SCHEMAS');

    // 6. Check Component Architecture Contracts
    expect(markdown).toContain('SPESIFIKASI ARSITEKTUR KOMPONEN MODULAR');
    expect(markdown).toContain('Kontrak Props');

    // 7. Check Negative Constraints & Design System
    expect(markdown).toContain('NEGATIVE CONSTRAINTS');
    expect(markdown).toContain('DESIGN SYSTEM TOKENS');

    // 8. Check Absence of Emojis (Anti-Slop rule)
    expect(markdown).not.toMatch(/[\u{1F300}-\u{1F6FF}]/u);
  });
});
