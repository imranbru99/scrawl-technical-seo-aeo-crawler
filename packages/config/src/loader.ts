import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ScrawlConfigSchema, type ScrawlConfigInput, type ScrawlConfigParsed } from './schema.js';

export function defineConfig(config: ScrawlConfigInput): ScrawlConfigInput {
  return config;
}

/**
 * Replaces ${VAR_NAME} or $VAR_NAME placeholders with actual process.env values.
 */
export function interpolateEnvVars(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{([A-Z0-9_]+)\}|\$([A-Z0-9_]+)/gi, (_, g1, g2) => {
      const varName = g1 || g2;
      return process.env[varName] !== undefined ? process.env[varName]! : '';
    });
  }
  if (Array.isArray(obj)) {
    return obj.map(interpolateEnvVars);
  }
  if (obj !== null && typeof obj === 'object') {
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      res[k] = interpolateEnvVars(v);
    }
    return res;
  }
  return obj;
}

const CONFIG_FILENAMES = [
  'scrawl.config.ts',
  'scrawl.config.js',
  'scrawl.config.mjs',
  'scrawl.config.json',
  '.scrawlrc.json',
];

export async function loadConfigFile(customPath?: string, cwd = process.cwd()): Promise<{
  path?: string;
  config: ScrawlConfigParsed;
}> {
  let foundPath: string | undefined;

  if (customPath) {
    const full = resolve(cwd, customPath);
    if (!existsSync(full)) {
      throw new Error(`Custom config file not found: ${full}`);
    }
    foundPath = full;
  } else {
    for (const name of CONFIG_FILENAMES) {
      const full = resolve(cwd, name);
      if (existsSync(full)) {
        foundPath = full;
        break;
      }
    }
  }

  let rawConfig: unknown = {};

  if (foundPath) {
    if (foundPath.endsWith('.json')) {
      const content = readFileSync(foundPath, 'utf8');
      rawConfig = JSON.parse(content);
    } else {
      // Dynamic import
      const fileUrl = pathToFileURL(foundPath).href;
      const mod = await import(fileUrl);
      rawConfig = mod.default || mod.config || mod;
    }
  }

  const interpolated = interpolateEnvVars(rawConfig);
  const parsed = ScrawlConfigSchema.parse(interpolated);

  return {
    path: foundPath,
    config: parsed,
  };
}
