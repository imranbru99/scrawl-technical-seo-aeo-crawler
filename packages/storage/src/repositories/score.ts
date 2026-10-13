import type { StorageDatabase } from '../database.js';
import type { ScoreResult } from '@scrawl/shared';

export interface ScoreRecord {
  id: string;
  crawl_id: string;
  overall_score: number;
  grade: string;
  category_scores_json: string;
  specialized_scores_json: string;
  top_deductions_json: string;
  created_at: string;
}

export class ScoreRepository {
  constructor(private storage: StorageDatabase) {}

  async saveScore(crawlId: string, result: ScoreResult): Promise<void> {
    const scoreId = `${crawlId}_score`;
    const createdAt = new Date().toISOString();

    this.storage
      .prepare(
        `INSERT INTO scores (
          id, crawl_id, overall_score, grade, category_scores_json,
          specialized_scores_json, top_deductions_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        scoreId,
        crawlId,
        result.overallScore,
        result.grade,
        JSON.stringify(result.categoryScores),
        JSON.stringify(result.specializedScores),
        JSON.stringify(result.topDeductions),
        createdAt,
      );
  }

  async getScoreByCrawl(crawlId: string) {
    const row = this.storage.prepare<ScoreRecord>(`SELECT * FROM scores WHERE crawl_id = ?`).get(crawlId);
    if (!row) return null;

    return {
      id: row.id,
      crawlId: row.crawl_id,
      overallScore: row.overall_score,
      grade: row.grade,
      categoryScores: JSON.parse(row.category_scores_json),
      specializedScores: JSON.parse(row.specialized_scores_json),
      topDeductions: JSON.parse(row.top_deductions_json),
      createdAt: row.created_at,
    };
  }

  async getScoreHistory(limit = 20) {
    const rows = this.storage
      .prepare<ScoreRecord>(`SELECT * FROM scores ORDER BY created_at DESC LIMIT ?`)
      .all(limit);
    return rows.map((r) => ({
      crawlId: r.crawl_id,
      overallScore: r.overall_score,
      grade: r.grade,
      categoryScores: JSON.parse(r.category_scores_json),
      createdAt: r.created_at,
    }));
  }
}
