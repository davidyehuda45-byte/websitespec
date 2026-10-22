import type { DesignTokens, TypographyToken } from '../../types/blueprint';
import { cssColorToHex, clusterColorPalette, getEffectiveBackgroundColor } from './color';
import {
  safeTrim,
  safeGetComputedStyle,
  safeGetPropertyValue,
  safeQuerySelector,
  safeQuerySelectorAll,
  safeGetAttribute,
} from '../utils/dom-safe';

export function extractDesignTokens(root: Element = document.body): DesignTokens {
  const safeRoot = root || document.body || document.documentElement;
  const bodyStyle = safeGetComputedStyle(safeRoot);
  const htmlStyle = safeGetComputedStyle(document.documentElement);

  const effectiveBg = getEffectiveBackgroundColor(safeRoot);
  const bodyText = cssColorToHex(bodyStyle ? safeGetPropertyValue(bodyStyle, 'color') : '#111827') || '#111827';
  
  const rawBodyFont = bodyStyle ? safeGetPropertyValue(bodyStyle, 'font-family') : '';
  const baseFont = safeTrim(rawBodyFont.split(',')[0]?.replace(/['"]/g, '')) || 'sans-serif';
  const baseSize = (bodyStyle ? safeGetPropertyValue(bodyStyle, 'font-size') : '') ||
    (htmlStyle ? safeGetPropertyValue(htmlStyle, 'font-size') : '') ||
    '16px';

  // 1. Color Frequency Miner
  const colorCounts = new Map<string, { bgCount: number; textCount: number; borderCount: number; accentCount: number }>();

  const recordColor = (hex: string | null, role: 'background' | 'text' | 'accent' | 'border') => {
    if (!hex) return;
    const existing = colorCounts.get(hex) || { bgCount: 0, textCount: 0, borderCount: 0, accentCount: 0 };
    if (role === 'background') existing.bgCount++;
    else if (role === 'text') existing.textCount++;
    else if (role === 'border') existing.borderCount++;
    else existing.accentCount++;
    colorCounts.set(hex, existing);
  };

  // 2. Scales: Spacing, Radius, Shadow
  const spacingFreq = new Map<string, number>();
  const radiusFreq = new Map<string, number>();
  const shadowFreq = new Map<string, number>();

  const allElements = safeQuerySelectorAll(safeRoot, '*');
  const maxScan = Math.min(allElements.length, 1200);

  for (let i = 0; i < maxScan; i++) {
    const el = allElements[i];
    if (!el) continue;
    const style = safeGetComputedStyle(el);
    if (!style) continue;

    // Record Colors
    const bgVal = safeGetPropertyValue(style, 'background-color');
    const bgHex = cssColorToHex(bgVal);
    if (bgHex) recordColor(bgHex, 'background');

    const textVal = safeGetPropertyValue(style, 'color');
    const textHex = cssColorToHex(textVal);
    if (textHex) recordColor(textHex, 'text');

    const borderVal = safeGetPropertyValue(style, 'border-color');
    const borderWidth = safeGetPropertyValue(style, 'border-width');
    const borderHex = cssColorToHex(borderVal);
    if (borderHex && borderWidth && borderWidth !== '0px') recordColor(borderHex, 'border');

    // Spacing
    [
      safeGetPropertyValue(style, 'padding-top'),
      safeGetPropertyValue(style, 'padding-left'),
      safeGetPropertyValue(style, 'margin-top'),
      safeGetPropertyValue(style, 'margin-left'),
      safeGetPropertyValue(style, 'gap'),
    ].forEach((sp) => {
      if (sp && sp !== '0px' && sp !== 'normal') {
        spacingFreq.set(sp, (spacingFreq.get(sp) || 0) + 1);
      }
    });

    // Radius
    const br = safeGetPropertyValue(style, 'border-radius');
    if (br && br !== '0px') {
      radiusFreq.set(br, (radiusFreq.get(br) || 0) + 1);
    }

    // Shadow
    const bs = safeGetPropertyValue(style, 'box-shadow');
    if (bs && bs !== 'none') {
      shadowFreq.set(bs, (shadowFreq.get(bs) || 0) + 1);
    }
  }

  // 3. Typography Scale
  const typographyTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'small', 'button', 'a'];
  const typographyTokens: TypographyToken[] = [];

  for (const tag of typographyTags) {
    const el = safeQuerySelector(safeRoot, tag) || (tag === 'p' ? safeQuerySelector(safeRoot, 'div') : null);
    if (el) {
      const style = safeGetComputedStyle(el);
      if (style) {
        const rawFont = safeGetPropertyValue(style, 'font-family');
        const fontFam = safeTrim(rawFont.split(',')[0]?.replace(/['"]/g, ''));
        const letterSpacing = safeGetPropertyValue(style, 'letter-spacing');

        typographyTokens.push({
          tag,
          fontFamily: fontFam || baseFont,
          fontSize: safeGetPropertyValue(style, 'font-size') || '16px',
          fontWeight: safeGetPropertyValue(style, 'font-weight') || '400',
          lineHeight: safeGetPropertyValue(style, 'line-height') || 'normal',
          letterSpacing: letterSpacing === 'normal' || !letterSpacing ? '0px' : letterSpacing,
          color: cssColorToHex(safeGetPropertyValue(style, 'color')) || bodyText,
        });
      }
    }
  }

  // 4. CSS Variables from :root (Safely handle cross-origin stylesheets)
  const cssVariables: Record<string, string> = {};
  try {
    for (const sheet of Array.from(document.styleSheets || [])) {
      try {
        const rules = sheet.cssRules || (sheet as any).rules || [];
        for (const rule of Array.from(rules)) {
          if (rule instanceof CSSStyleRule && (rule.selectorText === ':root' || rule.selectorText === 'html')) {
            const styleObj = rule.style;
            if (styleObj) {
              for (let i = 0; i < styleObj.length; i++) {
                const prop = styleObj[i];
                if (prop && prop.startsWith('--')) {
                  const val = safeTrim(styleObj.getPropertyValue(prop));
                  if (val) {
                    cssVariables[prop] = val;
                  }
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
  const googleFontLinks = safeQuerySelectorAll(document, 'link[href*="fonts.googleapis.com"]');
  googleFontLinks.forEach((link) => {
    const href = safeGetAttribute(link, 'href') || '';
    if (href) {
      fontSources.push({
        family: href,
        source: 'Google Fonts',
        weights: [],
      });
    }
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
