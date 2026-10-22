import { describe, it, expect } from 'vitest';
import { generateTailwindThemeConfig } from '../src/core/compile/tailwind-theme';
import type { DesignTokens } from '../src/types/blueprint';

describe('Tailwind Theme Generator', () => {
  it('generates valid Tailwind config from extracted tokens', () => {
    const mockTokens: DesignTokens = {
      global: {
        backgroundColor: '#121212',
        textColor: '#FFFFFF',
        fontFamily: 'Roboto',
        baseFontSize: '16px',
      },
      palette: [
        { hex: '#121212', count: 50, role: 'background' },
        { hex: '#FFFFFF', count: 120, role: 'text' },
        { hex: '#F0C35A', count: 10, role: 'accent' },
      ],
      typography: [],
      spacingScale: ['4px', '8px', '16px'],
      radiusScale: ['4px', '22px', '9999px'],
      shadowScale: [],
      cssVariables: {},
      fontSources: [],
    };

    const config = generateTailwindThemeConfig(mockTokens);
    expect(config).toContain("module.exports = {");
    expect(config).toContain("'brand-bg': '#121212'");
    expect(config).toContain("'brand-text': '#FFFFFF'");
    expect(config).toContain("'brand-accent': '#F0C35A'");
    expect(config).toContain("'pill': '22px'");
    expect(config).toContain("['Roboto', 'sans-serif']");
  });
});

