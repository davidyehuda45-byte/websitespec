import { describe, it, expect } from 'vitest';
import { stripDefaultStyles, normalizeShorthand } from '../src/core/normalize/defaults';
import { deduplicateSiblings } from '../src/core/normalize/dedupe';
import type { LayoutNode } from '../src/types/blueprint';

describe('CSS Normalization & Anti-Slop', () => {
  it('normalizes 4-value box shorthand', () => {
    expect(normalizeShorthand('16px 16px 16px 16px')).toBe('16px');
    expect(normalizeShorthand('10px 20px 10px 20px')).toBe('10px 20px');
    expect(normalizeShorthand('10px 15px 20px 15px')).toBe('10px 15px 20px');
    expect(normalizeShorthand('10px 20px 30px 40px')).toBe('10px 20px 30px 40px');
  });

  it('strips standard browser default styles', () => {
    const rawStyles = {
      margin: '0px 0px 0px 0px',
      padding: '0px',
      position: 'static',
      'box-shadow': 'none',
      'background-color': 'rgba(0, 0, 0, 0)',
      display: 'flex',
      gap: '16px',
      'border-radius': '8px',
    };

    const cleaned = stripDefaultStyles(rawStyles, false);
    expect(cleaned).toEqual({
      display: 'flex',
      gap: '16px',
      'border-radius': '8px',
    });
  });

  it('preserves root background even if standard', () => {
    const rawStyles = {
      'background-color': '#FFFFFF',
      margin: '0px',
    };
    const cleaned = stripDefaultStyles(rawStyles, true);
    expect(cleaned['background-color']).toBe('#FFFFFF');
  });

  it('deduplicates repeating sibling structures (e.g. card grid)', () => {
    const createCard = (title: string): LayoutNode => ({
      tag: 'div',
      styles: { display: 'flex' },
      children: [
        { tag: 'h3', styles: {}, children: [], text: title },
        { tag: 'p', styles: {}, children: [], text: 'Description' },
      ],
    });

    const siblings: LayoutNode[] = [
      createCard('Card 1'),
      createCard('Card 2'),
      createCard('Card 3'),
      createCard('Card 4'),
    ];

    const deduplicated = deduplicateSiblings(siblings);
    expect(deduplicated.length).toBe(1);
    expect(deduplicated[0]?.repeatCount).toBe(4);
  });
});
