import type { Category, Severity } from './rule.js';
import type { IntentType } from './keyword.js';

export interface ViewportConfig {
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
}

export interface TargetKeywordConfig {
  keyword: string;
  url: string;
  intent?: IntentType;
  priority?: 'high' | 'medium' | 'low';
}

export interface ScrawlConfig {
  startUrls: string[];
  maxPages?: number;
  maxDepth?: number;
  concurrency?: number;
  delayMs?: number;
  timeoutMs?: number;
  userAgent?: string;
  renderMode?: 'auto' | 'always' | 'never';
  respectRobotsTxt?: boolean;
  allowSubdomains?: boolean;
  sitemapOnly?: boolean;
  includePatterns?: string[];
  excludePatterns?: string[];
  stripQueryParams?: string[];
  trailingSlashPolicy?: 'ignore' | 'require' | 'remove';
  allowPrivateIps?: boolean;

  // Authentication & Custom headers
  headers?: Record<string, string>;
  auth?: {
    type: 'basic' | 'bearer' | 'cookie';
    credentials?: string;
    token?: string;
    cookies?: Array<{ name: string; value: string; domain?: string; path?: string }>;
  };

  // Viewport & device
  viewport?: ViewportConfig;
  mobile?: boolean;
  locale?: string;

  // Audit Rule Toggles & Severity Overrides
  rules?: {
    enabled?: string[];
    disabled?: string[];
    severityOverrides?: Record<string, Severity>;
  };

  // Score weight overrides (must sum to 100)
  weights?: Partial<Record<Category, number>>;

  // CI Thresholds
  ci?: {
    failUnderScore?: number;
    failOnSeverity?: Severity;
    alertRegressionPoints?: number;
  };

  // Keywords & Competitors
  keywords?: TargetKeywordConfig[];
  brandTerms?: string[];
  competitors?: string[];
  targetCountry?: string;

  // Reporters
  reporters?: {
    formats?: Array<'html' | 'json' | 'csv' | 'md' | 'pdf' | 'sarif' | 'junit'>;
    outDir?: string;
    logoUrl?: string;
    brandName?: string;
    brandColor?: string;
  };

  // Storage
  storage?: {
    driver: 'sqlite' | 'memory' | 'postgres';
    filePath?: string;
    connectionString?: string;
  };

  // Integrations & AI
  integrations?: {
    googleSearchConsole?: { credentialsJsonPath?: string; siteUrl?: string };
    bingWebmaster?: { apiKey?: string; siteUrl?: string };
    googleAnalytics4?: { propertyId?: string };
    cruxApiKey?: string;
    serpApiKey?: string;
    indexNowKey?: string;
  };

  ai?: {
    provider?: 'openai' | 'gemini' | 'anthropic' | 'ollama' | 'none';
    apiKey?: string;
    model?: string;
    endpoint?: string;
  };
}
