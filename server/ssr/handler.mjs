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
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * The public router chunk's manifest key. Rollup keys a chunk by its source
 * path only when that module is the chunk's facade; otherwise it is an
 * `_<name>-<hash>.js` key, found through the entry's dynamic imports —
 * by its file name, which the client build pins (`chunkFileNames` in
 * vite.config.ts), or by Rollup's chunk name.
 */
export function findPublicRouterChunk(manifest) {
  const source = 'src/features/public-website/PublicWebsiteRouter.tsx';
  if (manifest[source]) return source;
  return manifest['index.html']?.dynamicImports?.find(
    (key) =>
      /^assets\/PublicWebsiteRouter-[\w-]+\.js$/.test(
        manifest[key]?.file ?? ''
      ) || manifest[key]?.name === 'PublicWebsiteRouter'
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

/**
 * The largest server-rendered page this process will send or cache, in
 * UTF-8 bytes. Past it the page passes to the single-page app.
 *
 * Measured, not chosen: the largest page the renderer produces from the
 * theme baseline's rich data is Course Details (AR), 106,039 bytes
 * (e2e/theme-baseline/baselines/lighthouse-ssr-comparison.json). The only
 * thing that inflates a page beyond that is an image stored inline as a
 * `data:` URI (logos uploaded before media uploads existed, and one
 * section image, are still stored that way in production): the page then
 * carries it once per place it appears. A logo appears four times (the
 * JSON-LD Organization, header, footer and hydration data) and a section
 * image twice (the section and the data) — measured by ssr.test.mjs
 * ("size budget"). Production's inline logos on active Academies are all
 * under 100 KB, so their pages stay under 106 KB + 4 × 100 KB ≈ 506 KB;
 * its two logos over 1 MB and its 1.9 MB section image make pages of
 * 3.8 MB or more. 1 MiB sits between the two with margin on each side
 * (about 2× the largest legitimate page, under a third of the smallest
 * oversized one), and those oversized pages stay exactly as they are
 * today: served by the single-page app.
 */
export const DEFAULT_MAX_HTML_BYTES = 1024 * 1024;

/**
 * The rendered-page cache's total MEMORY, in bytes. V8 keeps a page that
 * contains any non-Latin-1 character (every Arabic page) as a two-byte
 * string, so an entry is counted at two bytes per character — its
 * worst-case heap size, not its UTF-8 size. This is what bounds the cache's
 * share of the renderer's memory limit (deploy/docker-compose.prod.yml in
 * the backend repo; measured with tools/ssr-memory/measure.mjs).
 */
export const DEFAULT_CACHE_MAX_BYTES = 64 * 1024 * 1024;

const byteLength = (html) => Buffer.byteLength(html, 'utf8');
/** Worst-case V8 heap size of a string: two bytes per UTF-16 code unit. */
const heapSize = (html) => html.length * 2;

/**
 * A small TTL + LRU cache for rendered pages (per process, in memory),
 * bounded by entries and by memory (`maxBytes`, counted with `heapSize`).
 * A page over `maxEntryBytes` (UTF-8, the page budget) is never stored.
 */
export class RenderCache {
  constructor({
    ttlMs,
    maxEntries,
    maxBytes = Infinity,
    maxEntryBytes = Infinity,
    now = Date.now,
  }) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.maxBytes = maxBytes;
    this.maxEntryBytes = maxEntryBytes;
    this.now = now;
    this.entries = new Map();
    this.bytes = 0;
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.#remove(key);
      return undefined;
    }
    // Refresh recency.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.html;
  }

  set(key, html) {
    if (this.ttlMs <= 0 || this.maxEntries <= 0) return;
    this.#remove(key);
    const bytes = heapSize(html);
    if (byteLength(html) > this.maxEntryBytes || bytes > this.maxBytes) return;
    this.entries.set(key, { html, bytes, expiresAt: this.now() + this.ttlMs });
    this.bytes += bytes;
    while (this.entries.size > this.maxEntries || this.bytes > this.maxBytes) {
      this.#remove(this.entries.keys().next().value);
    }
  }

  #remove(key) {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.entries.delete(key);
    this.bytes -= entry.bytes;
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
 * @param {number} [options.cacheMaxBytes] the cache's total memory (see DEFAULT_CACHE_MAX_BYTES)
 * @param {number} [options.maxHtmlBytes] the largest page sent or cached;
 *   a larger one passes to the single-page app (see DEFAULT_MAX_HTML_BYTES)
 * @param {(event: object) => void} [options.log]
 * @param {boolean} [options.preloadRouterChunks] off by default (measured):
 *   preloading the public router's chunks (≈ 290 KB gzip) from the head
 *   made them compete with the render-blocking stylesheet, so the server
 *   HTML painted later — Lighthouse mobile FCP +200–490 ms. Without them
 *   the page paints as soon as the CSS arrives and `main.tsx` still starts
 *   the chunk at boot (Reports/SSR_ARCHITECTURE_ANALYSIS.md §12.6).
 * @param {boolean} [options.preloadArabicFonts] Arabic pages preload the
 *   Arabic subsets of the theme fonts (see §12.6 for the measurement).
 * @param {boolean} [options.preloadThemeFonts] on by default: an Atelier
 *   page preloads the display face(s) its heading (the Home hero, its LCP
 *   element) is set in, which the browser otherwise finds only after the
 *   theme stylesheet (src/ssr/theme-font-preloads.ts). Theme 1 and the
 *   base-pack themes get none.
 */
export async function createSsrHandler({
  distDir,
  entryPath,
  apiOrigin,
  apiTimeoutMs = 2_000,
  renderBudgetMs = 2_500,
  cacheTtlMs = 30_000,
  cacheMaxEntries = 500,
  cacheMaxBytes = DEFAULT_CACHE_MAX_BYTES,
  maxHtmlBytes = DEFAULT_MAX_HTML_BYTES,
  log = () => {},
  preloadRouterChunks = false,
  preloadArabicFonts = false,
  preloadThemeFonts = true,
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
    routerChunk && preloadRouterChunks
      ? collectPreloads(manifest, routerChunk)
      : []
  )
    .map((file) => `<link rel="modulepreload" crossorigin href="/${file}">`)
    .join('');
  // The Arabic subsets the theme's fonts load on an Arabic page; without a
  // preload they are found only once the stylesheet is parsed.
  const arabicFonts = preloadArabicFonts
    ? readdirSync(join(distDir, 'assets')).filter((file) =>
        /^(rubik|readex-pro)-arabic-[\w-]+\.woff2$/.test(file)
      )
    : [];
  const localePreloadHtml = {
    ar: arabicFonts
      .map(
        (file) =>
          `<link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/${file}">`
      )
      .join(''),
  };
  const cache = new RenderCache({
    ttlMs: cacheTtlMs,
    maxEntries: cacheMaxEntries,
    maxBytes: cacheMaxBytes,
    // An over-budget page is never cached, so a cache hit is always in budget.
    maxEntryBytes: maxHtmlBytes,
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
          {
            template,
            preloadHtml,
            localePreloadHtml,
            preloadThemeFonts,
            apiOrigin,
            apiTimeoutMs,
            // A response larger than the page budget means the page would
            // be too (it embeds the data): stop downloading and pass early,
            // before rendering anything.
            maxResponseBytes: maxHtmlBytes,
            cache,
          }
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
      // Fail closed on an oversized page (an inline image, typically): the
      // single-page app serves it, exactly as with server rendering off.
      const bytes = byteLength(result.html);
      if (bytes > maxHtmlBytes) {
        log({
          event: 'pass',
          reason: 'html over budget',
          bytes,
          ms: Date.now() - started,
        });
        return shell('html over budget');
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
