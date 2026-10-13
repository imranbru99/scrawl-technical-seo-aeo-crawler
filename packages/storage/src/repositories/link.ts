import type { StorageDatabase } from '../database.js';

export interface LinkRecord {
  id: string;
  crawl_id: string;
  source_url: string;
  target_url: string;
  anchor_text: string;
  rel: string | null;
  target: string | null;
  is_internal: number;
  position: string | null;
  nofollow: number;
}

export class LinkRepository {
  constructor(private storage: StorageDatabase) {}

  async getInternalLinks(crawlId: string): Promise<LinkRecord[]> {
    return this.storage
      .prepare<LinkRecord>(`SELECT * FROM links WHERE crawl_id = ? AND is_internal = 1`)
      .all(crawlId);
  }

  async getInlinksForUrl(crawlId: string, targetUrl: string): Promise<LinkRecord[]> {
    return this.storage
      .prepare<LinkRecord>(`SELECT * FROM links WHERE crawl_id = ? AND target_url = ?`)
      .all(crawlId, targetUrl);
  }

  async getOutlinksForUrl(crawlId: string, sourceUrl: string): Promise<LinkRecord[]> {
    return this.storage
      .prepare<LinkRecord>(`SELECT * FROM links WHERE crawl_id = ? AND source_url = ?`)
      .all(crawlId, sourceUrl);
  }
}
