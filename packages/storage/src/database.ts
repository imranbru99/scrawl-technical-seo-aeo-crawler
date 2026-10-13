import { DatabaseSync } from 'node:sqlite';

export interface SqlStatement<T = unknown> {
  run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  get(...params: unknown[]): T | undefined;
  all(...params: unknown[]): T[];
}

export interface SqliteDriver {
  exec(sql: string): void;
  prepare<T = unknown>(sql: string): SqlStatement<T>;
  close(): void;
}

export interface DatabaseOptions {
  path?: string; // default ':memory:' or file path
  inMemory?: boolean;
}

export class StorageDatabase {
  public rawDb: DatabaseSync;

  constructor(options: DatabaseOptions = {}) {
    const dbPath = options.inMemory || !options.path ? ':memory:' : options.path;
    this.rawDb = new DatabaseSync(dbPath);

    // SQLite performance pragmas
    this.rawDb.exec('PRAGMA journal_mode = WAL;');
    this.rawDb.exec('PRAGMA synchronous = NORMAL;');
    this.rawDb.exec('PRAGMA foreign_keys = ON;');

    this.initTables();
  }

  public prepare<T = unknown>(sql: string): SqlStatement<T> {
    const stmt = this.rawDb.prepare(sql);
    return {
      run: (...params: unknown[]) => {
        const info = (stmt.run as (...args: unknown[]) => { changes: number | bigint; lastInsertRowid: number | bigint })(...params);
        return {
          changes: Number(info.changes),
          lastInsertRowid: Number(info.lastInsertRowid),
        };
      },
      get: (...params: unknown[]) => {
        return (stmt.get as (...args: unknown[]) => unknown)(...params) as T | undefined;
      },
      all: (...params: unknown[]) => {
        return (stmt.all as (...args: unknown[]) => unknown[])(...params) as T[];
      },
    };
  }

  public exec(sql: string): void {
    this.rawDb.exec(sql);
  }

  private initTables(): void {
    this.rawDb.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        domain TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS crawls (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        start_url TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        total_pages INTEGER DEFAULT 0 NOT NULL,
        crawl_depth INTEGER DEFAULT 0 NOT NULL,
        overall_score REAL,
        grade TEXT,
        error_message TEXT
      );

      CREATE TABLE IF NOT EXISTS crawl_configs (
        crawl_id TEXT PRIMARY KEY,
        config_json TEXT NOT NULL,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );

      CREATE TABLE IF NOT EXISTS urls (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        url TEXT NOT NULL,
        url_hash TEXT NOT NULL,
        status TEXT NOT NULL,
        depth INTEGER DEFAULT 0 NOT NULL,
        discovered_from TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );
      CREATE INDEX IF NOT EXISTS idx_urls_crawl_url_hash ON urls(crawl_id, url_hash);

      CREATE TABLE IF NOT EXISTS pages (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        url TEXT NOT NULL,
        final_url TEXT NOT NULL,
        url_hash TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        content_type TEXT NOT NULL,
        charset TEXT,
        size_bytes INTEGER NOT NULL,
        ttfb_ms INTEGER DEFAULT 0 NOT NULL,
        download_time_ms INTEGER DEFAULT 0 NOT NULL,
        total_time_ms INTEGER DEFAULT 0 NOT NULL,
        depth INTEGER DEFAULT 0 NOT NULL,
        discovered_from TEXT,
        http_version TEXT,
        compression TEXT,
        server_hint TEXT,
        cdn_hint TEXT,
        ip_address TEXT,
        tls_json TEXT,
        is_indexable INTEGER NOT NULL,
        non_indexable_reason TEXT,
        title TEXT,
        meta_description TEXT,
        canonical TEXT,
        canonical_header TEXT,
        meta_robots TEXT,
        x_robots_tag TEXT,
        word_count INTEGER DEFAULT 0 NOT NULL,
        has_js_rendering_diff INTEGER DEFAULT 0,
        raw_html TEXT,
        rendered_html TEXT,
        text_only TEXT,
        simhash TEXT,
        internal_page_rank REAL DEFAULT 0,
        inlink_count INTEGER DEFAULT 0,
        outlink_count INTEGER DEFAULT 0,
        desktop_screenshot_path TEXT,
        mobile_screenshot_path TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );
      CREATE INDEX IF NOT EXISTS idx_pages_crawl_url_hash ON pages(crawl_id, url_hash);
      CREATE INDEX IF NOT EXISTS idx_pages_crawl_final_url ON pages(crawl_id, final_url);

      CREATE TABLE IF NOT EXISTS page_resources (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        page_url TEXT NOT NULL,
        resource_url TEXT NOT NULL,
        type TEXT NOT NULL,
        size_bytes INTEGER,
        status INTEGER,
        duration_ms INTEGER,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );

      CREATE TABLE IF NOT EXISTS redirect_hops (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        source_url TEXT NOT NULL,
        hop_index INTEGER NOT NULL,
        target_url TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        duration_ms INTEGER DEFAULT 0 NOT NULL,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );

      CREATE TABLE IF NOT EXISTS links (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        source_url TEXT NOT NULL,
        target_url TEXT NOT NULL,
        anchor_text TEXT NOT NULL,
        rel TEXT,
        target TEXT,
        is_internal INTEGER NOT NULL,
        position TEXT,
        nofollow INTEGER DEFAULT 0,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );
      CREATE INDEX IF NOT EXISTS idx_links_crawl_source ON links(crawl_id, source_url);
      CREATE INDEX IF NOT EXISTS idx_links_crawl_target ON links(crawl_id, target_url);

      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        page_url TEXT NOT NULL,
        src TEXT NOT NULL,
        alt TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        is_lazy INTEGER DEFAULT 0,
        format TEXT,
        size_bytes INTEGER,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );

      CREATE TABLE IF NOT EXISTS headings (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        page_url TEXT NOT NULL,
        level INTEGER NOT NULL,
        text TEXT NOT NULL,
        anchor_id TEXT,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );

      CREATE TABLE IF NOT EXISTS structured_data_items (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        page_url TEXT NOT NULL,
        format TEXT NOT NULL,
        schema_type TEXT NOT NULL,
        raw_json TEXT NOT NULL,
        is_valid INTEGER NOT NULL,
        errors_json TEXT,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );

      CREATE TABLE IF NOT EXISTS hreflang (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        page_url TEXT NOT NULL,
        lang TEXT NOT NULL,
        target_url TEXT NOT NULL,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );

      CREATE TABLE IF NOT EXISTS issues (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        rule_id TEXT NOT NULL,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        affected_count INTEGER DEFAULT 1 NOT NULL,
        points_lost REAL DEFAULT 0 NOT NULL,
        priority_score REAL DEFAULT 0 NOT NULL,
        fix_steps_json TEXT NOT NULL,
        code_example TEXT,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );
      CREATE INDEX IF NOT EXISTS idx_issues_crawl_rule ON issues(crawl_id, rule_id);

      CREATE TABLE IF NOT EXISTS issue_instances (
        id TEXT PRIMARY KEY,
        issue_id TEXT NOT NULL,
        crawl_id TEXT NOT NULL,
        url TEXT NOT NULL,
        selector TEXT,
        found TEXT NOT NULL,
        expected TEXT NOT NULL,
        evidence TEXT NOT NULL,
        FOREIGN KEY (issue_id) REFERENCES issues(id),
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );
      CREATE INDEX IF NOT EXISTS idx_issue_instances_crawl_url ON issue_instances(crawl_id, url);

      CREATE TABLE IF NOT EXISTS scores (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        overall_score REAL NOT NULL,
        grade TEXT NOT NULL,
        category_scores_json TEXT NOT NULL,
        specialized_scores_json TEXT NOT NULL,
        top_deductions_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );

      CREATE TABLE IF NOT EXISTS keywords (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        keyword TEXT NOT NULL,
        ngram INTEGER NOT NULL,
        total_frequency INTEGER NOT NULL,
        page_count INTEGER NOT NULL,
        primary_intent TEXT,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );

      CREATE TABLE IF NOT EXISTS page_keywords (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        page_url TEXT NOT NULL,
        keyword TEXT NOT NULL,
        frequency INTEGER NOT NULL,
        density REAL NOT NULL,
        tf_idf_score REAL NOT NULL,
        is_in_title INTEGER NOT NULL,
        is_in_h1 INTEGER NOT NULL,
        is_in_url INTEGER NOT NULL,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );

      CREATE TABLE IF NOT EXISTS keyword_clusters (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        topic TEXT NOT NULL,
        pillar_url TEXT NOT NULL,
        cluster_data_json TEXT NOT NULL,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );

      CREATE TABLE IF NOT EXISTS rank_snapshots (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        keyword TEXT NOT NULL,
        url TEXT NOT NULL,
        engine TEXT NOT NULL,
        device TEXT NOT NULL,
        country TEXT NOT NULL,
        position INTEGER,
        serp_features_json TEXT,
        recorded_at TEXT NOT NULL,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );

      CREATE TABLE IF NOT EXISTS gsc_metrics (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        page_url TEXT NOT NULL,
        query TEXT NOT NULL,
        clicks INTEGER NOT NULL,
        impressions INTEGER NOT NULL,
        ctr REAL NOT NULL,
        position REAL NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );

      CREATE TABLE IF NOT EXISTS ai_visibility_snapshots (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        prompt_question TEXT NOT NULL,
        model_provider TEXT NOT NULL,
        is_brand_cited INTEGER NOT NULL,
        citation_position INTEGER,
        competitors_cited_json TEXT,
        sampled_timestamp TEXT NOT NULL,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );

      CREATE TABLE IF NOT EXISTS lighthouse_results (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        page_url TEXT NOT NULL,
        device TEXT NOT NULL,
        score REAL NOT NULL,
        lcp_ms REAL NOT NULL,
        cls_score REAL NOT NULL,
        tbt_ms REAL NOT NULL,
        fcp_ms REAL NOT NULL,
        ttfb_ms REAL NOT NULL,
        diagnostics_json TEXT,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );

      CREATE TABLE IF NOT EXISTS cwv_field_data (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        page_url TEXT NOT NULL,
        origin TEXT NOT NULL,
        is_available INTEGER NOT NULL,
        field_data_json TEXT,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );

      CREATE TABLE IF NOT EXISTS sitemaps (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        url TEXT NOT NULL,
        type TEXT NOT NULL,
        total_urls INTEGER NOT NULL,
        is_valid INTEGER NOT NULL,
        errors_json TEXT,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );

      CREATE TABLE IF NOT EXISTS robots_snapshots (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        url TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        content TEXT NOT NULL,
        rules_json TEXT,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );

      CREATE TABLE IF NOT EXISTS llms_snapshots (
        id TEXT PRIMARY KEY,
        crawl_id TEXT NOT NULL,
        url TEXT NOT NULL,
        "exists" INTEGER NOT NULL,
        is_valid INTEGER NOT NULL,
        content TEXT,
        generated_content TEXT,
        FOREIGN KEY (crawl_id) REFERENCES crawls(id)
      );

      CREATE TABLE IF NOT EXISTS schedules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        target_url TEXT NOT NULL,
        cron_expression TEXT NOT NULL,
        config_json TEXT,
        is_active INTEGER DEFAULT 1,
        last_run_at TEXT,
        next_run_at TEXT
      );

      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        target_url TEXT NOT NULL,
        events_json TEXT NOT NULL,
        secret TEXT,
        is_active INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        crawl_id TEXT,
        action TEXT NOT NULL,
        details_json TEXT,
        created_at TEXT NOT NULL
      );
    `);
  }

  public close(): void {
    this.rawDb.close();
  }
}
