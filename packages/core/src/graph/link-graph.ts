import type { PageData, LinkGraphData, LinkGraphNode } from '@scrawl/shared';

export class LinkGraphBuilder {
  private pages: Map<string, PageData> = new Map();
  private inlinksMap: Map<string, Set<string>> = new Map();
  private outlinksMap: Map<string, Set<string>> = new Map();

  addPages(pages: PageData[]): void {
    for (const p of pages) {
      this.pages.set(p.finalUrl, p);
      if (!this.inlinksMap.has(p.finalUrl)) {
        this.inlinksMap.set(p.finalUrl, new Set());
      }
      if (!this.outlinksMap.has(p.finalUrl)) {
        this.outlinksMap.set(p.finalUrl, new Set());
      }

      for (const link of p.links) {
        if (link.isInternal) {
          this.outlinksMap.get(p.finalUrl)!.add(link.targetUrl);

          if (!this.inlinksMap.has(link.targetUrl)) {
            this.inlinksMap.set(link.targetUrl, new Set());
          }
          this.inlinksMap.get(link.targetUrl)!.add(p.finalUrl);
        }
      }
    }
  }

  /**
   * Computes iterative PageRank across all internal crawled URLs.
   * Standard algorithm: PR(A) = (1 - d)/N + d * sum(PR(T)/C(T))
   */
  computePageRank(iterations = 20, damping = 0.85): Map<string, number> {
    const urls = Array.from(this.pages.keys());
    const n = urls.length;
    if (n === 0) return new Map();

    const initialScore = 1 / n;
    let rank = new Map<string, number>();
    for (const u of urls) {
      rank.set(u, initialScore);
    }

    for (let iter = 0; iter < iterations; iter++) {
      const nextRank = new Map<string, number>();
      const randomSurfer = (1 - damping) / n;

      for (const u of urls) {
        let incomingSum = 0;
        const inlinks = this.inlinksMap.get(u) || new Set();

        for (const sourceUrl of inlinks) {
          if (this.pages.has(sourceUrl)) {
            const outCount = this.outlinksMap.get(sourceUrl)?.size || 1;
            const currentSourceRank = rank.get(sourceUrl) || 0;
            incomingSum += currentSourceRank / outCount;
          }
        }

        nextRank.set(u, randomSurfer + damping * incomingSum);
      }

      rank = nextRank;
    }

    // Normalize so highest PageRank is scaled up for human-readability (0 to 100)
    let maxRank = 0;
    for (const score of rank.values()) {
      if (score > maxRank) maxRank = score;
    }

    const scaledRank = new Map<string, number>();
    for (const [u, score] of rank.entries()) {
      scaledRank.set(u, maxRank > 0 ? Math.round((score / maxRank) * 1000) / 10 : 0);
    }

    return scaledRank;
  }

  buildGraph(startUrl?: string): LinkGraphData {
    const pageRanks = this.computePageRank();
    const nodes = new Map<string, LinkGraphNode>();
    const orphans: string[] = [];
    const deadEnds: string[] = [];

    // Calculate BFS click depth from startUrl if provided
    const depths = new Map<string, number>();
    if (startUrl && this.pages.has(startUrl)) {
      const queue: Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 0 }];
      depths.set(startUrl, 0);

      while (queue.length > 0) {
        const item = queue.shift()!;
        const outs = this.outlinksMap.get(item.url) || new Set();
        for (const out of outs) {
          if (this.pages.has(out) && !depths.has(out)) {
            depths.set(out, item.depth + 1);
            queue.push({ url: out, depth: item.depth + 1 });
          }
        }
      }
    }

    for (const [url, page] of this.pages.entries()) {
      const inlinks = Array.from(this.inlinksMap.get(url) || []);
      const outlinks = Array.from(this.outlinksMap.get(url) || []);
      const pr = pageRanks.get(url) || 0;
      const depth = depths.get(url) !== undefined ? depths.get(url)! : page.crawlDepth;

      const isOrphan = inlinks.length === 0;
      if (isOrphan) {
        orphans.push(url);
      }
      if (outlinks.length === 0) {
        deadEnds.push(url);
      }

      // Update page object with computed graph data
      page.internalPageRank = pr;
      page.inlinkCount = inlinks.length;
      page.outlinkCount = outlinks.length;
      page.crawlDepth = depth;

      nodes.set(url, {
        url,
        inlinks,
        outlinks,
        pageRank: pr,
        depth,
        isOrphan,
      });
    }

    return {
      nodes,
      orphans,
      deadEnds,
      brokenLinks: [],
    };
  }
}
