export interface ColorToken {
  hex: string;
  count: number;
  role: 'background' | 'text' | 'accent' | 'border';
}

export interface TypographyToken {
  tag: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  color: string;
}

export interface DesignTokens {
  global: {
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
    baseFontSize: string;
  };
  palette: ColorToken[];
  typography: TypographyToken[];
  spacingScale: string[];
  radiusScale: string[];
  shadowScale: string[];
  cssVariables: Record<string, string>;
  fontSources: Array<{ family: string; source: string; weights: string[] }>;
}

export interface LayoutNode {
  tag: string;
  role?: string;
  id?: string;
  semanticClass?: string;
  ariaLabel?: string;
  placeholder?: string;
  href?: string;
  styles: Record<string, string>;
  text?: string;
  children: LayoutNode[];
  repeatCount?: number;
  assets?: {
    type: 'img' | 'svg' | 'icon' | 'bg-image';
    src?: string;
    alt?: string;
    dimensions?: { width: number; height: number };
    svgContent?: string;
  };
  states?: {
    hover?: Record<string, string>;
    focus?: Record<string, string>;
    active?: Record<string, string>;
  };
}

export interface DetectedStack {
  name: string;
  category: 'framework' | 'library' | 'css' | 'backend-heuristic';
  confidence: 'high' | 'medium' | 'low';
  evidence: string;
}

export interface PageBlueprint {
  id: string;
  url: string;
  pathname: string;
  title: string;
  capturedAt: string;
  viewport: { width: number; height: number };
  detectedStack: DetectedStack[];
  tokens: DesignTokens;
  layoutTree: LayoutNode;
  internalLinks: string[];
}

export interface SharedLayoutComponent {
  landmark: 'header' | 'nav' | 'footer' | 'sidebar';
  node: LayoutNode;
  presentInPages: string[];
}

export interface ProjectBlueprint {
  domain: string;
  targetStack: string;
  outputProfile: 'compact' | 'full';
  pages: PageBlueprint[];
  sharedLayouts: SharedLayoutComponent[];
  createdAt: string;
}
