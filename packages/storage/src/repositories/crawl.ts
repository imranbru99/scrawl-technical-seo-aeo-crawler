import type { StorageDatabase } from '../database.js';

export interface CrawlRecord {
  id: string;
  projectId: string | null;
  startUrl: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  startedAt: string;
  completedAt: string | null;
  totalPages: number;
  crawlDepth: number;
  overallScore: number | null;
  grade: string | null;
  errorMessage: string | null;
}

interface RawCrawlRow {
  id: string;
  project_id: string | null;
  start_url: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  total_pages: number;
  crawl_depth: number;
  overall_score: number | null;
  grade: string | null;
  error_message: string | null;
}

function mapCrawlRow(row: RawCrawlRow): CrawlRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    startUrl: row.start_url,
    status: row.status as CrawlRecord['status'],
    startedAt: row.started_at,
    completedAt: row.completed_at,
    totalPages: row.total_pages,
    crawlDepth: row.crawl_depth,
    overallScore: row.overall_score,
    grade: row.grade,
    errorMessage: row.error_message,
  };
}

export interface CreateCrawlDto {
  id: string;
  projectId?: string;
  startUrl: string;
  configJson: string;
}

export class CrawlRepository {
  constructor(private storage: StorageDatabase) {}

  async createCrawl(dto: CreateCrawlDto): Promise<CrawlRecord | null> {
    const startedAt = new Date().toISOString();
    this.storage
      .prepare(
        `INSERT INTO crawls (id, project_id, start_url, status, started_at, total_pages, crawl_depth)
         VALUES (?, ?, ?, 'pending', ?, 0, 0)`,
      )
      .run(dto.id, dto.projectId || null, dto.startUrl, startedAt);

    this.storage
      .prepare(`INSERT INTO crawl_configs (crawl_id, config_json) VALUES (?, ?)`)
      .run(dto.id, dto.configJson);

    return this.getCrawl(dto.id);
  }

  async updateStatus(
    id: string,
    status: 'pending' | 'running' | 'completed' | 'failed' | 'paused',
    data: {
      totalPages?: number;
      crawlDepth?: number;
      overallScore?: number;
      grade?: string;
      errorMessage?: string;
    } = {},
  ): Promise<CrawlRecord | null> {
    const existing = await this.getCrawl(id);
    if (!existing) return null;

    const completedAt =
      status === 'completed' || status === 'failed' ? new Date().toISOString() : existing.completedAt;
    const totalPages = data.totalPages !== undefined ? data.totalPages : existing.totalPages;
    const crawlDepth = data.crawlDepth !== undefined ? data.crawlDepth : existing.crawlDepth;
    const overallScore = data.overallScore !== undefined ? data.overallScore : existing.overallScore;
    const grade = data.grade !== undefined ? data.grade : existing.grade;
    const errorMessage = data.errorMessage !== undefined ? data.errorMessage : existing.errorMessage;

    this.storage
      .prepare(
        `UPDATE crawls
         SET status = ?, completed_at = ?, total_pages = ?, crawl_depth = ?, overall_score = ?, grade = ?, error_message = ?
         WHERE id = ?`,
      )
      .run(status, completedAt, totalPages, crawlDepth, overallScore, grade, errorMessage, id);

    return this.getCrawl(id);
  }

  async getCrawl(id: string): Promise<CrawlRecord | null> {
    const row = this.storage.prepare<RawCrawlRow>(`SELECT * FROM crawls WHERE id = ?`).get(id);
    return row ? mapCrawlRow(row) : null;
  }

  async listCrawls(limit = 50): Promise<CrawlRecord[]> {
    const rows = this.storage.prepare<RawCrawlRow>(`SELECT * FROM crawls ORDER BY started_at DESC LIMIT ?`).all(limit);
    return rows.map(mapCrawlRow);
  }
}
