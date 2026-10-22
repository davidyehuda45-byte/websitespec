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
    const counts = new Map<string, { bgCount: number; textCount: number; borderCount: number; accentCount: number }>();
    counts.set('#FFFFFF', { bgCount: 45, textCount: 0, borderCount: 0, accentCount: 0 });
    counts.set('#0F172A', { bgCount: 0, textCount: 30, borderCount: 0, accentCount: 0 });
    counts.set('#2563EB', { bgCount: 12, textCount: 0, borderCount: 0, accentCount: 5 });
    counts.set('#E2E8F0', { bgCount: 0, textCount: 0, borderCount: 8, accentCount: 0 });

    const palette = clusterColorPalette(counts);
    expect(palette.length).toBe(4);
    expect(palette[0]?.hex).toBe('#FFFFFF');
    expect(palette[0]?.role).toBe('background');
    expect(palette[1]?.hex).toBe('#0F172A');
    expect(palette[1]?.role).toBe('text');
  });
});
