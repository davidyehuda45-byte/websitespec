import { describe, it, expect } from 'vitest';
import { cssColorToHex, clusterColorPalette } from '../src/core/extract/color';

describe('Color Extraction & Clustering', () => {
  it('converts rgb to uppercase 6-digit hex', () => {
    expect(cssColorToHex('rgb(255, 255, 255)')).toBe('#FFFFFF');
    expect(cssColorToHex('rgb(15, 23, 42)')).toBe('#0F172A');
    expect(cssColorToHex('rgb(37, 99, 235)')).toBe('#2563EB');
  });

  it('converts 3-digit hex to 6-digit hex', () => {
    expect(cssColorToHex('#fff')).toBe('#FFFFFF');
    expect(cssColorToHex('#000')).toBe('#000000');
  });

  it('handles transparent colors by returning null', () => {
    expect(cssColorToHex('transparent')).toBeNull();
    expect(cssColorToHex('rgba(0, 0, 0, 0)')).toBeNull();
  });

  it('converts rgba with alpha to 8-digit hex', () => {
    expect(cssColorToHex('rgba(255, 255, 255, 0.5)')).toBe('#FFFFFF80');
  });

  it('clusters color palette and assigns dominant roles', () => {
    const counts = new Map<string, { count: number; roles: Set<'background' | 'text' | 'accent' | 'border'> }>();
    counts.set('#FFFFFF', { count: 45, roles: new Set(['background']) });
    counts.set('#0F172A', { count: 30, roles: new Set(['text']) });
    counts.set('#2563EB', { count: 12, roles: new Set(['background', 'accent']) });
    counts.set('#E2E8F0', { count: 8, roles: new Set(['border']) });

    const palette = clusterColorPalette(counts);
    expect(palette.length).toBe(4);
    expect(palette[0]?.hex).toBe('#FFFFFF');
    expect(palette[0]?.role).toBe('background');
    expect(palette[1]?.hex).toBe('#0F172A');
    expect(palette[1]?.role).toBe('text');
  });
});
