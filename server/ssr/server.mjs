#!/usr/bin/env node
/**
 * Public Academy website server renderer — production process
 * (Reports/SSR_ARCHITECTURE_ANALYSIS.md). Runs behind Caddy on the internal
 * network only; it publishes no port to the host.
 *
 * Caddy sends it page requests for Academy hosts that match no static
 * file. It answers with the server-rendered page, or with the unchanged
 * single-page app shell and `X-Atlas-SSR: pass`. If this process is slow,
 * failing or stopped, Caddy serves its own copy of the shell, so the
 * public website never depends on it being up.
 *
 * Environment:
 *   SSR_PORT             listen port (default 3100)
 *   SSR_API_ORIGIN       the backend, e.g. http://backend:3000 (required)
 *   SSR_DIST             the client build (default ./dist)
 *   SSR_ENTRY            the SSR bundle entry (default ./dist-ssr/entry-server.js)
 *   SSR_RENDER_BUDGET_MS whole request budget (default 2500)
 *   SSR_API_TIMEOUT_MS   per API call (default 2000)
 *   SSR_CACHE_TTL_MS     rendered-page cache lifetime (default 30000; 0 disables)
 *   SSR_CACHE_MAX        rendered-page cache entries (default 500)
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { createSsrHandler } from './handler.mjs';

process.env.NODE_ENV ??= 'production';

const env = (name, fallback) => process.env[name] ?? fallback;
const PORT = Number(env('SSR_PORT', 3100));
const API_ORIGIN = env('SSR_API_ORIGIN', '');
const DIST = resolve(env('SSR_DIST', 'dist'));
const ENTRY = resolve(env('SSR_ENTRY', 'dist-ssr/entry-server.js'));

if (!/^https?:\/\/[^/]+$/.test(API_ORIGIN)) {
  console.error('SSR_API_ORIGIN must be an origin such as http://backend:3000');
  process.exit(1);
}

const log = (event) =>
  process.stdout.write(
    `${JSON.stringify({ t: new Date().toISOString(), ...event })}\n`
  );

const { handle } = await createSsrHandler({
  distDir: DIST,
  entryPath: ENTRY,
  apiOrigin: API_ORIGIN,
  apiTimeoutMs: Number(env('SSR_API_TIMEOUT_MS', 2_000)),
  renderBudgetMs: Number(env('SSR_RENDER_BUDGET_MS', 2_500)),
  cacheTtlMs: Number(env('SSR_CACHE_TTL_MS', 30_000)),
  cacheMaxEntries: Number(env('SSR_CACHE_MAX', 500)),
  log,
});

const ASSET_TYPES = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

/**
 * `/assets/*` from this renderer's own build. Caddy asks here only when its
 * own `/srv` does not have the file: during a rollout, a page rendered by
 * this build can reference chunks the other container no longer has.
 */
function serveAsset(req, res, pathname) {
  let file;
  try {
    file = normalize(join(DIST, decodeURIComponent(pathname)));
  } catch {
    file = '';
  }
  // Only files inside the build's own assets folder, nothing above it.
  if (
    !file.startsWith(join(DIST, 'assets') + sep) ||
    !existsSync(file) ||
    statSync(file).isDirectory()
  ) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': ASSET_TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
  if (req.method === 'HEAD') res.end();
  else createReadStream(file).pipe(res);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://renderer.invalid');
  if (url.pathname === '/__ssr/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    serveAsset(req, res, url.pathname);
    return;
  }
  const result = await handle({
    method: req.method ?? 'GET',
    url: `${url.pathname}${url.search}`,
    host: req.headers.host ?? '',
    // Caddy terminates TLS; the renderer only ever sees its HTTP hop.
    protocol: req.headers['x-forwarded-proto'] === 'http' ? 'http' : 'https',
    cookieHeader: req.headers.cookie,
    // Set by Caddy from the trusted client address; the only hop that can
    // reach this port is Caddy.
    clientIp:
      typeof req.headers['x-real-ip'] === 'string'
        ? req.headers['x-real-ip']
        : undefined,
  });
  res.writeHead(result.status, result.headers);
  res.end(req.method === 'HEAD' ? undefined : result.body);
});

server.headersTimeout = 10_000;
server.requestTimeout = 15_000;
server.listen(PORT, '0.0.0.0', () => log({ event: 'listening', port: PORT }));

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5_000).unref();
  });
}
