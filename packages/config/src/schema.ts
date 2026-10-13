import { z } from 'zod';

export const CategoryEnum = z.enum([
  'technical',
  'onpage',
  'content',
  'aeo',
  'performance',
  'security',
  'structured-data',
  'international',
  'accessibility',
  'social',
]);

export const SeverityEnum = z.enum(['critical', 'high', 'medium', 'low', 'info', 'pass']);

export const IntentEnum = z.enum(['informational', 'navigational', 'commercial', 'transactional', 'local']);

export const RenderModeEnum = z.enum(['auto', 'always', 'never']);

export const TrailingSlashPolicyEnum = z.enum(['ignore', 'require', 'remove']);

export const StorageDriverEnum = z.enum(['sqlite', 'memory', 'postgres']);

export const TargetKeywordSchema = z.object({
  keyword: z.string().min(1),
  url: z.string().url(),
  intent: IntentEnum.optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
});

export const ViewportSchema = z.object({
  width: z.number().int().positive().default(1280),
  height: z.number().int().positive().default(800),
  deviceScaleFactor: z.number().positive().default(1),
  isMobile: z.boolean().default(false),
});

export const ReporterFormatEnum = z.enum(['html', 'json', 'csv', 'md', 'pdf', 'sarif', 'junit']);

export const ScrawlConfigSchema = z.object({
  startUrls: z.array(z.string().url()).min(1),
  maxPages: z.number().int().positive().default(100),
  maxDepth: z.number().int().min(0).default(5),
  concurrency: z.number().int().positive().max(50).default(5),
  delayMs: z.number().int().min(0).default(200),
  timeoutMs: z.number().int().positive().default(15000),
  userAgent: z.string().default('Scrawl-Bot/1.0 (+https://github.com/scrawl-seo/scrawl)'),
  renderMode: RenderModeEnum.default('auto'),
  respectRobotsTxt: z.boolean().default(true),
  allowSubdomains: z.boolean().default(false),
  sitemapOnly: z.boolean().default(false),
  includePatterns: z.array(z.string()).default([]),
  excludePatterns: z.array(z.string()).default([]),
  stripQueryParams: z.array(z.string()).default([]),
  trailingSlashPolicy: TrailingSlashPolicyEnum.default('ignore'),
  allowPrivateIps: z.boolean().default(false),

  headers: z.record(z.string()).default({}),
  auth: z
    .object({
      type: z.enum(['basic', 'bearer', 'cookie']),
      credentials: z.string().optional(),
      token: z.string().optional(),
      cookies: z
        .array(
          z.object({
            name: z.string(),
            value: z.string(),
            domain: z.string().optional(),
            path: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),

  viewport: ViewportSchema.default({ width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false }),
  mobile: z.boolean().default(false),
  locale: z.string().default('en-US'),

  rules: z
    .object({
      enabled: z.array(z.string()).optional(),
      disabled: z.array(z.string()).optional(),
      severityOverrides: z.record(SeverityEnum).optional(),
    })
    .default({}),

  weights: z.record(CategoryEnum, z.number().min(0).max(100)).optional(),

  ci: z
    .object({
      failUnderScore: z.number().min(0).max(100).optional(),
      failOnSeverity: SeverityEnum.optional(),
      alertRegressionPoints: z.number().min(0).max(100).default(5),
    })
    .default({ alertRegressionPoints: 5 }),

  keywords: z.array(TargetKeywordSchema).default([]),
  brandTerms: z.array(z.string()).default([]),
  competitors: z.array(z.string().url()).default([]),
  targetCountry: z.string().length(2).optional(),

  reporters: z
    .object({
      formats: z.array(ReporterFormatEnum).default(['html', 'json']),
      outDir: z.string().default('./scrawl-report'),
      logoUrl: z.string().optional(),
      brandName: z.string().default('Scrawl SEO'),
      brandColor: z.string().default('#0f172a'),
    })
    .default({ formats: ['html', 'json'], outDir: './scrawl-report', brandName: 'Scrawl SEO', brandColor: '#0f172a' }),

  storage: z
    .object({
      driver: StorageDriverEnum.default('sqlite'),
      filePath: z.string().default('./scrawl.sqlite'),
      connectionString: z.string().optional(),
    })
    .default({ driver: 'sqlite', filePath: './scrawl.sqlite' }),

  integrations: z
    .object({
      googleSearchConsole: z
        .object({
          credentialsJsonPath: z.string().optional(),
          siteUrl: z.string().optional(),
        })
        .optional(),
      bingWebmaster: z
        .object({
          apiKey: z.string().optional(),
          siteUrl: z.string().optional(),
        })
        .optional(),
      googleAnalytics4: z
        .object({
          propertyId: z.string().optional(),
        })
        .optional(),
      cruxApiKey: z.string().optional(),
      serpApiKey: z.string().optional(),
      indexNowKey: z.string().optional(),
    })
    .default({}),

  ai: z
    .object({
      provider: z.enum(['openai', 'gemini', 'anthropic', 'ollama', 'none']).default('none'),
      apiKey: z.string().optional(),
      model: z.string().optional(),
      endpoint: z.string().optional(),
    })
    .default({ provider: 'none' }),
});

export type ScrawlConfigInput = z.input<typeof ScrawlConfigSchema>;
export type ScrawlConfigParsed = z.infer<typeof ScrawlConfigSchema>;
