import type { StorageDatabase } from '../database.js';
import type { PageData } from '@scrawl/shared';

export interface PageRecord {
  id: string;
  crawlId: string;
  url: string;
  finalUrl: string;
  urlHash: string;
  statusCode: number;
  contentType: string;
  charset: string | null;
  sizeBytes: number;
  ttfbMs: number;
  downloadTimeMs: number;
  totalTimeMs: number;
  crawlDepth: number;
  discoveredFrom: string | null;
  httpVersion: string | null;
  compression: string | null;
  serverHint: string | null;
  cdnHint: string | null;
  ipAddress: string | null;
  tlsJson: string | null;
  isIndexable: boolean;
  nonIndexableReason: string | null;
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  canonicalHeader: string | null;
  metaRobots: string | null;
  xRobotsTag: string | null;
  wordCount: number;
  hasJsRenderingDiff: boolean;
  rawHtml: string | null;
  renderedHtml: string | null;
  textOnly: string | null;
  simhash: string | null;
  internalPageRank: number;
  inlinkCount: number;
  outlinkCount: number;
  desktopScreenshotPath: string | null;
  mobileScreenshotPath: string | null;
  createdAt: string;
}

interface RawPageRow {
  id: string;
  crawl_id: string;
  url: string;
  final_url: string;
  url_hash: string;
  status_code: number;
  content_type: string;
  charset: string | null;
  size_bytes: number;
  ttfb_ms: number;
  download_time_ms: number;
  total_time_ms: number;
  depth: number;
  discovered_from: string | null;
  http_version: string | null;
  compression: string | null;
  server_hint: string | null;
  cdn_hint: string | null;
  ip_address: string | null;
  tls_json: string | null;
  is_indexable: number;
  non_indexable_reason: string | null;
  title: string | null;
  meta_description: string | null;
  canonical: string | null;
  canonical_header: string | null;
  meta_robots: string | null;
  x_robots_tag: string | null;
  word_count: number;
  has_js_rendering_diff: number;
  raw_html: string | null;
  rendered_html: string | null;
  text_only: string | null;
  simhash: string | null;
  internal_page_rank: number;
  inlink_count: number;
  outlink_count: number;
  desktop_screenshot_path: string | null;
  mobile_screenshot_path: string | null;
  created_at: string;
}

function mapPageRow(row: RawPageRow): PageRecord {
  return {
    id: row.id,
    crawlId: row.crawl_id,
    url: row.url,
    finalUrl: row.final_url,
    urlHash: row.url_hash,
    statusCode: row.status_code,
    contentType: row.content_type,
    charset: row.charset,
    sizeBytes: row.size_bytes,
    ttfbMs: row.ttfb_ms,
    downloadTimeMs: row.download_time_ms,
    totalTimeMs: row.total_time_ms,
    crawlDepth: row.depth,
    discoveredFrom: row.discovered_from,
    httpVersion: row.http_version,
    compression: row.compression,
    serverHint: row.server_hint,
    cdnHint: row.cdn_hint,
    ipAddress: row.ip_address,
    tlsJson: row.tls_json,
    isIndexable: row.is_indexable === 1,
    nonIndexableReason: row.non_indexable_reason,
    title: row.title,
    metaDescription: row.meta_description,
    canonical: row.canonical,
    canonicalHeader: row.canonical_header,
    metaRobots: row.meta_robots,
    xRobotsTag: row.x_robots_tag,
    wordCount: row.word_count,
    hasJsRenderingDiff: row.has_js_rendering_diff === 1,
    rawHtml: row.raw_html,
    renderedHtml: row.rendered_html,
    textOnly: row.text_only,
    simhash: row.simhash,
    internalPageRank: row.internal_page_rank,
    inlinkCount: row.inlink_count,
    outlinkCount: row.outlink_count,
    desktopScreenshotPath: row.desktop_screenshot_path,
    mobileScreenshotPath: row.mobile_screenshot_path,
    createdAt: row.created_at,
  };
}

export class PageRepository {
  constructor(private storage: StorageDatabase) {}

  async savePage(crawlId: string, pageData: PageData): Promise<void> {
    const pageId = `${crawlId}_${pageData.urlHash}`;
    const now = new Date().toISOString();

    this.storage
      .prepare(
        `INSERT INTO pages (
          id, crawl_id, url, final_url, url_hash, status_code, content_type, charset, size_bytes,
          ttfb_ms, download_time_ms, total_time_ms, depth, discovered_from, http_version, compression,
          server_hint, cdn_hint, ip_address, tls_json, is_indexable, non_indexable_reason,
          title, meta_description, canonical, canonical_header, meta_robots, x_robots_tag,
          word_count, has_js_rendering_diff, raw_html, rendered_html, text_only, simhash,
          internal_page_rank, inlink_count, outlink_count, desktop_screenshot_path, mobile_screenshot_path, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?
        )`,
      )
      .run(
        pageId,
        crawlId,
        pageData.url,
        pageData.finalUrl,
        pageData.urlHash,
        pageData.statusCode,
        pageData.contentType,
        pageData.charset || null,
        pageData.sizeBytes,
        pageData.ttfbMs,
        pageData.downloadTimeMs,
        pageData.totalTimeMs,
        pageData.crawlDepth,
        pageData.discoveredFrom || null,
        pageData.httpVersion || null,
        pageData.compression || null,
        pageData.serverHint || null,
        pageData.cdnHint || null,
        pageData.ipAddress || null,
        pageData.tls ? JSON.stringify(pageData.tls) : null,
        pageData.isIndexable ? 1 : 0,
        pageData.nonIndexableReason || null,
        pageData.title || null,
        pageData.metaDescription || null,
        pageData.canonical || null,
        pageData.canonicalHeader || null,
        pageData.metaRobots || null,
        pageData.xRobotsTag || null,
        pageData.wordCount,
        pageData.hasJsRenderingDiff ? 1 : 0,
        pageData.rawHtml || null,
        pageData.renderedHtml || null,
        pageData.textOnly || null,
        pageData.simhash || null,
        pageData.internalPageRank || 0,
        pageData.inlinkCount || 0,
        pageData.outlinkCount || 0,
        pageData.desktopScreenshotPath || null,
        pageData.mobileScreenshotPath || null,
        now,
      );

    // Headings
    const headingStmt = this.storage.prepare(
      `INSERT INTO headings (id, crawl_id, page_url, level, text, anchor_id) VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (let i = 0; i < pageData.headings.length; i++) {
      const h = pageData.headings[i];
      headingStmt.run(`${pageId}_h_${i}`, crawlId, pageData.url, h.level, h.text, h.id || null);
    }

    // Images
    const imgStmt = this.storage.prepare(
      `INSERT INTO images (id, crawl_id, page_url, src, alt, width, height, is_lazy, format, size_bytes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (let i = 0; i < pageData.images.length; i++) {
      const img = pageData.images[i];
      imgStmt.run(
        `${pageId}_img_${i}`,
        crawlId,
        pageData.url,
        img.src,
        img.alt,
        img.width || null,
        img.height || null,
        img.isLazy ? 1 : 0,
        img.format || null,
        img.sizeBytes || null,
      );
    }

    // Links
    const linkStmt = this.storage.prepare(
      `INSERT INTO links (id, crawl_id, source_url, target_url, anchor_text, rel, target, is_internal, position, nofollow)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (let i = 0; i < pageData.links.length; i++) {
      const l = pageData.links[i];
      linkStmt.run(
        `${pageId}_link_${i}`,
        crawlId,
        pageData.url,
        l.targetUrl,
        l.text,
        l.rel || null,
        l.target || null,
        l.isInternal ? 1 : 0,
        l.position || null,
        l.nofollow ? 1 : 0,
      );
    }

    // Structured data
    const sdStmt = this.storage.prepare(
      `INSERT INTO structured_data_items (id, crawl_id, page_url, format, schema_type, raw_json, is_valid)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    for (let i = 0; i < (pageData.jsonLdRaw || []).length; i++) {
      const item = pageData.jsonLdRaw[i] as Record<string, unknown>;
      sdStmt.run(
        `${pageId}_sd_${i}`,
        crawlId,
        pageData.url,
        'json-ld',
        String(item['@type'] || 'Thing'),
        JSON.stringify(item),
        1,
      );
    }
  }

  async getPage(crawlId: string, urlHash: string): Promise<PageRecord | null> {
    const row = this.storage
      .prepare<RawPageRow>(`SELECT * FROM pages WHERE crawl_id = ? AND url_hash = ?`)
      .get(crawlId, urlHash);
    return row ? mapPageRow(row) : null;
  }

  async listPages(crawlId: string, limit = 100, offset = 0): Promise<PageRecord[]> {
    const rows = this.storage
      .prepare<RawPageRow>(`SELECT * FROM pages WHERE crawl_id = ? LIMIT ? OFFSET ?`)
      .all(crawlId, limit, offset);
    return rows.map(mapPageRow);
  }

  async getPagesCount(crawlId: string): Promise<number> {
    const row = this.storage.prepare<{ count: number }>(`SELECT count(*) as count FROM pages WHERE crawl_id = ?`).get(crawlId);
    return row ? row.count : 0;
  }
}
