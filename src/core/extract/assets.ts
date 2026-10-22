export interface ExtractedAsset {
  type: 'img' | 'svg' | 'icon' | 'bg-image';
  src?: string;
  alt?: string;
  dimensions?: { width: number; height: number };
  svgContent?: string;
}

export function extractAssetsFromElement(el: Element): ExtractedAsset | undefined {
  const tagName = el.tagName.toLowerCase();

  if (tagName === 'img') {
    const img = el as HTMLImageElement;
    return {
      type: 'img',
      src: img.currentSrc || img.src,
      alt: img.alt || '',
      dimensions: {
        width: img.naturalWidth || img.clientWidth,
        height: img.naturalHeight || img.clientHeight,
      },
    };
  }

  if (tagName === 'svg') {
    const svg = el as SVGSVGElement;
    const width = svg.clientWidth || parseInt(svg.getAttribute('width') || '0', 10);
    const height = svg.clientHeight || parseInt(svg.getAttribute('height') || '0', 10);

    return {
      type: 'svg',
      dimensions: { width, height },
      svgContent: svg.outerHTML, // Full SVG content without clipping
    };
  }

  // Detect Icon fonts (Material Design Icons, FontAwesome, Tabler, Lucide)
  if (tagName === 'i' || tagName === 'span') {
    const classList = Array.from(el.classList);
    const iconClass = classList.find((c) =>
      /^(mdi-|fa-|fa[srbld]-|lucide-|tabler-|heroicon-|bi-|material-icons)/.test(c)
    );
    if (iconClass) {
      return {
        type: 'icon',
        alt: iconClass,
        dimensions: {
          width: el.clientWidth,
          height: el.clientHeight,
        },
      };
    }
  }

  const style = window.getComputedStyle(el);
  const bgImage = style.backgroundImage;
  if (bgImage && bgImage !== 'none' && bgImage.includes('url(')) {
    const match = bgImage.match(/url\(["']?([^"']+)["']?\)/);
    if (match && match[1]) {
      return {
        type: 'bg-image',
        src: match[1],
        dimensions: {
          width: el.clientWidth,
          height: el.clientHeight,
        },
      };
    }
  }

  return undefined;
}
