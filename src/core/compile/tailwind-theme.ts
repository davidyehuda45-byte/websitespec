import type { DesignTokens } from '../../types/blueprint';

/**
 * Generates a ready-to-use tailwind.config.js snippet from extracted design tokens.
 */
export function generateTailwindThemeConfig(tokens: DesignTokens): string {
  // Map extracted palette to semantic Tailwind color names
  const colors: Record<string, string> = {};
  const palette = tokens.palette || [];

  palette.forEach((c, idx) => {
    if (c.role === 'background' && !colors['brand-bg']) {
      colors['brand-bg'] = c.hex;
    } else if (c.role === 'text' && !colors['brand-text']) {
      colors['brand-text'] = c.hex;
    } else if (c.role === 'accent' && !colors['brand-accent']) {
      colors['brand-accent'] = c.hex;
    } else if (c.role === 'border' && !colors['brand-border']) {
      colors['brand-border'] = c.hex;
    } else {
      colors[`color-${idx + 1}`] = c.hex;
    }
  });

  // Ensure baseline defaults
  if (!colors['brand-bg']) colors['brand-bg'] = tokens.global?.backgroundColor || '#0F172A';
  if (!colors['brand-text']) colors['brand-text'] = tokens.global?.textColor || '#F8FAFC';
  if (!colors['brand-accent']) colors['brand-accent'] = '#3B82F6';

  // Map custom border radius
  const borderRadius: Record<string, string> = {};
  (tokens.radiusScale || []).forEach((r) => {
    if (r.includes('22px')) borderRadius['pill'] = '22px';
    else if (r.includes('9999px') || r === '50%') borderRadius['full'] = r;
    else if (r === '4px') borderRadius['sm'] = '4px';
    else if (r === '8px') borderRadius['md'] = '8px';
    else if (r === '12px' || r === '14px') borderRadius['lg'] = r;
    else if (r === '16px') borderRadius['xl'] = '16px';
  });

  const fontFam = tokens.global?.fontFamily ? `['${tokens.global.fontFamily}', 'sans-serif']` : `['Inter', 'sans-serif']`;

  return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,vue,blade.php}",
    "./resources/**/*.blade.php",
    "./components/**/*.{js,ts,jsx,tsx,vue}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
${Object.entries(colors)
  .map(([k, v]) => `        '${k}': '${v}',`)
  .join('\n')}
      },
      fontFamily: {
        sans: ${fontFam},
      },
      borderRadius: {
${Object.entries(borderRadius)
  .map(([k, v]) => `        '${k}': '${v}',`)
  .join('\n')}
      },
    },
  },
  plugins: [],
};
`;
}

