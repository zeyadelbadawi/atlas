/**
 * Server rendering — Lighthouse before/after (Phase 8,
 * Reports/SSR_ARCHITECTURE_ANALYSIS.md).
 *
 * The same methodology as `run-lighthouse.mjs` (Lighthouse defaults,
 * simulated throttling, median of RUNS runs by performance score, the
 * minified fixture build served like production over HTTP/2 + TLS), on the
 * same build, served two ways by the same fixture server:
 *   - before: the single-page app (as production serves it today);
 *   - after:  server-rendered (THEME_BASELINE_SSR=1, the shipped renderer).
 *
 * Theme 1 (the only selectable theme), the public pages, EN and AR, mobile
 * (Lighthouse's default) and desktop (Lighthouse's own desktop preset).
 * Cold: a first visit — browser storage and cache reset, and the renderer's
 * page cache off. Warm: a repeat visit — browser cache kept after a priming
 * load, the renderer's page cache at its production lifetime (30 s).
 *
 * Adds to the baseline's metrics what server rendering changes: server
 * response time (TTFB), the HTML document's size and the critical request
 * chain.
 *
 *   pnpm theme-baseline:build && pnpm theme-baseline:build:ssr
 *   THEME_BASELINE_CHROMIUM=/path/to/chrome node e2e/theme-baseline/lighthouse/run-ssr-comparison.mjs
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { chromium } from 'playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIGHTHOUSE_VERSION = JSON.parse(
  readFileSync(
    resolve(HERE, '../../../node_modules/lighthouse/package.json'),
    'utf8'
  )
).version;
const OUTPUT =
  process.env.THEME_BASELINE_SSR_LIGHTHOUSE_OUT ??
  resolve(HERE, '../baselines/lighthouse-ssr-comparison.json');
const DEBUG_PORT = 9334;
const RUNS = Number(process.env.THEME_BASELINE_LIGHTHOUSE_RUNS ?? 3);
const SLUG = 'fx--modern-education--rich';

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'courses', path: '/courses' },
  { name: 'course-details', path: '/courses/fx-course-1' },
  { name: 'about', path: '/about' },
  { name: 'faqs', path: '/faqs' },
  { name: 'contact', path: '/contact' },
];
const LOCALES = ['en', 'ar'];
const FORM_FACTORS = ['mobile', 'desktop'];
const CACHES = ['cold', 'warm'];
/** Optional comma-separated filters, e.g. LH_PAGES=home,courses. */
const only = (name, all) =>
  process.env[name]
    ? all.filter((value) => process.env[name].split(',').includes(value))
    : all;

/** The fixture server, over HTTP/2 + TLS, in one serving mode. */
function startServer(port, env) {
  const server = spawn(
    process.execPath,
    [resolve(HERE, '../server/fixture-server.mjs'), '--port', String(port)],
    {
      stdio: ['ignore', 'pipe', 'inherit'],
      env: { ...process.env, THEME_BASELINE_HTTP2: '1', ...env },
    }
  );
  return new Promise((resolveStart, reject) => {
    server.stdout.on('data', (chunk) => {
      if (String(chunk).includes('fixture server on')) resolveStart(server);
    });
    server.on('exit', (code) =>
      reject(new Error(`fixture server exited (${code})`))
    );
  });
}

/**
 * The longest critical request chain (Lighthouse 13 reports it in the
 * network dependency tree insight): its length in requests, when its last
 * request ended (observed, not simulated) and the bytes along it.
 */
function longestChain(lhr) {
  const items =
    lhr.audits['network-dependency-tree-insight']?.details?.items ?? [];
  const chains = items.find((item) => item.value?.type === 'network-tree')
    ?.value?.chains;
  if (!chains) return null;
  let length = 0;
  let durationMs = 0;
  let transferBytes = 0;
  let level = Object.values(chains);
  for (;;) {
    const next = level.find((node) => node.isLongest);
    if (!next) break;
    length += 1;
    durationMs = Math.round(next.navStartToEndTime);
    transferBytes += next.transferSize ?? 0;
    level = Object.values(next.children ?? {});
  }
  return { length, durationMs, transferBytes };
}

function summarise(lhr) {
  const audit = (id) => lhr.audits[id]?.numericValue ?? null;
  const resources = lhr.audits['resource-summary']?.details?.items ?? [];
  const bytes = (type) =>
    resources.find((item) => item.resourceType === type)?.transferSize ?? null;
  const chain = longestChain(lhr);
  const documentRequest = (
    lhr.audits['network-requests']?.details?.items ?? []
  ).find((item) => item.resourceType === 'Document');
  return {
    performance: Math.round((lhr.categories.performance.score ?? 0) * 100),
    metrics: {
      serverResponseTimeMs: Math.round(audit('server-response-time') ?? 0),
      firstContentfulPaintMs: Math.round(audit('first-contentful-paint')),
      largestContentfulPaintMs: Math.round(audit('largest-contentful-paint')),
      totalBlockingTimeMs: Math.round(audit('total-blocking-time')),
      cumulativeLayoutShift: Number(
        audit('cumulative-layout-shift')?.toFixed(3)
      ),
      speedIndexMs: Math.round(audit('speed-index')),
    },
    lcpElement:
      lhr.audits['largest-contentful-paint-element']?.details?.items?.[0]
        ?.items?.[0]?.node?.nodeLabel ?? null,
    html: {
      transferBytes: documentRequest?.transferSize ?? null,
      resourceBytes: documentRequest?.resourceSize ?? null,
    },
    transferBytes: {
      total: bytes('total'),
      script: bytes('script'),
      document: bytes('document'),
      image: bytes('image'),
      font: bytes('font'),
      stylesheet: bytes('stylesheet'),
    },
    requests:
      resources.find((item) => item.resourceType === 'total')?.requestCount ??
      null,
    criticalChain: chain,
  };
}

function median(runs) {
  const sorted = [...runs].sort(
    (a, b) =>
      a.performance - b.performance ||
      b.metrics.largestContentfulPaintMs - a.metrics.largestContentfulPaintMs
  );
  return sorted[Math.floor(sorted.length / 2)];
}

async function measure(url, formFactor, warm) {
  const flags = {
    port: DEBUG_PORT,
    output: 'json',
    logLevel: 'error',
    onlyCategories: ['performance'],
    ...(formFactor === 'mobile' ? { formFactor: 'mobile' } : {}),
    ...(warm ? { disableStorageReset: true } : {}),
  };
  const config = formFactor === 'desktop' ? desktopConfig : undefined;
  if (warm) await lighthouse(url, flags, config); // prime the browser cache
  const runs = [];
  for (let run = 0; run < RUNS; run += 1) {
    const result = await lighthouse(url, flags, config);
    runs.push(summarise(result.lhr));
  }
  return median(runs);
}

async function main() {
  const servers = {
    spa: { port: 4181, env: {} },
    'ssr-cold': {
      port: 4182,
      env: { THEME_BASELINE_SSR: '1', THEME_BASELINE_SSR_CACHE_MS: '0' },
    },
    'ssr-warm': {
      port: 4183,
      env: { THEME_BASELINE_SSR: '1', THEME_BASELINE_SSR_CACHE_MS: '30000' },
    },
  };
  const running = [];
  for (const server of Object.values(servers)) {
    running.push(await startServer(server.port, server.env));
  }
  const browser = await chromium.launch({
    executablePath: process.env.THEME_BASELINE_CHROMIUM || undefined,
    args: [
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--ignore-certificate-errors',
    ],
  });
  const chromiumVersion = browser.version();
  const results = {};
  try {
    for (const page of PAGES.filter((p) =>
      only(
        'LH_PAGES',
        PAGES.map((x) => x.name)
      ).includes(p.name)
    )) {
      for (const locale of only('LH_LOCALES', LOCALES)) {
        const path =
          locale === 'en'
            ? page.path
            : `/ar${page.path === '/' ? '/' : page.path}`;
        for (const formFactor of only('LH_FORM_FACTORS', FORM_FACTORS)) {
          for (const cache of only('LH_CACHES', CACHES)) {
            const ssrServer =
              servers[cache === 'cold' ? 'ssr-cold' : 'ssr-warm'];
            const at = (port) =>
              `https://127.0.0.1:${port}${path}?__atlas_academy_preview=${SLUG}`;
            const before = await measure(
              at(servers.spa.port),
              formFactor,
              cache === 'warm'
            );
            const after = await measure(
              at(ssrServer.port),
              formFactor,
              cache === 'warm'
            );
            const key = `${page.name}/${locale}/${formFactor}/${cache}`;
            results[key] = { before, after };
            // Written as it goes: a long run survives an interruption.
            writeResults(results, chromiumVersion);
            console.log(
              `${key.padEnd(34)} perf ${before.performance}→${after.performance}  ` +
                `TTFB ${before.metrics.serverResponseTimeMs}→${after.metrics.serverResponseTimeMs}  ` +
                `FCP ${before.metrics.firstContentfulPaintMs}→${after.metrics.firstContentfulPaintMs}  ` +
                `LCP ${before.metrics.largestContentfulPaintMs}→${after.metrics.largestContentfulPaintMs}  ` +
                `CLS ${before.metrics.cumulativeLayoutShift}→${after.metrics.cumulativeLayoutShift}  ` +
                `TBT ${before.metrics.totalBlockingTimeMs}→${after.metrics.totalBlockingTimeMs}  ` +
                `HTML ${Math.round((before.html.transferBytes ?? 0) / 1024)}→${Math.round((after.html.transferBytes ?? 0) / 1024)}KB`
            );
          }
        }
      }
    }
  } finally {
    await browser.close();
    for (const server of running) server.kill();
  }

  writeResults(results, chromiumVersion);
  console.log(`wrote ${OUTPUT}`);
}

function writeResults(results, chromiumVersion) {
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(
    OUTPUT,
    `${JSON.stringify(
      {
        recordedAt: new Date().toISOString().slice(0, 10),
        lighthouseVersion: LIGHTHOUSE_VERSION,
        chromium: chromiumVersion,
        method: `Lighthouse defaults (mobile) and Lighthouse desktop preset, simulated throttling, median of ${RUNS} runs by performance score, HTTP/2 + TLS; cold = storage/cache reset and renderer page cache off, warm = browser cache primed and kept, renderer page cache 30 s; before = same build as the SPA, after = server-rendered`,
        page: SLUG,
        results,
      },
      null,
      2
    )}\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
