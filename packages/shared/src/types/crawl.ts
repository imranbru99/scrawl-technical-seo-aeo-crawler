export interface RedirectHop {
  url: string;
  status: number;
  durationMs: number;
  headers?: Record<string, string>;
}

export interface LinkItem {
  url: string;
  targetUrl: string;
  text: string;
  rel?: string;
  target?: string;
  isInternal: boolean;
  position?: 'nav' | 'header' | 'footer' | 'sidebar' | 'body' | 'main' | 'other';
  nofollow?: boolean;
}

export interface ImageItem {
  url: string;
  src: string;
  alt: string;
  width?: number;
  height?: number;
  naturalWidth?: number;
  naturalHeight?: number;
  isLazy?: boolean;
  format?: string;
  sizeBytes?: number;
  loading?: string;
  srcset?: string;
}

export interface HeadingItem {
  level: number; // 1 to 6
  text: string;
  id?: string;
}

export interface ResourceItem {
  url: string;
  type: 'stylesheet' | 'script' | 'image' | 'font' | 'fetch' | 'xhr' | 'document' | 'other';
  sizeBytes?: number;
  status?: number;
  durationMs?: number;
}

export interface ConsoleMessageItem {
  type: 'log' | 'info' | 'warn' | 'error' | 'debug';
  text: string;
  location?: string;
}

export interface TlsInfo {
  protocol?: string;
  authorized?: boolean;
  authorizationError?: string;
  validFrom?: string;
  validTo?: string;
  daysRemaining?: number;
  issuer?: string;
  subject?: string;
  hstsHeader?: string;
  hasHsts?: boolean;
  hstsMaxAge?: number;
  hstsIncludeSubdomains?: boolean;
  hstsPreload?: boolean;
}

export interface PageData {
  url: string;
  finalUrl: string;
  urlHash: string;
  statusCode: number;
  statusMessage?: string;
  crawlDepth: number;
  discoveredFrom?: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  ttfbMs: number;
  downloadTimeMs: number;
  totalTimeMs: number;
  sizeBytes: number;
  decodedSizeBytes?: number;
  contentType: string;
  charset: string;
  httpVersion?: string;
  compression?: 'gzip' | 'brotli' | 'deflate' | 'none';
  serverHint?: string;
  cdnHint?: string;
  ipAddress?: string;
  tls?: TlsInfo;

  // HTML content
  rawHtml?: string;
  renderedHtml?: string;
  hasJsRenderingDiff?: boolean;
  textOnly?: string;
  wordCount: number;
  domDepth?: number;
  domNodeCount?: number;

  // Meta & SEO fields
  title?: string;
  metaDescription?: string;
  canonical?: string;
  canonicalHeader?: string;
  metaRobots?: string;
  xRobotsTag?: string;
  isIndexable: boolean;
  nonIndexableReason?: string;

  // Elements
  headings: HeadingItem[];
  links: LinkItem[];
  images: ImageItem[];
  resources: ResourceItem[];
  consoleErrors: ConsoleMessageItem[];

  // Hreflang & OpenGraph & Twitter
  hreflang: Array<{ lang: string; href: string }>;
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;

  // Schema & Structured data
  jsonLdRaw: unknown[];
  microdataRaw: unknown[];

  // Performance/render screenshots
  desktopScreenshotPath?: string;
  mobileScreenshotPath?: string;

  // Internal page metrics
  internalPageRank?: number;
  inlinkCount?: number;
  outlinkCount?: number;
  simhash?: string;
}

export interface RobotsTxtData {
  url: string;
  content: string;
  exists: boolean;
  statusCode: number;
  sitemaps: string[];
  rulesPerUserAgent: Record<string, { allow: string[]; disallow: string[]; crawlDelay?: number }>;
  warnings: string[];
}

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

export interface SitemapData {
  url: string;
  type: 'sitemap' | 'sitemapindex';
  entries: SitemapEntry[];
  nestedSitemaps: string[];
  isValid: boolean;
  errors: string[];
}

export interface LinkGraphNode {
  url: string;
  inlinks: string[];
  outlinks: string[];
  pageRank: number;
  depth: number;
  isOrphan: boolean;
}

export interface LinkGraphData {
  nodes: Map<string, LinkGraphNode>;
  orphans: string[];
  deadEnds: string[];
  brokenLinks: Array<{ source: string; target: string; statusCode?: number; text?: string }>;
}
