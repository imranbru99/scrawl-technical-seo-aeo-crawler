import { describe, it, expect } from 'vitest';
import { HtmlParser, RobotsParser, LinkGraphBuilder, type FetchResult } from '../src/index.js';

describe('Core Crawler Components', () => {
  it('parses HTML accurately for headings, links, canonicals, and images', () => {
    const parser = new HtmlParser();
    const mockFetch: FetchResult = {
      url: 'https://example.com/blog/seo',
      finalUrl: 'https://example.com/blog/seo',
      statusCode: 200,
      requestHeaders: {},
      responseHeaders: {},
      redirectHops: [],
      ttfbMs: 50,
      downloadTimeMs: 20,
      totalTimeMs: 70,
      sizeBytes: 2048,
      contentType: 'text/html',
      charset: 'utf-8',
      bodyText: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Advanced SEO & AEO Guide</title>
          <meta name="description" content="A comprehensive guide to technical SEO and AEO.">
          <link rel="canonical" href="https://example.com/blog/seo">
        </head>
        <body>
          <header><nav><a href="/pricing">Pricing</a></nav></header>
          <main>
            <h1>Understanding 2027 AI Search</h1>
            <p>Generative search engines need extractable direct answers and clean semantic HTML.</p>
            <h2>Passage Extractability</h2>
            <img src="/assets/diagram.png" alt="SEO Flow Diagram" width="800" height="400">
            <a href="https://external.com" rel="nofollow" target="_blank">External Reference</a>
          </main>
        </body>
        </html>
      `,
    };

    const parsed = parser.parse(mockFetch, { baseOrigin: 'https://example.com' });

    expect(parsed.title).toBe('Advanced SEO & AEO Guide');
    expect(parsed.metaDescription).toBe('A comprehensive guide to technical SEO and AEO.');
    expect(parsed.canonical).toBe('https://example.com/blog/seo');
    expect(parsed.isIndexable).toBe(true);

    expect(parsed.headings.length).toBe(2);
    expect(parsed.headings[0]).toEqual({ level: 1, text: 'Understanding 2027 AI Search', id: undefined });

    expect(parsed.links.length).toBe(2);
    const internalLink = parsed.links.find((l) => l.isInternal);
    expect(internalLink?.targetUrl).toBe('https://example.com/pricing');
    expect(internalLink?.position).toBe('nav');

    expect(parsed.images.length).toBe(1);
    expect(parsed.images[0].alt).toBe('SEO Flow Diagram');
    expect(parsed.images[0].width).toBe(800);
  });

  it('evaluates robots.txt rules and AI bot access matrix', () => {
    const robotsContent = `
      User-agent: *
      Disallow: /admin/
      Disallow: /private/

      User-agent: GPTBot
      Disallow: /

      User-agent: ChatGPT-User
      Allow: /

      User-agent: PerplexityBot
      Allow: /

      Sitemap: https://example.com/sitemap.xml
    `;

    const parser = new RobotsParser(robotsContent, 200);
    expect(parser.exists).toBe(true);
    expect(parser.getSitemaps()).toEqual(['https://example.com/sitemap.xml']);

    expect(parser.isAllowed('https://example.com/blog/guide', '*')).toBe(true);
    expect(parser.isAllowed('https://example.com/admin/settings', '*')).toBe(false);

    // AI bots
    expect(parser.isAllowed('https://example.com/', 'GPTBot')).toBe(false);
    expect(parser.isAllowed('https://example.com/', 'ChatGPT-User')).toBe(true);
    expect(parser.isAllowed('https://example.com/', 'PerplexityBot')).toBe(true);

    const botMatrix = parser.evaluateAiBotMatrix();
    const gpt = botMatrix.find((b) => b.botId === 'gptbot');
    const perplexity = botMatrix.find((b) => b.botId === 'perplexitybot');

    expect(gpt?.isAllowedRobotsTxt).toBe(false);
    expect(perplexity?.isAllowedRobotsTxt).toBe(true);
  });

  it('computes internal PageRank and detects orphan pages', () => {
    const graph = new LinkGraphBuilder();

    const pHome = {
      finalUrl: 'https://example.com/',
      links: [
        { isInternal: true, targetUrl: 'https://example.com/about' },
        { isInternal: true, targetUrl: 'https://example.com/blog' },
      ],
      crawlDepth: 0,
    } as any;

    const pAbout = {
      finalUrl: 'https://example.com/about',
      links: [{ isInternal: true, targetUrl: 'https://example.com/' }],
      crawlDepth: 1,
    } as any;

    const pBlog = {
      finalUrl: 'https://example.com/blog',
      links: [{ isInternal: true, targetUrl: 'https://example.com/about' }],
      crawlDepth: 1,
    } as any;

    const pOrphan = {
      finalUrl: 'https://example.com/orphan',
      links: [],
      crawlDepth: 2,
    } as any;

    graph.addPages([pHome, pAbout, pBlog, pOrphan]);
    const res = graph.buildGraph('https://example.com/');

    expect(res.orphans).toContain('https://example.com/orphan');
    const homePr = res.nodes.get('https://example.com/')?.pageRank || 0;
    const orphanPr = res.nodes.get('https://example.com/orphan')?.pageRank || 0;
    expect(homePr).toBeGreaterThan(orphanPr);
  });
});
