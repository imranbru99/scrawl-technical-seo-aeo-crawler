export interface UrlNormalizeOptions {
  stripFragment?: boolean;
  stripTrailingSlash?: boolean;
  sortQueryParams?: boolean;
  stripParams?: string[];
  lowercaseHost?: boolean;
}

const DEFAULT_TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  '_hsenc',
  '_hsmi',
  'sessionid',
  'phpsessid',
  'jsessionid',
];

/**
 * Normalizes a URL for deterministic crawling, deduplication and canonical checks.
 */
export function normalizeUrl(rawUrl: string, options: UrlNormalizeOptions = {}): string {
  try {
    const url = new URL(rawUrl);

    if (options.lowercaseHost !== false) {
      url.hostname = url.hostname.toLowerCase();
    }

    // Remove default ports
    if ((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443')) {
      url.port = '';
    }

    // Strip hash/fragment
    if (options.stripFragment !== false) {
      url.hash = '';
    }

    // Remove tracking or custom query params
    const stripList = options.stripParams || DEFAULT_TRACKING_PARAMS;
    const stripSet = new Set(stripList.map((p) => p.toLowerCase()));
    const keysToDelete: string[] = [];
    url.searchParams.forEach((_, key) => {
      if (stripSet.has(key.toLowerCase())) {
        keysToDelete.push(key);
      }
    });
    for (const key of keysToDelete) {
      url.searchParams.delete(key);
    }

    // Sort query parameters deterministically
    if (options.sortQueryParams !== false) {
      url.searchParams.sort();
    }

    // Trailing slash handling on path
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith('/') && options.stripTrailingSlash) {
      pathname = pathname.slice(0, -1);
    }
    url.pathname = pathname;

    return url.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * Resolves a potentially relative URL against a base URL safely.
 */
export function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string | null {
  try {
    const trimmed = relativeOrAbsolute.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('javascript:') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
      return null;
    }
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return null;
    }
    return resolved.toString();
  } catch {
    return null;
  }
}

/**
 * Checks whether two URLs share the exact same origin.
 */
export function isSameOrigin(url1: string, url2: string): boolean {
  try {
    const u1 = new URL(url1);
    const u2 = new URL(url2);
    return u1.origin === u2.origin;
  } catch {
    return false;
  }
}

/**
 * Checks if targetUrl is considered internal to baseOrigin.
 * If allowSubdomains is true, any subdomain of base domain is considered internal.
 */
export function isInternalUrl(targetUrl: string, baseOrigin: string, allowSubdomains = false): boolean {
  try {
    const target = new URL(targetUrl);
    const base = new URL(baseOrigin);

    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      return false;
    }

    if (target.origin === base.origin) {
      return true;
    }

    if (allowSubdomains) {
      const targetHost = target.hostname.toLowerCase();
      const baseHost = base.hostname.toLowerCase();
      const rootDomain = getRootDomain(baseHost);
      return targetHost.endsWith(`.${rootDomain}`) || targetHost === rootDomain;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Extracts root domain name (e.g. "sub.example.com" -> "example.com").
 */
export function getRootDomain(hostname: string): string {
  const parts = hostname.toLowerCase().split('.');
  if (parts.length <= 2) return hostname;
  // Basic second level domain handling (e.g. co.uk, com.au)
  const isTwoPartTld = ['co.uk', 'gov.uk', 'com.au', 'co.nz', 'co.jp'].includes(parts.slice(-2).join('.'));
  if (isTwoPartTld && parts.length > 2) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

/**
 * Computes URL path depth (count of slashes).
 */
export function getUrlDepth(urlString: string): number {
  try {
    const url = new URL(urlString);
    const segments = url.pathname.split('/').filter((s) => s.length > 0);
    return segments.length;
  } catch {
    return 0;
  }
}
