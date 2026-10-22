import {
  safeClassList,
  safeGetComputedStyle,
  safeGetPropertyValue,
  safeGetAttribute,
  safeTrim,
} from '../utils/dom-safe';

export interface ExtractedAsset {
  type: 'img' | 'svg' | 'icon' | 'bg-image';
  src?: string;
  alt?: string;
  dimensions?: { width: number; height: number };
  svgContent?: string;
}

export function extractAssetsFromElement(el: Element): ExtractedAsset | undefined {
  if (!el) return undefined;

  try {
    const tagName = (el.tagName || '').toLowerCase();

    if (tagName === 'img') {
      const img = el as HTMLImageElement;
      return {
        type: 'img',
        src: img.currentSrc || img.src || safeGetAttribute(el, 'src') || '',
        alt: img.alt || safeGetAttribute(el, 'alt') || '',
        dimensions: {
          width: img.naturalWidth || img.clientWidth || 0,
          height: img.naturalHeight || img.clientHeight || 0,
        },
      };
    }

    if (tagName === 'svg') {
      const svg = el as SVGSVGElement;
      const width = svg.clientWidth || parseInt(safeGetAttribute(svg, 'width') || '0', 10) || 0;
      const height = svg.clientHeight || parseInt(safeGetAttribute(svg, 'height') || '0', 10) || 0;

      return {
        type: 'svg',
        dimensions: { width, height },
        svgContent: svg.outerHTML || '', // Full SVG content without clipping
      };
    }

    // Detect Icon fonts (Material Design Icons, FontAwesome, Tabler, Lucide)
    if (tagName === 'i' || tagName === 'span') {
      const classList = safeClassList(el);
      const iconClass = classList.find((c) =>
        /^(mdi-|fa-|fa[srbld]-|lucide-|tabler-|heroicon-|bi-|material-icons)/.test(c)
      );
      if (iconClass) {
        return {
          type: 'icon',
          alt: iconClass,
          dimensions: {
            width: el.clientWidth || 0,
            height: el.clientHeight || 0,
          },
        };
      }
    }

    const style = safeGetComputedStyle(el);
    if (style) {
      const bgImage = safeGetPropertyValue(style, 'background-image');
      if (bgImage && bgImage !== 'none' && bgImage.includes('url(')) {
        const match = bgImage.match(/url\(["']?([^"']+)["']?\)/);
        if (match && match[1]) {
          return {
            type: 'bg-image',
            src: safeTrim(match[1]),
            dimensions: {
              width: el.clientWidth || 0,
              height: el.clientHeight || 0,
            },
          };
        }
      }
    }
  } catch (err) {
    console.debug('Safe asset extraction skipped on element:', el, err);
  }

  return undefined;
}
