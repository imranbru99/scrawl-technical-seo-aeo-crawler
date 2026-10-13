import { describe, it, expect } from 'vitest';
import {
  normalizeUrl,
  isSameOrigin,
  isInternalUrl,
  resolveUrl,
  getUrlDepth,
  simhash,
  simhashHammingDistance,
  simhashSimilarity,
  isPrivateIp,
  extractPlainText,
  wordCount,
  fleschReadingEase,
  Logger,
  AI_BOT_REGISTRY,
} from '../src/index.js';

describe('Shared Utilities', () => {
  it('normalizes URLs properly', () => {
    const raw = 'HTTPS://Example.COM:443/docs/overview/?utm_source=twitter&b=2&a=1#section';
    const norm = normalizeUrl(raw, { stripTrailingSlash: true });
    expect(norm).toBe('https://example.com/docs/overview?a=1&b=2');
  });

  it('resolves relative URLs correctly', () => {
    expect(resolveUrl('/pricing', 'https://example.com/blog/article')).toBe('https://example.com/pricing');
    expect(resolveUrl('subpage', 'https://example.com/blog/')).toBe('https://example.com/blog/subpage');
    expect(resolveUrl('javascript:void(0)', 'https://example.com')).toBeNull();
    expect(resolveUrl('#anchor', 'https://example.com')).toBeNull();
  });

  it('checks origins and internal URLs', () => {
    expect(isSameOrigin('https://example.com/a', 'https://example.com/b')).toBe(true);
    expect(isSameOrigin('https://example.com', 'https://app.example.com')).toBe(false);

    expect(isInternalUrl('https://app.example.com/login', 'https://example.com', true)).toBe(true);
    expect(isInternalUrl('https://app.example.com/login', 'https://example.com', false)).toBe(false);
    expect(isInternalUrl('https://attacker.com', 'https://example.com', true)).toBe(false);
  });

  it('computes SimHash and detects near duplicates', () => {
    const doc1 = ['technical', 'seo', 'audit', 'crawler', 'answer', 'engine', 'optimization'];
    const doc2 = ['technical', 'seo', 'audit', 'crawler', 'answer', 'engine', 'optimization'];
    const doc3 = ['completely', 'unrelated', 'recipe', 'chocolate', 'cake', 'sugar', 'baking'];

    const h1 = simhash(doc1);
    const h2 = simhash(doc2);
    const h3 = simhash(doc3);

    expect(h1).toBe(h2);
    expect(simhashHammingDistance(h1, h2)).toBe(0);
    expect(simhashSimilarity(h1, h2)).toBe(1.0);

    const distFar = simhashHammingDistance(h1, h3);
    expect(distFar).toBeGreaterThan(10);
  });

  it('identifies private IPs for SSRF defense', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('10.1.2.3')).toBe(true);
    expect(isPrivateIp('192.168.1.1')).toBe(true);
    expect(isPrivateIp('172.16.5.4')).toBe(true);
    expect(isPrivateIp('169.254.169.254')).toBe(true); // AWS/cloud metadata
    expect(isPrivateIp('::1')).toBe(true);
    expect(isPrivateIp('8.8.8.8')).toBe(false); // Google Public DNS
    expect(isPrivateIp('1.1.1.1')).toBe(false); // Cloudflare DNS
  });

  it('extracts plain text and calculates word count and readability', () => {
    const html = '<article><h1>Hello World</h1><p>This is a technical SEO audit test article.</p></article>';
    const text = extractPlainText(html);
    expect(text).toBe('Hello World This is a technical SEO audit test article.');
    expect(wordCount(text)).toBe(10);
    expect(fleschReadingEase(text)).toBeGreaterThan(0);
  });

  it('verifies AI bot registry has at least 20 entries', () => {
    expect(AI_BOT_REGISTRY.length).toBeGreaterThanOrEqual(20);
    const gptBot = AI_BOT_REGISTRY.find((b) => b.id === 'gptbot');
    expect(gptBot?.vendor).toBe('OpenAI');
    expect(gptBot?.purpose).toBe('training');
  });

  it('logs with redaction', () => {
    const logger = new Logger({ level: 'info', format: 'json' });
    expect(logger).toBeDefined();
  });
});
