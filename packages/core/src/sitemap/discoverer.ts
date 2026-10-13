import * as cheerio from 'cheerio';
import type { SitemapData, SitemapEntry } from '@scrawl/shared';
import { HttpFetcher } from '../fetcher/http.js';

export class SitemapDiscoverer {
  constructor(private fetcher: HttpFetcher = new HttpFetcher()) {}

  async discoverAndParse(sitemapUrl: string, maxDepth = 2): Promise<SitemapData[]> {
    const results: SitemapData[] = [];
    const visited = new Set<string>();

    const queue: Array<{ url: string; depth: number }> = [{ url: sitemapUrl, depth: 0 }];

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (visited.has(item.url)) continue;
      visited.add(item.url);

      const res = await this.fetcher.fetch(item.url);
      if (res.statusCode !== 200 || !res.bodyText) {
        results.push({
          url: item.url,
          type: 'sitemap',
          entries: [],
          nestedSitemaps: [],
          isValid: false,
          errors: [`HTTP error status ${res.statusCode}`],
        });
        continue;
      }

      const xml = res.bodyText;
      const $ = cheerio.load(xml, { xmlMode: true });

      const isIndex = $('sitemapindex').length > 0;
      const entries: SitemapEntry[] = [];
      const nested: string[] = [];
      const errors: string[] = [];

      if (isIndex) {
        $('sitemap > loc').each((_, el) => {
          const loc = $(el).text().trim();
          if (loc) {
            nested.push(loc);
            if (item.depth < maxDepth) {
              queue.push({ url: loc, depth: item.depth + 1 });
            }
          }
        });

        results.push({
          url: item.url,
          type: 'sitemapindex',
          entries: [],
          nestedSitemaps: nested,
          isValid: nested.length > 0,
          errors,
        });
      } else {
        $('url').each((_, el) => {
          const loc = $(el).find('loc').text().trim();
          const lastmod = $(el).find('lastmod').text().trim() || undefined;
          const changefreq = $(el).find('changefreq').text().trim() || undefined;
          const priorityRaw = $(el).find('priority').text().trim();
          const priority = priorityRaw ? parseFloat(priorityRaw) : undefined;

          if (loc) {
            entries.push({ loc, lastmod, changefreq, priority });
          }
        });

        if (entries.length > 50000) {
          errors.push('Sitemap contains more than 50,000 URLs, exceeding standard limit.');
        }

        results.push({
          url: item.url,
          type: 'sitemap',
          entries,
          nestedSitemaps: [],
          isValid: entries.length > 0,
          errors,
        });
      }
    }

    return results;
  }
}
