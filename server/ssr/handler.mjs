/**
 * The public-website server renderer's request handler
 * (Reports/SSR_ARCHITECTURE_ANALYSIS.md §5–§7). Shared by the production
 * server (`server/ssr/server.mjs`) and the theme baseline's fixture server,
 * so the visual, accessibility and Lighthouse suites exercise the same code
 * that ships.
 *
 * Every request that is not rendered is answered with the unchanged
 * single-page app shell and `X-Atlas-SSR: pass`. The edge also serves its
 * own copy of that shell whenever this process fails, times out or is
 * down, so server rendering is never the only way a page can load.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * The public router chunk's manifest key. Rollup keys a chunk by its source
 * path only when that module is the chunk's facade; otherwise it is an
 * `_<name>-<hash>.js` key, found through the entry's dynamic imports.
 */
export function findPublicRouterChunk(manifest) {
  const source = 'src/features/public-website/PublicWebsiteRouter.tsx';
  if (manifest[source]) return source;
  return manifest['index.html']?.dynamicImports?.find(
    (key) => manifest[key]?.name === 'PublicWebsiteRouter'
  );
}

/** The public router's chunk and every chunk it imports statically. */
export function collectPreloads(manifest, entryKey) {
  const files = new Set();
  const visit = (key) => {
    const chunk = manifest[key];
    if (!chunk || files.has(chunk.file)) return;
    files.add(chunk.file);
    for (const imported of chunk.imports ?? []) visit(imported);
  };
  visit(entryKey);
  return [...files].filter((file) => file.endsWith('.js'));
}

/** A small TTL + LRU cache for rendered pages (per process, in memory). */
export class RenderCache {
  constructor({ ttlMs, maxEntries, now = Date.now }) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.now = now;
    this.entries = new Map();
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    // Refresh recency.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.html;
  }

  set(key, html) {
    if (this.ttlMs <= 0 || this.maxEntries <= 0) return;
    this.entries.delete(key);
    this.entries.set(key, { html, expiresAt: this.now() + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value);
    }
  }

  get size() {
    return this.entries.size;
  }
}

/**
 * @param {object} options
 * @param {string} options.distDir   the client build (index.html, .vite/manifest.json)
 * @param {string} options.entryPath the SSR bundle's entry-server.js
 * @param {string} options.apiOrigin where the public API is reachable, e.g. http://backend:3000
 * @param {number} [options.apiTimeoutMs]
 * @param {number} [options.renderBudgetMs] whole request; past it the page passes
 * @param {number} [options.cacheTtlMs]
 * @param {number} [options.cacheMaxEntries]
 * @param {(event: object) => void} [options.log]
 */
export async function createSsrHandler({
  distDir,
  entryPath,
  apiOrigin,
  apiTimeoutMs = 2_000,
  renderBudgetMs = 2_500,
  cacheTtlMs = 30_000,
  cacheMaxEntries = 500,
  log = () => {},
}) {
  const entry = await import(pathToFileURL(entryPath).href);
  const template = readFileSync(join(distDir, 'index.html'), 'utf8');
  const manifest = JSON.parse(
    readFileSync(join(distDir, '.vite', 'manifest.json'), 'utf8')
  );
  const routerChunk = findPublicRouterChunk(manifest);
  if (!routerChunk) {
    // Still correct (the page loads the chunk itself), only later.
    log({
      event: 'warning',
      message: 'public router chunk not in the manifest',
    });
  }
  const preloadHtml = (
    routerChunk ? collectPreloads(manifest, routerChunk) : []
  )
    .map((file) => `<link rel="modulepreload" crossorigin href="/${file}">`)
    .join('');
  const cache = new RenderCache({
    ttlMs: cacheTtlMs,
    maxEntries: cacheMaxEntries,
  });

  const shell = (reason) => ({
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Atlas-SSR': 'pass',
    },
    body: template,
    reason,
  });

  /**
   * @param {{ method: string, url: string, host: string, protocol: 'http'|'https',
   *           cookieHeader?: string, clientIp?: string }} request
   */
  async function handle(request) {
    const started = Date.now();
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return shell('method');
    }
    let timer;
    try {
      const result = await Promise.race([
        entry.renderPublicWebsitePage(
          {
            url: request.url,
            host: request.host,
            protocol: request.protocol,
            cookieHeader: request.cookieHeader,
            clientIp: request.clientIp,
          },
          { template, preloadHtml, apiOrigin, apiTimeoutMs, cache }
        ),
        new Promise((resolve) => {
          timer = setTimeout(
            () => resolve({ kind: 'pass', reason: 'render budget exceeded' }),
            renderBudgetMs
          );
        }),
      ]);
      if (result.kind !== 'html') {
        log({ event: 'pass', reason: result.reason, ms: Date.now() - started });
        return shell(result.reason);
      }
      log({
        event: 'render',
        outcome: result.outcome,
        cache: result.cache,
        ms: Date.now() - started,
      });
      return {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          // Tenant HTML is never stored by a shared cache (Cloudflare).
          'Cache-Control': 'private, no-cache',
          'X-Atlas-SSR': result.cache === 'hit' ? 'hit' : 'render',
        },
        body: result.html,
      };
    } catch (error) {
      log({ event: 'error', message: String(error?.message ?? error) });
      return shell('error');
    } finally {
      clearTimeout(timer);
    }
  }

  return { handle, cache, template };
}
