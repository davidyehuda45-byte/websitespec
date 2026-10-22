/**
 * Normalizes CSS properties and strips noisy browser defaults to keep agent blueprints clean and token-efficient.
 */

const DEFAULT_CSS_VALUES: Record<string, (val: string) => boolean> = {
  margin: (v) => isZeroSpacing(v),
  padding: (v) => isZeroSpacing(v),
  position: (v) => v === 'static',
  top: (v) => v === 'auto',
  right: (v) => v === 'auto',
  bottom: (v) => v === 'auto',
  left: (v) => v === 'auto',
  'z-index': (v) => v === 'auto' || v === '0',
  'box-shadow': (v) => v === 'none' || v === '',
  border: (v) => v.startsWith('0px') || v.includes('none'),
  'border-width': (v) => v === '0px' || v === 'none',
  'border-style': (v) => v === 'none',
  'border-radius': (v) => isZeroSpacing(v),
  'background-color': (v) =>
    v === 'transparent' ||
    v === 'rgba(0, 0, 0, 0)' ||
    v === 'rgba(0,0,0,0)',
  'background-image': (v) => v === 'none',
  opacity: (v) => v === '1',
  transform: (v) => v === 'none',
  filter: (v) => v === 'none',
  'flex-grow': (v) => v === '0',
  'flex-shrink': (v) => v === '1',
  'flex-basis': (v) => v === 'auto',
  'flex-wrap': (v) => v === 'nowrap',
  'align-items': (v) => v === 'normal' || v === 'stretch',
  'justify-content': (v) => v === 'normal' || v === 'flex-start' || v === 'start',
  overflow: (v) => v === 'visible',
  'text-decoration': (v) => v.startsWith('none') || v === 'none',
  'letter-spacing': (v) => v === 'normal' || v === '0px',
  'line-height': (v) => v === 'normal',
};

function isZeroSpacing(val: string): boolean {
  if (!val) return true;
  const parts = val.trim().split(/\s+/);
  return parts.every((p) => p === '0px' || p === '0' || p === '0rem');
}

/**
 * Normalizes repeated 4-way box-model shorthand values:
 * e.g. "16px 16px 16px 16px" -> "16px"
 * e.g. "10px 20px 10px 20px" -> "10px 20px"
 */
export function normalizeShorthand(val: string): string {
  if (!val) return val;
  const parts = val.trim().split(/\s+/);
  if (parts.length === 4 && parts[0] && parts[1] && parts[2] && parts[3]) {
    const [top, right, bottom, left] = parts as [string, string, string, string];
    if (top === right && right === bottom && bottom === left) {
      return top;
    }
    if (top === bottom && right === left) {
      return `${top} ${right}`;
    }
    if (right === left) {
      return `${top} ${right} ${bottom}`;
    }
  }
  return val;
}

/**
 * Filters out properties that match standard browser defaults.
 */
export function stripDefaultStyles(
  styles: Record<string, string>,
  isRoot: boolean = false
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, rawValue] of Object.entries(styles)) {
    if (!rawValue) continue;
    const value = normalizeShorthand(rawValue.trim());

    // Root background should be kept even if transparent or standard
    if (isRoot && key === 'background-color') {
      result[key] = value;
      continue;
    }

    const isDefault = DEFAULT_CSS_VALUES[key];
    if (isDefault && isDefault(value)) {
      continue;
    }

    result[key] = value;
  }

  return result;
}
