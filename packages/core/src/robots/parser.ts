import { AI_BOT_REGISTRY, type RobotsTxtData, type BotAccessStatus } from '@scrawl/shared';
import { HttpFetcher } from '../fetcher/http.js';

export interface UserAgentRules {
  allow: string[];
  disallow: string[];
  crawlDelay?: number;
}

export class RobotsParser {
  private rawContent: string;
  private sitemaps: string[] = [];
  private rulesPerUserAgent: Map<string, UserAgentRules> = new Map();
  private warnings: string[] = [];
  public exists: boolean;
  public statusCode: number;

  constructor(content = '', statusCode = 200) {
    this.rawContent = content;
    this.statusCode = statusCode;
    this.exists = statusCode === 200 && content.trim().length > 0;
    this.parse(content);
  }

  static async fetchAndParse(baseUrl: string, fetcher?: HttpFetcher): Promise<RobotsParser> {
    const f = fetcher || new HttpFetcher();
    const robotsUrl = new URL('/robots.txt', baseUrl).toString();
    const res = await f.fetch(robotsUrl);
    return new RobotsParser(res.bodyText || '', res.statusCode);
  }

  private parse(content: string): void {
    const lines = content.split(/\r?\n/);
    let currentUserAgents: string[] = [];
    let inRuleBlock = false;

    for (const rawLine of lines) {
      const line = rawLine.split('#')[0].trim();
      if (!line) continue;

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const field = line.slice(0, colonIdx).trim().toLowerCase();
      const value = line.slice(colonIdx + 1).trim();

      if (field === 'user-agent') {
        if (inRuleBlock) {
          currentUserAgents = [];
          inRuleBlock = false;
        }
        const ua = value.toLowerCase();
        currentUserAgents.push(ua);
        if (!this.rulesPerUserAgent.has(ua)) {
          this.rulesPerUserAgent.set(ua, { allow: [], disallow: [] });
        }
      } else if (field === 'sitemap') {
        if (value && !this.sitemaps.includes(value)) {
          this.sitemaps.push(value);
        }
      } else if (field === 'allow' || field === 'disallow') {
        inRuleBlock = true;
        const agents = currentUserAgents.length > 0 ? currentUserAgents : ['*'];
        for (const ua of agents) {
          if (!this.rulesPerUserAgent.has(ua)) {
            this.rulesPerUserAgent.set(ua, { allow: [], disallow: [] });
          }
          const ruleSet = this.rulesPerUserAgent.get(ua)!;
          if (field === 'allow') {
            if (value) ruleSet.allow.push(value);
          } else {
            if (value) ruleSet.disallow.push(value);
          }
        }
      } else if (field === 'crawl-delay') {
        inRuleBlock = true;
        const delay = parseFloat(value);
        if (!isNaN(delay)) {
          const agents = currentUserAgents.length > 0 ? currentUserAgents : ['*'];
          for (const ua of agents) {
            const ruleSet = this.rulesPerUserAgent.get(ua);
            if (ruleSet) {
              ruleSet.crawlDelay = delay;
            }
          }
        }
      }
    }
  }

  isAllowed(url: string, userAgent = '*'): boolean {
    if (!this.exists) return true;

    let path = url;
    try {
      path = new URL(url).pathname || '/';
    } catch {
      path = url.startsWith('/') ? url : '/' + url;
    }
    const ua = userAgent.toLowerCase();

    let ruleSet = this.rulesPerUserAgent.get(ua);
    if (!ruleSet) {
      for (const [key, rules] of this.rulesPerUserAgent.entries()) {
        if (key !== '*' && (ua.includes(key) || key.includes(ua))) {
          ruleSet = rules;
          break;
        }
      }
    }
    if (!ruleSet) {
      ruleSet = this.rulesPerUserAgent.get('*');
    }
    if (!ruleSet) return true;

    // Evaluate Disallow
    let longestMatchLen = -1;
    let isAllowed = true;

    for (const dis of ruleSet.disallow) {
      if (this.matchesPattern(path, dis)) {
        if (dis.length > longestMatchLen) {
          longestMatchLen = dis.length;
          isAllowed = false;
        }
      }
    }

    for (const all of ruleSet.allow) {
      if (this.matchesPattern(path, all)) {
        if (all.length >= longestMatchLen) {
          longestMatchLen = all.length;
          isAllowed = true;
        }
      }
    }

    return isAllowed;
  }

  private matchesPattern(path: string, pattern: string): boolean {
    if (!pattern) return false;
    // Basic regex conversion with wildcards
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    const regex = new RegExp('^' + escaped);
    return regex.test(path);
  }

  evaluateAiBotMatrix(): BotAccessStatus[] {
    return AI_BOT_REGISTRY.map((bot) => {
      const allowed = this.isAllowed('/', bot.userAgentSnippet);
      let notes = allowed ? 'Allowed to crawl root' : 'Blocked by robots.txt';

      if (!allowed && bot.defaultRecommendation === 'allow-search') {
        notes += ' (⚠️ Warning: Blocking this search bot hurts AI citation visibility)';
      }

      return {
        botId: bot.id,
        botName: bot.name,
        vendor: bot.vendor,
        purpose: bot.purpose,
        isAllowedRobotsTxt: allowed,
        notes,
      };
    });
  }

  getSitemaps(): string[] {
    return [...this.sitemaps];
  }

  toData(url: string): RobotsTxtData {
    const rulesObj: Record<string, { allow: string[]; disallow: string[]; crawlDelay?: number }> = {};
    for (const [ua, rules] of this.rulesPerUserAgent.entries()) {
      rulesObj[ua] = rules;
    }

    return {
      url,
      content: this.rawContent,
      exists: this.exists,
      statusCode: this.statusCode,
      sitemaps: this.sitemaps,
      rulesPerUserAgent: rulesObj,
      warnings: this.warnings,
    };
  }
}
