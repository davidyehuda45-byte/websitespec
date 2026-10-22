import type { DesignTokens, TypographyToken } from '../../types/blueprint';
import { cssColorToHex, clusterColorPalette, getEffectiveBackgroundColor } from './color';

export function extractDesignTokens(root: Element = document.body): DesignTokens {
  const bodyStyle = window.getComputedStyle(document.body);
  const htmlStyle = window.getComputedStyle(document.documentElement);

  const effectiveBg = getEffectiveBackgroundColor(document.body);
  const bodyText = cssColorToHex(bodyStyle.color) || '#111827';
  const baseFont = (bodyStyle.fontFamily.split(',')[0] || '').replace(/['"]/g, '').trim() || 'sans-serif';
  const baseSize = bodyStyle.fontSize || htmlStyle.fontSize || '16px';

  // 1. Color Frequency Miner
  const colorCounts = new Map<string, { count: number; roles: Set<'background' | 'text' | 'accent' | 'border'> }>();

  const recordColor = (hex: string | null, role: 'background' | 'text' | 'accent' | 'border') => {
    if (!hex) return;
    const existing = colorCounts.get(hex);
    if (existing) {
      existing.count++;
      existing.roles.add(role);
    } else {
      colorCounts.set(hex, { count: 1, roles: new Set([role]) });
    }
  };

  // 2. Scales: Spacing, Radius, Shadow
  const spacingFreq = new Map<string, number>();
  const radiusFreq = new Map<string, number>();
  const shadowFreq = new Map<string, number>();

  const allElements = root.querySelectorAll('*');
  const maxScan = Math.min(allElements.length, 1200);

  for (let i = 0; i < maxScan; i++) {
    const el = allElements[i];
    if (!el) continue;
    const style = window.getComputedStyle(el);

    // Record Colors
    const bgHex = cssColorToHex(style.backgroundColor);
    if (bgHex) recordColor(bgHex, 'background');

    const textHex = cssColorToHex(style.color);
    if (textHex) recordColor(textHex, 'text');

    const borderHex = cssColorToHex(style.borderColor);
    if (borderHex && style.borderWidth !== '0px') recordColor(borderHex, 'border');

    // Spacing
    [style.paddingTop, style.paddingLeft, style.marginTop, style.marginLeft, style.gap].forEach((sp) => {
      if (sp && sp !== '0px' && sp !== 'normal') {
        spacingFreq.set(sp, (spacingFreq.get(sp) || 0) + 1);
      }
    });

    // Radius
    if (style.borderRadius && style.borderRadius !== '0px') {
      radiusFreq.set(style.borderRadius, (radiusFreq.get(style.borderRadius) || 0) + 1);
    }

    // Shadow
    if (style.boxShadow && style.boxShadow !== 'none') {
      shadowFreq.set(style.boxShadow, (shadowFreq.get(style.boxShadow) || 0) + 1);
    }
  }

  // 3. Typography Scale
  const typographyTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'small', 'button', 'a'];
  const typographyTokens: TypographyToken[] = [];

  for (const tag of typographyTags) {
    const el = root.querySelector(tag) || (tag === 'p' ? root.querySelector('div') : null);
    if (el) {
      const style = window.getComputedStyle(el);
      const fontFam = (style.fontFamily.split(',')[0] || '').replace(/['"]/g, '').trim();
      typographyTokens.push({
        tag,
        fontFamily: fontFam || baseFont,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing === 'normal' ? '0px' : style.letterSpacing,
        color: cssColorToHex(style.color) || bodyText,
      });
    }
  }

  // 4. CSS Variables from :root
  const cssVariables: Record<string, string> = {};
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules || [])) {
          if (rule instanceof CSSStyleRule && (rule.selectorText === ':root' || rule.selectorText === 'html')) {
            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              if (prop && prop.startsWith('--')) {
                const val = rule.style.getPropertyValue(prop);
                if (val) {
                  cssVariables[prop] = val.trim();
                }
              }
            }
          }
        }
      } catch {
        // Cross-origin stylesheet access restriction - safe to skip
      }
    }
  } catch {
    // Stylesheet scan failure - safe to ignore
  }

  // 5. Font Sources
  const fontSources: Array<{ family: string; source: string; weights: string[] }> = [];
  const googleFontLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
  googleFontLinks.forEach((link) => {
    const href = link.getAttribute('href') || '';
    fontSources.push({
      family: href,
      source: 'Google Fonts',
      weights: [],
    });
  });

  const getTopKeys = (map: Map<string, number>, limit: number): string[] => {
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([val]) => val);
  };

  return {
    global: {
      backgroundColor: effectiveBg,
      textColor: bodyText,
      fontFamily: baseFont,
      baseFontSize: baseSize,
    },
    palette: clusterColorPalette(colorCounts),
    typography: typographyTokens,
    spacingScale: getTopKeys(spacingFreq, 8),
    radiusScale: getTopKeys(radiusFreq, 6),
    shadowScale: getTopKeys(shadowFreq, 5),
    cssVariables,
    fontSources,
  };
}
