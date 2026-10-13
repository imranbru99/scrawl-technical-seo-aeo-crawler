import type { StorageDatabase } from '../database.js';
import type { Finding, Rule, Severity, Category } from '@scrawl/shared';

export interface IssueRecord {
  id: string;
  crawlId: string;
  ruleId: string;
  category: Category;
  severity: Severity;
  title: string;
  description: string;
  affectedCount: number;
  pointsLost: number;
  priorityScore: number;
  fixSteps: string[];
  codeExample: string | null;
}

export interface IssueInstanceRecord {
  id: string;
  issueId: string;
  crawlId: string;
  url: string;
  selector: string | null;
  found: string;
  expected: string;
  evidence: string;
}

interface RawIssueRow {
  id: string;
  crawl_id: string;
  rule_id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  affected_count: number;
  points_lost: number;
  priority_score: number;
  fix_steps_json: string;
  code_example: string | null;
}

interface RawIssueInstanceRow {
  id: string;
  issue_id: string;
  crawl_id: string;
  url: string;
  selector: string | null;
  found: string;
  expected: string;
  evidence: string;
}

function mapIssueRow(row: RawIssueRow): IssueRecord {
  return {
    id: row.id,
    crawlId: row.crawl_id,
    ruleId: row.rule_id,
    category: row.category as Category,
    severity: row.severity as Severity,
    title: row.title,
    description: row.description,
    affectedCount: row.affected_count,
    pointsLost: row.points_lost,
    priorityScore: row.priority_score,
    fixSteps: JSON.parse(row.fix_steps_json || '[]'),
    codeExample: row.code_example,
  };
}

function mapInstanceRow(row: RawIssueInstanceRow): IssueInstanceRecord {
  return {
    id: row.id,
    issueId: row.issue_id,
    crawlId: row.crawl_id,
    url: row.url,
    selector: row.selector,
    found: row.found,
    expected: row.expected,
    evidence: row.evidence,
  };
}

export interface SaveFindingsDto {
  crawlId: string;
  rule: Rule;
  findings: Finding[];
  pointsLost?: number;
  priorityScore?: number;
}

export class IssueRepository {
  constructor(private storage: StorageDatabase) {}

  async saveRuleFindings(dto: SaveFindingsDto): Promise<void> {
    if (dto.findings.length === 0) return;

    const issueId = `${dto.crawlId}_${dto.rule.id}`;
    const firstFinding = dto.findings[0];

    this.storage
      .prepare(
        `INSERT INTO issues (
          id, crawl_id, rule_id, category, severity, title, description,
          affected_count, points_lost, priority_score, fix_steps_json, code_example
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        issueId,
        dto.crawlId,
        dto.rule.id,
        dto.rule.category,
        dto.rule.severity,
        dto.rule.title,
        dto.rule.description,
        dto.findings.length,
        dto.pointsLost || 0,
        dto.priorityScore || 0,
        JSON.stringify(firstFinding.fixSteps || []),
        firstFinding.codeExample || null,
      );

    const instStmt = this.storage.prepare(
      `INSERT INTO issue_instances (id, issue_id, crawl_id, url, selector, found, expected, evidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (let i = 0; i < dto.findings.length; i++) {
      const f = dto.findings[i];
      instStmt.run(
        `${issueId}_inst_${i}`,
        issueId,
        dto.crawlId,
        f.url,
        f.selector || null,
        f.found,
        f.expected,
        f.evidence,
      );
    }
  }

  async getIssuesByCrawl(crawlId: string): Promise<IssueRecord[]> {
    const rows = this.storage
      .prepare<RawIssueRow>(`SELECT * FROM issues WHERE crawl_id = ? ORDER BY points_lost DESC, affected_count DESC`)
      .all(crawlId);
    return rows.map(mapIssueRow);
  }

  async getInstancesForIssue(issueId: string): Promise<IssueInstanceRecord[]> {
    const rows = this.storage.prepare<RawIssueInstanceRow>(`SELECT * FROM issue_instances WHERE issue_id = ?`).all(issueId);
    return rows.map(mapInstanceRow);
  }

  async getInstancesByCrawl(crawlId: string): Promise<IssueInstanceRecord[]> {
    const rows = this.storage.prepare<RawIssueInstanceRow>(`SELECT * FROM issue_instances WHERE crawl_id = ?`).all(crawlId);
    return rows.map(mapInstanceRow);
  }
}
