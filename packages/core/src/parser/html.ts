import * as cheerio from 'cheerio';
import {
  resolveUrl,
  isInternalUrl,
  extractPlainText,
  wordCount,
  simhash,
  sha256,
  type HeadingItem,
  type LinkItem,
  type ImageItem,
  type PageData,
} from '@scrawl/shared';
import type { FetchResult } from '../fetcher/http.js';

export interface ParseOptions {
  baseOrigin?: string;
  allowSubdomains?: boolean;
  crawlDepth?: number;
  discoveredFrom?: string;
}

export class HtmlParser {
  parse(fetchResult: FetchResult, options: ParseOptions = {}): PageData {
    const rawHtml = fetchResult.bodyText || '';
    const $ = cheerio.load(rawHtml);
    const targetUrl = fetchResult.url;
    const finalUrl = fetchResult.finalUrl;
    const baseOrigin = options.baseOrigin || new URL(finalUrl).origin;
    const allowSubdomains = options.allowSubdomains || false;

    // Title
    const title = $('title').first().text().trim() || undefined;

    // Meta Description
    const metaDescription =
      $('meta[name="description" i]').attr('content')?.trim() ||
      $('meta[property="og:description" i]').attr('content')?.trim() ||
      undefined;

    // Canonicals
    const canonical = $('link[rel="canonical" i]').attr('href')?.trim() || undefined;
    const canonicalHeader = fetchResult.responseHeaders['link']?.match(/<([^>]+)>;\s*rel="?canonical"?/i)?.[1];

    // Meta Robots & X-Robots-Tag
    const metaRobots = $('meta[name="robots" i]').attr('content')?.trim() || undefined;
    const xRobotsTag = fetchResult.responseHeaders['x-robots-tag'];

    // Indexability assessment
    let isIndexable = fetchResult.statusCode >= 200 && fetchResult.statusCode < 300;
    let nonIndexableReason: string | undefined;

    if (fetchResult.statusCode >= 300 && fetchResult.statusCode < 400) {
      isIndexable = false;
      nonIndexableReason = `Redirect status ${fetchResult.statusCode}`;
    } else if (fetchResult.statusCode >= 400) {
      isIndexable = false;
      nonIndexableReason = `Client or server error status ${fetchResult.statusCode}`;
    } else if (metaRobots && /noindex/i.test(metaRobots)) {
      isIndexable = false;
      nonIndexableReason = 'Blocked by meta robots noindex';
    } else if (xRobotsTag && /noindex/i.test(xRobotsTag)) {
      isIndexable = false;
      nonIndexableReason = 'Blocked by X-Robots-Tag noindex';
    } else if (canonical && canonical !== finalUrl && canonical !== targetUrl) {
      // Resolving canonical
      const resolvedCanon = resolveUrl(canonical, finalUrl);
      if (resolvedCanon && resolvedCanon !== finalUrl) {
        // Points to another URL
        isIndexable = false;
        nonIndexableReason = `Canonicalized to ${resolvedCanon}`;
      }
    }

    // Headings
    const headings: HeadingItem[] = [];
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const tag = (('name' in el ? (el as { name: string }).name : $(el).prop('tagName')) || 'h1').toLowerCase();
      const level = parseInt(tag.replace('h', ''), 10) || 1;
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      const id = $(el).attr('id') || undefined;
      if (text) {
        headings.push({ level, text, id });
      }
    });

    // Links
    const links: LinkItem[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')?.trim();
      if (!href) return;

      const resolved = resolveUrl(href, finalUrl);
      if (!resolved) return;

      const text = $(el).text().replace(/\s+/g, ' ').trim() || $(el).attr('title')?.trim() || '';
      const rel = $(el).attr('rel')?.trim();
      const target = $(el).attr('target')?.trim();
      const nofollow = rel ? /nofollow/i.test(rel) : false;
      const isInternal = isInternalUrl(resolved, baseOrigin, allowSubdomains);

      // Determine position
      let position: LinkItem['position'] = 'body';
      if ($(el).closest('header, nav, .nav, .menu, .header').length > 0) {
        position = 'nav';
      } else if ($(el).closest('footer, .footer').length > 0) {
        position = 'footer';
      } else if ($(el).closest('aside, .sidebar').length > 0) {
        position = 'sidebar';
      } else if ($(el).closest('main, article, [role="main"]').length > 0) {
        position = 'main';
      }

      links.push({
        url: finalUrl,
        targetUrl: resolved,
        text,
        rel,
        target,
        isInternal,
        position,
        nofollow,
      });
    });

    // Images
    const images: ImageItem[] = [];
    $('img').each((_, el) => {
      const src = $(el).attr('src')?.trim();
      if (!src) return;

      const resolvedSrc = resolveUrl(src, finalUrl) || src;
      const alt = $(el).attr('alt')?.trim() ?? '';
      const widthAttr = $(el).attr('width');
      const heightAttr = $(el).attr('height');
      const loading = $(el).attr('loading')?.toLowerCase();
      const srcset = $(el).attr('srcset');

      const width = widthAttr && !isNaN(Number(widthAttr)) ? parseInt(widthAttr, 10) : undefined;
      const height = heightAttr && !isNaN(Number(heightAttr)) ? parseInt(heightAttr, 10) : undefined;
      const isLazy = loading === 'lazy' || $(el).hasClass('lazy') || $(el).hasClass('lazyload');

      let format: string | undefined;
      const extMatch = resolvedSrc.match(/\.(png|jpe?g|webp|avif|svg|gif)(\?.*)?$/i);
      if (extMatch) {
        format = extMatch[1].toLowerCase();
      }

      images.push({
        url: finalUrl,
        src: resolvedSrc,
        alt,
        width,
        height,
        isLazy,
        format,
        loading,
        srcset,
      });
    });

    // Hreflang
    const hreflang: Array<{ lang: string; href: string }> = [];
    $('link[rel="alternate"][hreflang]').each((_, el) => {
      const lang = $(el).attr('hreflang')?.trim().toLowerCase();
      const href = $(el).attr('href')?.trim();
      if (lang && href) {
        const resolvedHref = resolveUrl(href, finalUrl) || href;
        hreflang.push({ lang, href: resolvedHref });
      }
    });

    // OpenGraph
    const openGraph: Record<string, string> = {};
    $('meta[property^="og:"]').each((_, el) => {
      const prop = $(el).attr('property')?.trim().toLowerCase();
      const content = $(el).attr('content')?.trim();
      if (prop && content) {
        openGraph[prop] = content;
      }
    });

    // Twitter Card
    const twitterCard: Record<string, string> = {};
    $('meta[name^="twitter:"], meta[property^="twitter:"]').each((_, el) => {
      const name = ($(el).attr('name') || $(el).attr('property'))?.trim().toLowerCase();
      const content = $(el).attr('content')?.trim();
      if (name && content) {
        twitterCard[name] = content;
      }
    });

    // Structured Data (JSON-LD)
    const jsonLdRaw: unknown[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      const content = $(el).text().trim();
      if (content) {
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            jsonLdRaw.push(...parsed);
          } else {
            jsonLdRaw.push(parsed);
          }
        } catch {
          // Syntax error recorded in structured data validation
          jsonLdRaw.push({ __syntaxError: true, raw: content });
        }
      }
    });

    // Text & Word count
    const textOnly = extractPlainText(rawHtml);
    const count = wordCount(textOnly);

    // SimHash for near-duplicate analysis
    const words = (textOnly.match(/[\p{L}\p{N}]+/gu) || []).map((w) => w.toLowerCase());
    const hash = simhash(words);

    return {
      url: targetUrl,
      finalUrl,
      urlHash: sha256(finalUrl),
      statusCode: fetchResult.statusCode,
      statusMessage: fetchResult.statusMessage,
      crawlDepth: options.crawlDepth || 0,
      discoveredFrom: options.discoveredFrom,
      requestHeaders: fetchResult.requestHeaders,
      responseHeaders: fetchResult.responseHeaders,
      ttfbMs: fetchResult.ttfbMs,
      downloadTimeMs: fetchResult.downloadTimeMs,
      totalTimeMs: fetchResult.totalTimeMs,
      sizeBytes: fetchResult.sizeBytes,
      contentType: fetchResult.contentType,
      charset: fetchResult.charset,
      title,
      metaDescription,
      canonical,
      canonicalHeader,
      metaRobots,
      xRobotsTag,
      isIndexable,
      nonIndexableReason,
      headings,
      links,
      images,
      resources: [],
      consoleErrors: [],
      hreflang,
      openGraph,
      twitterCard,
      jsonLdRaw,
      microdataRaw: [],
      textOnly,
      wordCount: count,
      simhash: hash,
      rawHtml,
    };
  }
}
