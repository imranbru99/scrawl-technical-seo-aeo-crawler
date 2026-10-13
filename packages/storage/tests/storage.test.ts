import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StorageDatabase, CrawlRepository, PageRepository, IssueRepository, ScoreRepository } from '../src/index.js';
import type { PageData, Rule, Finding, ScoreResult } from '@scrawl/shared';

describe('Storage Engine (SQLite & Drizzle)', () => {
  let db: StorageDatabase;
  let crawlRepo: CrawlRepository;
  let pageRepo: PageRepository;
  let issueRepo: IssueRepository;
  let scoreRepo: ScoreRepository;

  beforeEach(() => {
    db = new StorageDatabase({ inMemory: true });
    crawlRepo = new CrawlRepository(db);
    pageRepo = new PageRepository(db);
    issueRepo = new IssueRepository(db);
    scoreRepo = new ScoreRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates, retrieves and updates a crawl record', async () => {
    const crawl = await crawlRepo.createCrawl({
      id: 'crawl_test_1',
      startUrl: 'https://example.com',
      configJson: JSON.stringify({ maxPages: 10 }),
    });

    expect(crawl).toBeDefined();
    expect(crawl?.status).toBe('pending');
    expect(crawl?.startUrl).toBe('https://example.com');

    const updated = await crawlRepo.updateStatus('crawl_test_1', 'completed', {
      totalPages: 5,
      crawlDepth: 2,
      overallScore: 92.5,
      grade: 'A',
    });

    expect(updated?.status).toBe('completed');
    expect(updated?.totalPages).toBe(5);
    expect(updated?.overallScore).toBe(92.5);
    expect(updated?.grade).toBe('A');
  });

  it('saves and retrieves page data with headings and links', async () => {
    await crawlRepo.createCrawl({
      id: 'crawl_test_2',
      startUrl: 'https://example.com',
      configJson: '{}',
    });

    const mockPage: PageData = {
      url: 'https://example.com/about',
      finalUrl: 'https://example.com/about',
      urlHash: 'hash_about',
      statusCode: 200,
      contentType: 'text/html',
      charset: 'utf-8',
      sizeBytes: 1024,
      ttfbMs: 120,
      downloadTimeMs: 40,
      totalTimeMs: 160,
      crawlDepth: 1,
      isIndexable: true,
      requestHeaders: {},
      responseHeaders: {},
      headings: [{ level: 1, text: 'About Us' }],
      links: [
        {
          url: 'https://example.com/about',
          targetUrl: 'https://example.com/contact',
          text: 'Contact',
          isInternal: true,
        },
      ],
      images: [],
      resources: [],
      consoleErrors: [],
      hreflang: [],
      openGraph: {},
      twitterCard: {},
      jsonLdRaw: [],
      microdataRaw: [],
      wordCount: 250,
    };

    await pageRepo.savePage('crawl_test_2', mockPage);
    const count = await pageRepo.getPagesCount('crawl_test_2');
    expect(count).toBe(1);

    const saved = await pageRepo.getPage('crawl_test_2', 'hash_about');
    expect(saved).toBeDefined();
    expect(saved?.statusCode).toBe(200);
    expect(saved?.isIndexable).toBe(true);
  });

  it('saves and queries rule findings and score breakdowns', async () => {
    await crawlRepo.createCrawl({
      id: 'crawl_test_3',
      startUrl: 'https://example.com',
      configJson: '{}',
    });

    const mockRule: Rule = {
      id: 'TECH-CANON-001',
      category: 'technical',
      severity: 'critical',
      scope: 'page',
      title: 'Missing canonical tag',
      description: 'Page has no canonical tag',
      impact: { seo: 3, aeo: 2, ux: 0 },
      effort: 'trivial',
      docsUrl: 'https://scrawl-seo.org/rules/TECH-CANON-001',
      run: () => [],
    };

    const mockFindings: Finding[] = [
      {
        ruleId: 'TECH-CANON-001',
        url: 'https://example.com/page1',
        found: 'No canonical tag found',
        expected: 'Canonical tag pointing to self or preferred URL',
        evidence: 'HTML head does not contain <link rel="canonical">',
        fixSteps: ['Add <link rel="canonical" href="..."> to <head>'],
      },
    ];

    await issueRepo.saveRuleFindings({
      crawlId: 'crawl_test_3',
      rule: mockRule,
      findings: mockFindings,
      pointsLost: 10,
      priorityScore: 85,
    });

    const issues = await issueRepo.getIssuesByCrawl('crawl_test_3');
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe('TECH-CANON-001');
    expect(issues[0].severity).toBe('critical');

    const instances = await issueRepo.getInstancesForIssue(issues[0].id);
    expect(instances.length).toBe(1);
    expect(instances[0].url).toBe('https://example.com/page1');
  });
});
