import type { Category, Severity } from '../types/rule.js';

export const DEFAULT_CATEGORY_WEIGHTS: Record<Category, number> = {
  technical: 30, // Crawlability & Indexability / Technical Health
  onpage: 14,
  content: 10,
  performance: 12,
  security: 6,
  'structured-data': 8,
  aeo: 14,
  international: 2,
  accessibility: 2,
  social: 2,
};

export const STANDARD_CATEGORY_WEIGHTS: Record<Category, number> = {
  technical: 30, // Crawlability, Indexability & Technical Health (18 + 12)
  onpage: 14,
  content: 10,
  aeo: 14,
  performance: 12,
  'structured-data': 8,
  security: 6,
  international: 2,
  accessibility: 2,
  social: 2,
};

export const SEVERITY_PENALTIES: Record<Severity, number> = {
  critical: 10,
  high: 6,
  medium: 3,
  low: 1,
  info: 0,
  pass: 0,
};

export const USER_AGENT_PRESETS: Record<string, string> = {
  scrawl: 'Scrawl-Bot/1.0 (+https://github.com/scrawl-seo/scrawl; info@scrawl-seo.org)',
  'googlebot-desktop': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'googlebot-smartphone':
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  bingbot: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  gptbot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
  claudebot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  perplexitybot:
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
  'google-extended': 'Google-Extended/1.0',
};

export const DEFAULT_CRAWL_OPTIONS = {
  maxPages: 100,
  maxDepth: 5,
  concurrency: 5,
  delayMs: 200,
  timeoutMs: 15000,
  renderMode: 'auto' as const,
  respectRobotsTxt: true,
  allowSubdomains: false,
  userAgent: USER_AGENT_PRESETS.scrawl,
  allowPrivateIps: false,
};
