import { sqliteTable, text, integer, real, index, primaryKey } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  domain: text('domain').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const crawls = sqliteTable('crawls', {
  id: text('id').primaryKey(),
  projectId: text('project_id'),
  startUrl: text('start_url').notNull(),
  status: text('status').notNull(), // 'pending' | 'running' | 'completed' | 'failed' | 'paused'
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  totalPages: integer('total_pages').default(0).notNull(),
  crawlDepth: integer('crawl_depth').default(0).notNull(),
  overallScore: real('overall_score'),
  grade: text('grade'),
  errorMessage: text('error_message'),
});

export const crawlConfigs = sqliteTable('crawl_configs', {
  crawlId: text('crawl_id').primaryKey().references(() => crawls.id),
  configJson: text('config_json').notNull(),
});

export const urls = sqliteTable(
  'urls',
  {
    id: text('id').primaryKey(),
    crawlId: text('crawl_id').notNull().references(() => crawls.id),
    url: text('url').notNull(),
    urlHash: text('url_hash').notNull(),
    status: text('status').notNull(), // 'queued' | 'crawled' | 'failed' | 'skipped'
    depth: integer('depth').default(0).notNull(),
    discoveredFrom: text('discovered_from'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    crawlUrlHashIdx: index('idx_urls_crawl_url_hash').on(table.crawlId, table.urlHash),
  }),
);

export const pages = sqliteTable(
  'pages',
  {
    id: text('id').primaryKey(),
    crawlId: text('crawl_id').notNull().references(() => crawls.id),
    url: text('url').notNull(),
    finalUrl: text('final_url').notNull(),
    urlHash: text('url_hash').notNull(),
    statusCode: integer('status_code').notNull(),
    contentType: text('content_type').notNull(),
    charset: text('charset'),
    sizeBytes: integer('size_bytes').notNull(),
    ttfbMs: integer('ttfb_ms').default(0).notNull(),
    downloadTimeMs: integer('download_time_ms').default(0).notNull(),
    totalTimeMs: integer('total_time_ms').default(0).notNull(),
    depth: integer('depth').default(0).notNull(),
    discoveredFrom: text('discovered_from'),
    httpVersion: text('http_version'),
    compression: text('compression'),
    serverHint: text('server_hint'),
    cdnHint: text('cdn_hint'),
    ipAddress: text('ip_address'),
    tlsJson: text('tls_json'),
    isIndexable: integer('is_indexable', { mode: 'boolean' }).notNull(),
    nonIndexableReason: text('non_indexable_reason'),
    title: text('title'),
    metaDescription: text('meta_description'),
    canonical: text('canonical'),
    canonicalHeader: text('canonical_header'),
    metaRobots: text('meta_robots'),
    xRobotsTag: text('x_robots_tag'),
    wordCount: integer('word_count').default(0).notNull(),
    hasJsRenderingDiff: integer('has_js_rendering_diff', { mode: 'boolean' }).default(false),
    rawHtml: text('raw_html'),
    renderedHtml: text('rendered_html'),
    textOnly: text('text_only'),
    simhash: text('simhash'),
    internalPageRank: real('internal_page_rank').default(0),
    inlinkCount: integer('inlink_count').default(0),
    outlinkCount: integer('outlink_count').default(0),
    desktopScreenshotPath: text('desktop_screenshot_path'),
    mobileScreenshotPath: text('mobile_screenshot_path'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    crawlUrlHashIdx: index('idx_pages_crawl_url_hash').on(table.crawlId, table.urlHash),
    crawlFinalUrlIdx: index('idx_pages_crawl_final_url').on(table.crawlId, table.finalUrl),
  }),
);

export const pageResources = sqliteTable('page_resources', {
  id: text('id').primaryKey(),
  crawlId: text('crawl_id').notNull().references(() => crawls.id),
  pageUrl: text('page_url').notNull(),
  resourceUrl: text('resource_url').notNull(),
  type: text('type').notNull(),
  sizeBytes: integer('size_bytes'),
  status: integer('status'),
  durationMs: integer('duration_ms'),
});

export const redirectHops = sqliteTable('redirect_hops', {
  id: text('id').primaryKey(),
  crawlId: text('crawl_id').notNull().references(() => crawls.id),
  sourceUrl: text('source_url').notNull(),
  hopIndex: integer('hop_index').notNull(),
  targetUrl: text('target_url').notNull(),
  statusCode: integer('status_code').notNull(),
  durationMs: integer('duration_ms').default(0).notNull(),
});

export const links = sqliteTable(
  'links',
  {
    id: text('id').primaryKey(),
    crawlId: text('crawl_id').notNull().references(() => crawls.id),
    sourceUrl: text('source_url').notNull(),
    targetUrl: text('target_url').notNull(),
    anchorText: text('anchor_text').notNull(),
    rel: text('rel'),
    target: text('target'),
    isInternal: integer('is_internal', { mode: 'boolean' }).notNull(),
    position: text('position'),
    nofollow: integer('nofollow', { mode: 'boolean' }).default(false),
  },
  (table) => ({
    crawlSourceIdx: index('idx_links_crawl_source').on(table.crawlId, table.sourceUrl),
    crawlTargetIdx: index('idx_links_crawl_target').on(table.crawlId, table.targetUrl),
  }),
);

export const images = sqliteTable('images', {
  id: text('id').primaryKey(),
  crawlId: text('crawl_id').notNull().references(() => crawls.id),
  pageUrl: text('page_url').notNull(),
  src: text('src').notNull(),
  alt: text('alt').notNull(),
  width: integer('width'),
  height: integer('height'),
  isLazy: integer('is_lazy', { mode: 'boolean' }).default(false),
  format: text('format'),
  sizeBytes: integer('size_bytes'),
});

export const headings = sqliteTable('headings', {
  id: text('id').primaryKey(),
  crawlId: text('crawl_id').notNull().references(() => crawls.id),
  pageUrl: text('page_url').notNull(),
  level: integer('level').notNull(),
  text: text('text').notNull(),
  anchorId: text('anchor_id'),
});

export const structuredDataItems = sqliteTable('structured_data_items', {
  id: text('id').primaryKey(),
  crawlId: text('crawl_id').notNull().references(() => crawls.id),
  pageUrl: text('page_url').notNull(),
  format: text('format').notNull(), // 'json-ld' | 'microdata' | 'rdfa'
  schemaType: text('schema_type').notNull(),
  rawJson: text('raw_json').notNull(),
  isValid: integer('is_valid', { mode: 'boolean' }).notNull(),
  errorsJson: text('errors_json'),
});

export const hreflang = sqliteTable('hreflang', {
  id: text('id').primaryKey(),
  crawlId: text('crawl_id').notNull().references(() => crawls.id),
  pageUrl: text('page_url').notNull(),
  lang: text('lang').notNull(),
  targetUrl: text('target_url').notNull(),
});

export const issues = sqliteTable(
  'issues',
  {
    id: text('id').primaryKey(),
    crawlId: text('crawl_id').notNull().references(() => crawls.id),
    ruleId: text('rule_id').notNull(),
    category: text('category').notNull(),
    severity: text('severity').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    affectedCount: integer('affected_count').default(1).notNull(),
    pointsLost: real('points_lost').default(0).notNull(),
    priorityScore: real('priority_score').default(0).notNull(),
    fixStepsJson: text('fix_steps_json').notNull(),
    codeExample: text('code_example'),
  },
  (table) => ({
    crawlRuleIdx: index('idx_issues_crawl_rule').on(table.crawlId, table.ruleId),
  }),
);

export const issueInstances = sqliteTable(
  'issue_instances',
  {
    id: text('id').primaryKey(),
    issueId: text('issue_id').notNull().references(() => issues.id),
    crawlId: text('crawl_id').notNull().references(() => crawls.id),
    url: text('url').notNull(),
    selector: text('selector'),
    found: text('found').notNull(),
    expected: text('expected').notNull(),
    evidence: text('evidence').notNull(),
  },
  (table) => ({
    crawlUrlIdx: index('idx_issue_instances_crawl_url').on(table.crawlId, table.url),
  }),
);

export const scores = sqliteTable('scores', {
  id: text('id').primaryKey(),
  crawlId: text('crawl_id').notNull().references(() => crawls.id),
  overallScore: real('overall_score').notNull(),
  grade: text('grade').notNull(),
  categoryScoresJson: text('category_scores_json').notNull(),
  specializedScoresJson: text('specialized_scores_json').notNull(),
  topDeductionsJson: text('top_deductions_json').notNull(),
  createdAt: text('created_at').notNull(),
});

export const keywords = sqliteTable('keywords', {
  id: text('id').primaryKey(),
  crawlId: text('crawl_id').notNull().references(() => crawls.id),
  keyword: text('keyword').notNull(),
  ngram: integer('ngram').notNull(),
  totalFrequency: integer('total_frequency').notNull(),
  pageCount: integer('page_count').notNull(),
  primaryIntent: text('primary_intent'),
});

export const pageKeywords = sqliteTable('page_keywords', {
  id: text('id').primaryKey(),
  crawlId: text('crawl_id').notNull().references(() => crawls.id),
  pageUrl: text('page_url').notNull(),
  keyword: text('keyword').notNull(),
  frequency: integer('frequency').notNull(),
  density: real('density').notNull(),
  tfIdfScore: real('tf_idf_score').notNull(),
  isInTitle: integer('is_in_title', { mode: 'boolean' }).notNull(),
  isInH1: integer('is_in_h1', { mode: 'boolean' }).notNull(),
  isInUrl: integer('is_in_url', { mode: 'boolean' }).notNull(),
});

export const keywordClusters = sqliteTable('keyword_clusters', {
  id: text('id').primaryKey(),
  crawlId: text('crawl_id').notNull().references(() => crawls.id),
  topic: text('topic').notNull(),
  pillarUrl: text('pillar_url').notNull(),
  clusterDataJson: text('cluster_data_json').notNull(),
});

export const rankSnapshots = sqliteTable('rank_snapshots', {
  id: text('id').primaryKey(),
  crawlId: text('crawl_id').notNull().references(() => crawls.id),
  keyword: text('keyword').notNull(),
  url: text('url').notNull(),
  engine: text('engine').notNull(),
  device: text('device').notNull(),
  country: text('country').notNull(),
  position: integer('position'),
  serpFeaturesJson: text('serp_features_json'),
  recordedAt: text('recorded_at').notNull(),
});

export const gscMetrics = sqliteTable('gsc_metrics', {
  id: text('id').primaryKey(),
  crawlId: text('crawl_id').notNull().references(() => crawls.id),
  pageUrl: text('page_url').notNull(),
  query: text('query').notNull(),
  clicks: integer('clicks').notNull(),
  impressions: integer('impressions').notNull(),
  ctr: real('ctr').notNull(),
  position: real('position').notNull(),
  date: text('date').notNull(),
});

export const aiVisibilitySnapshots = sqliteTable('ai_visibility_snapshots', {
  id: text('id').primaryKey(),
  crawlId: text('crawl_id').notNull().references(() => crawls.id),
  promptQuestion: text('prompt_question').notNull(),
  modelProvider: text('model_provider').notNull(),
  isBrandCited: integer('is_brand_cited', { mode: 'boolean' }).notNull(),
  citationPosition: integer('citation_position'),
  competitorsCitedJson: text('competitors_cited_json'),
  sampledTmstamp: text('sampled_timestamp').notNull(),
});

export const lighthouseResults = sqliteTable('lighthouse_results', {
  id: text('id').primaryKey(),
  crawlId: text('crawl_id').notNull().references(() => crawls.id),
  pageUrl: text('page_url').notNull(),
  device: text('device').notNull(),
  score: real('score').notNull(),
  lcpMs: real('lcp_ms').notNull(),
  clsScore: real('cls_score').notNull(),
  tbtMs: real('tbt_ms').notNull(),
  fcpMs: real('fcp_ms').notNull(),
  ttfbMs: real('ttfb_ms').notNull(),
  diagnosticsJson: text('diagnostics_json'),
});

export const cwvFieldData = sqliteTable('cwv_field_data', {
  id: text('id').primaryKey(),
  crawlId: text('crawl_id').notNull().references(() => crawls.id),
  pageUrl: text('page_url').notNull(),
  origin: text('origin').notNull(),
  isAvailable: integer('is_available', { mode: 'boolean' }).notNull(),
  fieldDataJson: text('field_data_json'),
});

export const sitemaps = sqliteTable('sitemaps', {
  id: text('id').primaryKey(),
  crawlId: text('crawl_id').notNull().references(() => crawls.id),
  url: text('url').notNull(),
  type: text('type').notNull(),
  totalUrls: integer('total_urls').notNull(),
  isValid: integer('is_valid', { mode: 'boolean' }).notNull(),
  errorsJson: text('errors_json'),
});

export const robotsSnapshots = sqliteTable('robots_snapshots', {
  id: text('id').primaryKey(),
  crawlId: text('crawl_id').notNull().references(() => crawls.id),
  url: text('url').notNull(),
  statusCode: integer('status_code').notNull(),
  content: text('content').notNull(),
  rulesJson: text('rules_json'),
});

export const llmsSnapshots = sqliteTable('llms_snapshots', {
  id: text('id').primaryKey(),
  crawlId: text('crawl_id').notNull().references(() => crawls.id),
  url: text('url').notNull(),
  exists: integer('exists', { mode: 'boolean' }).notNull(),
  isValid: integer('is_valid', { mode: 'boolean' }).notNull(),
  content: text('content'),
  generatedContent: text('generated_content'),
});

export const schedules = sqliteTable('schedules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  targetUrl: text('target_url').notNull(),
  cronExpression: text('cron_expression').notNull(),
  configJson: text('config_json'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  lastRunAt: text('last_run_at'),
  nextRunAt: text('next_run_at'),
});

export const webhooks = sqliteTable('webhooks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  targetUrl: text('target_url').notNull(),
  eventsJson: text('events_json').notNull(), // ['crawl.completed', 'score.regressed']
  secret: text('secret'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
});

export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  crawlId: text('crawl_id'),
  action: text('action').notNull(),
  detailsJson: text('details_json'),
  createdAt: text('created_at').notNull(),
});
