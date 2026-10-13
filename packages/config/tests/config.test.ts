import { describe, it, expect } from 'vitest';
import { ScrawlConfigSchema, interpolateEnvVars, defineConfig } from '../src/index.js';

describe('Config Schema and Loader', () => {
  it('validates a minimal valid configuration and applies defaults', () => {
    const raw = {
      startUrls: ['https://example.com'],
    };
    const parsed = ScrawlConfigSchema.parse(raw);
    expect(parsed.startUrls).toEqual(['https://example.com']);
    expect(parsed.maxPages).toBe(100);
    expect(parsed.concurrency).toBe(5);
    expect(parsed.renderMode).toBe('auto');
    expect(parsed.respectRobotsTxt).toBe(true);
    expect(parsed.storage.driver).toBe('sqlite');
  });

  it('rejects invalid configurations', () => {
    expect(() => {
      ScrawlConfigSchema.parse({ startUrls: [] });
    }).toThrow();

    expect(() => {
      ScrawlConfigSchema.parse({
        startUrls: ['not-a-valid-url'],
      });
    }).toThrow();
  });

  it('interpolates environment variables properly', () => {
    process.env.TEST_API_KEY = 'secret-key-123';
    process.env.TEST_OUT_DIR = './custom-output';

    const raw = {
      ai: { apiKey: '${TEST_API_KEY}' },
      reporters: { outDir: '$TEST_OUT_DIR' },
    };

    const interpolated = interpolateEnvVars(raw) as typeof raw;
    expect(interpolated.ai.apiKey).toBe('secret-key-123');
    expect(interpolated.reporters.outDir).toBe('./custom-output');
  });

  it('supports defineConfig type-helper', () => {
    const config = defineConfig({
      startUrls: ['https://example.com'],
      maxPages: 50,
    });
    expect(config.maxPages).toBe(50);
  });
});
