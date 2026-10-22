import type { ColorToken } from '../../types/blueprint';

/**
 * Converts any CSS color string (rgb, rgba, hsl, named, hex) to uppercase HEX format.
 */
export function cssColorToHex(colorStr: string): string | null {
  if (!colorStr) return null;
  const str = colorStr.trim().toLowerCase();

  if (str === 'transparent' || str === 'rgba(0, 0, 0, 0)' || str === 'rgba(0,0,0,0)') {
    return null;
  }

  // Already Hex
  if (str.startsWith('#')) {
    if (str.length === 4) {
      // #RGB -> #RRGGBB
      return (
        '#' +
        str[1] +
        str[1] +
        str[2] +
        str[2] +
        str[3] +
        str[3]
      ).toUpperCase();
    }
    return str.toUpperCase();
  }

  // rgb(...) or rgba(...)
  const rgbMatch = str.match(/rgba?\(\s*([0-9.]+)[,\s]+([0-9.]+)[,\s]+([0-9.]+)(?:[,/\s]+([0-9.]+%?))?\s*\)/);
  if (rgbMatch && rgbMatch[1] && rgbMatch[2] && rgbMatch[3]) {
    const r = Math.round(parseFloat(rgbMatch[1]));
    const g = Math.round(parseFloat(rgbMatch[2]));
    const b = Math.round(parseFloat(rgbMatch[3]));
    const rawAlpha = rgbMatch[4];

    let alphaHex = '';
    if (rawAlpha !== undefined) {
      let a = rawAlpha.endsWith('%') ? parseFloat(rawAlpha) / 100 : parseFloat(rawAlpha);
      if (a === 0) return null; // fully transparent
      if (a < 1) {
        alphaHex = Math.round(a * 255)
          .toString(16)
          .padStart(2, '0')
          .toUpperCase();
      }
    }

    const hexR = r.toString(16).padStart(2, '0').toUpperCase();
    const hexG = g.toString(16).padStart(2, '0').toUpperCase();
    const hexB = b.toString(16).padStart(2, '0').toUpperCase();

    return `#${hexR}${hexG}${hexB}${alphaHex}`;
  }

  return null;
}

/**
 * Recursively inspects ancestor background colors to find the non-transparent effective background.
 */
export function getEffectiveBackgroundColor(el: Element | null): string {
  let curr: Element | null = el;
  while (curr && curr !== document.documentElement) {
    const style = window.getComputedStyle(curr);
    const bg = style.backgroundColor;
    const hex = cssColorToHex(bg);
    if (hex && !hex.endsWith('00')) {
      return hex;
    }
    curr = curr.parentElement;
  }
  return '#FFFFFF';
}

/**
 * Clusters and ranks colors by frequency, determining their dominant role.
 */
export function clusterColorPalette(
  colorCounts: Map<string, { count: number; roles: Set<'background' | 'text' | 'accent' | 'border'> }>
): ColorToken[] {
  const result: ColorToken[] = [];

  for (const [hex, data] of colorCounts.entries()) {
    let dominantRole: 'background' | 'text' | 'accent' | 'border' = 'accent';

    if (data.roles.has('background') && (hex === '#FFFFFF' || hex === '#000000' || data.count > 10)) {
      dominantRole = 'background';
    } else if (data.roles.has('text') && !data.roles.has('background')) {
      dominantRole = 'text';
    } else if (data.roles.has('border') && !data.roles.has('text')) {
      dominantRole = 'border';
    } else {
      dominantRole = 'accent';
    }

    result.push({
      hex,
      count: data.count,
      role: dominantRole,
    });
  }

  // Sort by frequency descending
  return result.sort((a, b) => b.count - a.count).slice(0, 24);
}
