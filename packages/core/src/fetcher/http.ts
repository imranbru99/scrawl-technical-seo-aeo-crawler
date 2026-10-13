import { request } from 'undici';
import { validateHostSecurity, sha256, type RedirectHop, type PageData } from '@scrawl/shared';

export interface FetchOptions {
  userAgent?: string;
  timeoutMs?: number;
  maxRedirects?: number;
  maxSizeBytes?: number;
  allowPrivateIps?: boolean;
  headers?: Record<string, string>;
}

export interface FetchResult {
  url: string;
  finalUrl: string;
  statusCode: number;
  statusMessage?: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  redirectHops: RedirectHop[];
  ttfbMs: number;
  downloadTimeMs: number;
  totalTimeMs: number;
  sizeBytes: number;
  contentType: string;
  charset: string;
  bodyText?: string;
  rawBuffer?: Buffer;
  isBlockedBySsrf?: boolean;
  error?: string;
}

export class HttpFetcher {
  private userAgent: string;
  private timeoutMs: number;
  private maxRedirects: number;
  private maxSizeBytes: number;
  private allowPrivateIps: boolean;
  private defaultHeaders: Record<string, string>;

  constructor(options: FetchOptions = {}) {
    this.userAgent = options.userAgent || 'Scrawl-Bot/1.0 (+https://github.com/scrawl-seo/scrawl)';
    this.timeoutMs = options.timeoutMs || 15000;
    this.maxRedirects = options.maxRedirects !== undefined ? options.maxRedirects : 10;
    this.maxSizeBytes = options.maxSizeBytes || 10 * 1024 * 1024; // 10MB cap
    this.allowPrivateIps = options.allowPrivateIps || false;
    this.defaultHeaders = options.headers || {};
  }

  async fetch(targetUrl: string): Promise<FetchResult> {
    let currentUrl = targetUrl;
    const redirectHops: RedirectHop[] = [];
    let hopsCount = 0;
    const totalStart = Date.now();

    while (hopsCount <= this.maxRedirects) {
      // 1. Validate SSRF security
      const parsedUrl = new URL(currentUrl);
      const securityCheck = await validateHostSecurity(parsedUrl.hostname, this.allowPrivateIps);
      if (!securityCheck.isSafe) {
        return {
          url: targetUrl,
          finalUrl: currentUrl,
          statusCode: 403,
          statusMessage: 'SSRF Blocked',
          requestHeaders: {},
          responseHeaders: {},
          redirectHops,
          ttfbMs: 0,
          downloadTimeMs: 0,
          totalTimeMs: Date.now() - totalStart,
          sizeBytes: 0,
          contentType: '',
          charset: '',
          isBlockedBySsrf: true,
          error: securityCheck.reason,
        };
      }

      const reqHeaders: Record<string, string> = {
        'user-agent': this.userAgent,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-encoding': 'gzip, deflate, br',
        ...this.defaultHeaders,
      };

      const hopStart = Date.now();
      let ttfbMs = 0;

      try {
        const res = await request(currentUrl, {
          method: 'GET',
          headers: reqHeaders,
          headersTimeout: this.timeoutMs,
          bodyTimeout: this.timeoutMs,
        });

        ttfbMs = Date.now() - hopStart;
        const statusCode = res.statusCode;

        // Collect response headers
        const resHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) {
          if (typeof v === 'string') {
            resHeaders[k.toLowerCase()] = v;
          } else if (Array.isArray(v)) {
            resHeaders[k.toLowerCase()] = v.join(', ');
          }
        }

        // Handle Redirects (301, 302, 303, 307, 308)
        if ([301, 302, 303, 307, 308].includes(statusCode) && resHeaders.location) {
          const hopDuration = Date.now() - hopStart;
          redirectHops.push({
            url: currentUrl,
            status: statusCode,
            durationMs: hopDuration,
            headers: resHeaders,
          });

          const nextUrl = new URL(resHeaders.location, currentUrl).toString();
          // Discard response body
          await res.body.dump();

          currentUrl = nextUrl;
          hopsCount++;
          continue;
        }

        // Read Body
        const bodyBuffer = await res.body.arrayBuffer();
        const buffer = Buffer.from(bodyBuffer);
        const downloadTimeMs = Date.now() - hopStart - ttfbMs;
        const totalTimeMs = Date.now() - totalStart;

        const contentTypeRaw = resHeaders['content-type'] || 'text/html';
        const contentType = contentTypeRaw.split(';')[0].trim().toLowerCase();
        const charsetMatch = contentTypeRaw.match(/charset=([^;]+)/i);
        const charset = charsetMatch ? charsetMatch[1].trim().toLowerCase() : 'utf-8';

        return {
          url: targetUrl,
          finalUrl: currentUrl,
          statusCode,
          statusMessage: String(statusCode),
          requestHeaders: reqHeaders,
          responseHeaders: resHeaders,
          redirectHops,
          ttfbMs,
          downloadTimeMs: Math.max(0, downloadTimeMs),
          totalTimeMs,
          sizeBytes: buffer.length,
          contentType,
          charset,
          bodyText: buffer.toString('utf-8'),
          rawBuffer: buffer,
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          url: targetUrl,
          finalUrl: currentUrl,
          statusCode: 0,
          statusMessage: 'Network Error',
          requestHeaders: reqHeaders,
          responseHeaders: {},
          redirectHops,
          ttfbMs: 0,
          downloadTimeMs: 0,
          totalTimeMs: Date.now() - totalStart,
          sizeBytes: 0,
          contentType: '',
          charset: '',
          error: errorMsg,
        };
      }
    }

    return {
      url: targetUrl,
      finalUrl: currentUrl,
      statusCode: 310,
      statusMessage: 'Too Many Redirects',
      requestHeaders: {},
      responseHeaders: {},
      redirectHops,
      ttfbMs: 0,
      downloadTimeMs: 0,
      totalTimeMs: Date.now() - totalStart,
      sizeBytes: 0,
      contentType: '',
      charset: '',
      error: `Exceeded max redirects limit of ${this.maxRedirects}`,
    };
  }
}
