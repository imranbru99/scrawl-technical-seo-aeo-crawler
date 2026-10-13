export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface LoggerOptions {
  level?: LogLevel;
  format?: 'json' | 'pretty';
  redactKeys?: string[];
  context?: Record<string, unknown>;
}

const DEFAULT_REDACT_KEYS = ['authorization', 'apikey', 'api_key', 'token', 'secret', 'password', 'cookie'];

export class Logger {
  private level: LogLevel;
  private format: 'json' | 'pretty';
  private redactKeys: Set<string>;
  private context: Record<string, unknown>;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.format = options.format || (process.env.LOG_FORMAT === 'json' ? 'json' : 'pretty');
    this.redactKeys = new Set([...DEFAULT_REDACT_KEYS, ...(options.redactKeys || []).map((k) => k.toLowerCase())]);
    this.context = options.context || {};
  }

  child(context: Record<string, unknown>): Logger {
    return new Logger({
      level: this.level,
      format: this.format,
      redactKeys: Array.from(this.redactKeys),
      context: { ...this.context, ...context },
    });
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_SEVERITY[level] >= LEVEL_SEVERITY[this.level];
  }

  private redact(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redact(item));
    }

    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (this.redactKeys.has(key.toLowerCase())) {
        cleaned[key] = '[REDACTED]';
      } else if (typeof val === 'object') {
        cleaned[key] = this.redact(val);
      } else {
        cleaned[key] = val;
      }
    }
    return cleaned;
  }

  private output(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const mergedMeta = this.redact({ ...this.context, ...(meta || {}) });

    if (this.format === 'json') {
      const entry = {
        timestamp,
        level,
        message,
        ...(typeof mergedMeta === 'object' && mergedMeta !== null && Object.keys(mergedMeta).length > 0
          ? { data: mergedMeta }
          : {}),
      };
      process.stdout.write(JSON.stringify(entry) + '\n');
    } else {
      const levelColors: Record<LogLevel, string> = {
        debug: '\x1b[34m[DEBUG]\x1b[0m',
        info: '\x1b[32m[INFO]\x1b[0m',
        warn: '\x1b[33m[WARN]\x1b[0m',
        error: '\x1b[31m[ERROR]\x1b[0m',
      };
      const prefix = `${timestamp} ${levelColors[level]}`;
      const metaStr =
        meta && Object.keys(meta).length > 0 ? ' ' + JSON.stringify(mergedMeta) : '';
      if (level === 'error') {
        process.stderr.write(`${prefix} ${message}${metaStr}\n`);
      } else {
        process.stdout.write(`${prefix} ${message}${metaStr}\n`);
      }
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.output('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.output('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.output('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.output('error', message, meta);
  }
}

export const defaultLogger = new Logger();
