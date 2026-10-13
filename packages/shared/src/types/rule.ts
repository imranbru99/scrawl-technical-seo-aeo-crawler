export type Category =
  | 'technical'
  | 'onpage'
  | 'content'
  | 'aeo'
  | 'performance'
  | 'security'
  | 'structured-data'
  | 'international'
  | 'accessibility'
  | 'social';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'pass';

export type Scope = 'page' | 'site' | 'cross-page';

export type Effort = 'trivial' | 'easy' | 'moderate' | 'hard';

export interface Impact {
  seo: 0 | 1 | 2 | 3;
  aeo: 0 | 1 | 2 | 3;
  ux: 0 | 1 | 2 | 3;
}

export interface Finding {
  ruleId: string;
  url: string;
  selector?: string;
  found: string;
  expected: string;
  evidence: string;
  fixSteps: string[];
  codeExample?: string;
}

export interface RuleContext {
  page: import('./crawl.js').PageData;
  sitePages?: import('./crawl.js').PageData[];
  robotsTxt?: import('./crawl.js').RobotsTxtData;
  sitemaps?: import('./crawl.js').SitemapData[];
  llmsTxt?: import('./aeo.js').LlmsTxtResult;
  linkGraph?: import('./crawl.js').LinkGraphData;
  config?: Record<string, unknown>;
}

export interface Rule {
  id: string; // e.g. "TECH-CANON-003"
  category: Category;
  severity: Severity;
  scope: Scope;
  title: string;
  description: string;
  impact: Impact;
  effort: Effort;
  docsUrl: string;
  run(ctx: RuleContext): Finding[];
}
