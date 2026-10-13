import type { Category, Severity } from './rule.js';

export type Grade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface CategoryScore {
  category: Category;
  score: number; // 0 - 100
  weight: number; // e.g. 18
  weightedScore: number;
  grade: Grade;
  issuesCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  deductions: Array<{
    ruleId: string;
    title: string;
    severity: Severity;
    penalty: number;
    prevalence: number;
    pointsLost: number;
    affectedUrlsCount: number;
  }>;
}

export interface PriorityIssue {
  ruleId: string;
  title: string;
  category: Category;
  severity: Severity;
  priorityScore: number; // 0 - 100
  impact: 'high' | 'medium' | 'low';
  effort: 'trivial' | 'easy' | 'moderate' | 'hard';
  matrixQuadrant: 'quick-win' | 'major-project' | 'fill-in' | 'thankless-task';
  affectedUrls: string[];
  affectedCount: number;
  fixSummary: string;
}

export interface RankingPotentialScore {
  url: string;
  score: number; // 0 - 100
  grade: Grade;
  breakdown: {
    keywordAlignment: number;
    contentDepth: number;
    internalPageRank: number;
    cwvStatus: number;
    indexability: number;
    schemaRichResult: number;
    eeatSignals: number;
    freshness: number;
    gscOpportunity?: number;
  };
  notes: string[];
}

export interface SpecializedScores {
  indexabilityScore: number;
  crawlEfficiencyScore: number;
  linkEquityDistributionScore: number;
  contentUniquenessScore: number;
  schemaCoverageScore: number;
  mobileReadinessScore: number;
  securityScore: number;
  freshnessScore: number;
  eeatScore: number;
  aiCrawlabilityScore: number;
  answerReadinessScore: number;
  citationWorthinessScore: number;
  topicalAuthorityScore: number;
}

export interface ScoreResult {
  overallScore: number; // 0 - 100
  grade: Grade;
  categoryScores: Record<Category, CategoryScore>;
  specializedScores: SpecializedScores;
  priorityIssues: PriorityIssue[];
  topDeductions: Array<{
    ruleId: string;
    title: string;
    category: Category;
    pointsLost: number;
  }>;
  totalIssuesCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}
