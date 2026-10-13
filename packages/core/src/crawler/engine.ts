import {
  normalizeUrl,
  isInternalUrl,
  sha256,
  type PageData,
  type RobotsTxtData,
  type SitemapData,
  type LinkGraphData,
} from '@scrawl/shared';
import type { ScrawlConfigParsed } from '@scrawl/config';
import { StorageDatabase, PageRepository, CrawlRepository } from '@scrawl/storage';
import { HttpFetcher } from '../fetcher/http.js';
import { HtmlParser } from '../parser/html.js';
import { RobotsParser } from '../robots/parser.js';
import { SitemapDiscoverer } from '../sitemap/discoverer.js';
import { LinkGraphBuilder } from '../graph/link-graph.js';

export interface CrawlerEventHandlers {
  onPageCrawled?: (page: PageData, progress: { current: number; total: number; queued: number }) => void;
  onError?: (url: string, error: string) => void;
  onLog?: (message: string) => void;
}

export interface CrawlEngineResult {
  crawlId: string;
  pages: PageData[];
  robotsTxt?: RobotsTxtData;
  sitemaps: SitemapData[];
  linkGraph: LinkGraphData;
  durationMs: number;
}

export class CrawlEngine {
  private config: ScrawlConfigParsed;
  private fetcher: HttpFetcher;
  private parser: HtmlParser;
  private storage: StorageDatabase;
  private crawlRepo: CrawlRepository;
  private pageRepo: PageRepository;
  private isPaused = false;
  private isCancelled = false;

  constructor(config: ScrawlConfigParsed, storage?: StorageDatabase) {
    this.config = config;
    this.storage =
      storage ||
      new StorageDatabase({
        path: config.storage.filePath,
        inMemory: config.storage.driver === 'memory',
      });
    this.crawlRepo = new CrawlRepository(this.storage);
    this.pageRepo = new PageRepository(this.storage);
    this.fetcher = new HttpFetcher({
      userAgent: config.userAgent,
      timeoutMs: config.timeoutMs,
      allowPrivateIps: config.allowPrivateIps,
      headers: config.headers,
    });
    this.parser = new HtmlParser();
  }

  async run(crawlId: string, events: CrawlerEventHandlers = {}): Promise<CrawlEngineResult> {
    const startTime = Date.now();
    events.onLog?.(`Starting crawl ${crawlId} for [${this.config.startUrls.join(', ')}]`);

    await this.crawlRepo.createCrawl({
      id: crawlId,
      startUrl: this.config.startUrls[0],
      configJson: JSON.stringify(this.config),
    });
    await this.crawlRepo.updateStatus(crawlId, 'running');

    const primaryOrigin = new URL(this.config.startUrls[0]).origin;

    // 1. Fetch & Parse robots.txt
    let robotsParser: RobotsParser | undefined;
    let robotsData: RobotsTxtData | undefined;
    if (this.config.respectRobotsTxt) {
      try {
        robotsParser = await RobotsParser.fetchAndParse(primaryOrigin, this.fetcher);
        robotsData = robotsParser.toData(`${primaryOrigin}/robots.txt`);
        events.onLog?.(
          `robots.txt evaluated: ${robotsData.exists ? 'Found' : 'Not found'} (sitemaps: ${robotsData.sitemaps.length})`,
        );
      } catch (err: unknown) {
        events.onError?.(`${primaryOrigin}/robots.txt`, String(err));
      }
    }

    // 2. Discover Sitemaps
    const sitemaps: SitemapData[] = [];
    const sitemapDiscoverer = new SitemapDiscoverer(this.fetcher);
    const candidateSitemaps = [...(robotsData?.sitemaps || []), `${primaryOrigin}/sitemap.xml`];
    for (const smUrl of candidateSitemaps) {
      try {
        const discovered = await sitemapDiscoverer.discoverAndParse(smUrl, 1);
        sitemaps.push(...discovered);
      } catch {
        // ignore sitemap error
      }
    }

    // 3. Initialize Queue
    const visited = new Set<string>();
    const queue: Array<{ url: string; depth: number; discoveredFrom?: string }> = [];

    // Seed start URLs
    for (const startUrl of this.config.startUrls) {
      const norm = normalizeUrl(startUrl, {
        stripTrailingSlash: this.config.trailingSlashPolicy === 'remove',
        stripParams: this.config.stripQueryParams,
      });
      queue.push({ url: norm, depth: 0 });
      visited.add(norm);
    }

    // Optionally seed sitemap URLs
    if (this.config.sitemapOnly || sitemaps.length > 0) {
      for (const sm of sitemaps) {
        for (const entry of sm.entries) {
          const norm = normalizeUrl(entry.loc, {
            stripTrailingSlash: this.config.trailingSlashPolicy === 'remove',
            stripParams: this.config.stripQueryParams,
          });
          if (!visited.has(norm) && isInternalUrl(norm, primaryOrigin, this.config.allowSubdomains)) {
            if (this.config.sitemapOnly) {
              queue.push({ url: norm, depth: 1, discoveredFrom: sm.url });
              visited.add(norm);
            }
          }
        }
      }
    }

    const crawledPages: PageData[] = [];
    const maxPages = this.config.maxPages;
    const maxDepth = this.config.maxDepth;

    // 4. Crawl Loop with Concurrency
    while (queue.length > 0 && crawledPages.length < maxPages && !this.isCancelled) {
      if (this.isPaused) {
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }

      const batch = queue.splice(0, this.config.concurrency);
      const batchPromises = batch.map(async (item) => {
        if (crawledPages.length >= maxPages) return;

        // Check robots.txt
        if (robotsParser && !robotsParser.isAllowed(item.url, this.config.userAgent)) {
          events.onLog?.(`Skipping ${item.url} (disallowed by robots.txt)`);
          return;
        }

        // Fetch
        const fetchRes = await this.fetcher.fetch(item.url);

        // Parse
        const pageData = this.parser.parse(fetchRes, {
          baseOrigin: primaryOrigin,
          allowSubdomains: this.config.allowSubdomains,
          crawlDepth: item.depth,
          discoveredFrom: item.discoveredFrom,
        });

        // Save page to storage
        await this.pageRepo.savePage(crawlId, pageData);
        crawledPages.push(pageData);

        events.onPageCrawled?.(pageData, {
          current: crawledPages.length,
          total: maxPages,
          queued: queue.length,
        });

        // Politeness Delay
        if (this.config.delayMs > 0) {
          await new Promise((r) => setTimeout(r, this.config.delayMs));
        }

        // Enqueue discovered internal links if within maxDepth
        if (item.depth < maxDepth && !this.config.sitemapOnly) {
          for (const link of pageData.links) {
            if (link.isInternal) {
              const norm = normalizeUrl(link.targetUrl, {
                stripTrailingSlash: this.config.trailingSlashPolicy === 'remove',
                stripParams: this.config.stripQueryParams,
              });
              if (!visited.has(norm)) {
                visited.add(norm);
                queue.push({ url: norm, depth: item.depth + 1, discoveredFrom: item.url });
              }
            }
          }
        }
      });

      await Promise.all(batchPromises);
    }

    // 5. Build Link Graph & Compute PageRank
    events.onLog?.('Calculating internal link graph and PageRank scores...');
    const graphBuilder = new LinkGraphBuilder();
    graphBuilder.addPages(crawledPages);
    const linkGraph = graphBuilder.buildGraph(this.config.startUrls[0]);

    // Update crawl status
    await this.crawlRepo.updateStatus(crawlId, 'completed', {
      totalPages: crawledPages.length,
      crawlDepth: Math.max(...crawledPages.map((p) => p.crawlDepth), 0),
    });

    const durationMs = Date.now() - startTime;
    events.onLog?.(`Crawl completed: ${crawledPages.length} pages in ${Math.round(durationMs / 1000)}s`);

    return {
      crawlId,
      pages: crawledPages,
      robotsTxt: robotsData,
      sitemaps,
      linkGraph,
      durationMs,
    };
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  cancel(): void {
    this.isCancelled = true;
  }
}
