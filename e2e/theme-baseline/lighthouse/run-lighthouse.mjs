/**
 * Theme baseline — Lighthouse performance baseline (Theme 1 plan, Phase 0).
 *
 * Mobile only (the plan's targets, §I.1/§J.8, are mobile): Lighthouse's
 * default mobile emulation with simulated throttling, against the minified
 * fixture build served like production (same origin, gzip, enforced CSP —
 * `server/fixture-server.mjs`). Each case runs RUNS times and the median
 * run (by performance score, then LCP) is recorded, because a single
 * Lighthouse run is noisy.
 *
 * It is a first visit, exactly as a real visitor's: no consent seeded, no
 * warm cache. Google Fonts load over the network, as in production.
 *
 *   pnpm theme-baseline:build
 *   THEME_BASELINE_CHROMIUM=/path/to/chrome pnpm theme-baseline:lighthouse
 *
 * Writes `baselines/lighthouse.json`. Compare a later run against it by
 * hand or in a later phase's budget check; Lighthouse numbers vary between
 * machines, so re-record on the machine you compare on.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import { chromium } from 'playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIGHTHOUSE_VERSION = JSON.parse(
  readFileSync(
    resolve(HERE, '../../../node_modules/lighthouse/package.json'),
    'utf8'
  )
).version;
const OUTPUT = resolve(HERE, '../baselines/lighthouse.json');
const PORT = Number(process.env.THEME_BASELINE_PORT ?? 4175);
const DEBUG_PORT = 9333;
const RUNS = Number(process.env.THEME_BASELINE_LIGHTHOUSE_RUNS ?? 3);
const BASE = `http://127.0.0.1:${PORT}`;

const THEMES = [
  'modern-education',
  'premium-academy',
  'corporate-learning',
  'minimal-editorial',
  'bold-creative',
];
const CASES = [
  { name: 'home-new', path: '/', state: 'new' },
  { name: 'home-rich', path: '/', state: 'rich' },
  { name: 'courses-rich', path: '/courses', state: 'rich' },
  { name: 'course-details-rich', path: '/courses/fx-course-1', state: 'rich' },
];

function startServer() {
  const server = spawn(
    process.execPath,
    [resolve(HERE, '../server/fixture-server.mjs'), '--port', String(PORT)],
    { stdio: ['ignore', 'pipe', 'inherit'] }
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

function summarise(lhr) {
  const audit = (id) => lhr.audits[id]?.numericValue ?? null;
  const resources = lhr.audits['resource-summary']?.details?.items ?? [];
  const bytes = (type) =>
    resources.find((item) => item.resourceType === type)?.transferSize ?? null;
  return {
    scores: Object.fromEntries(
      Object.entries(lhr.categories).map(([id, category]) => [
        id,
        Math.round((category.score ?? 0) * 100),
      ])
    ),
    metrics: {
      firstContentfulPaintMs: Math.round(audit('first-contentful-paint')),
      largestContentfulPaintMs: Math.round(audit('largest-contentful-paint')),
      totalBlockingTimeMs: Math.round(audit('total-blocking-time')),
      cumulativeLayoutShift: Number(
        audit('cumulative-layout-shift')?.toFixed(3)
      ),
      speedIndexMs: Math.round(audit('speed-index')),
    },
    transferBytes: {
      total: bytes('total'),
      script: bytes('script'),
      stylesheet: bytes('stylesheet'),
      font: bytes('font'),
      image: bytes('image'),
      document: bytes('document'),
    },
    requests:
      resources.find((item) => item.resourceType === 'total')?.requestCount ??
      null,
  };
}

function median(runs) {
  const sorted = [...runs].sort(
    (a, b) =>
      a.scores.performance - b.scores.performance ||
      b.metrics.largestContentfulPaintMs - a.metrics.largestContentfulPaintMs
  );
  return sorted[Math.floor(sorted.length / 2)];
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({
    executablePath: process.env.THEME_BASELINE_CHROMIUM || undefined,
    args: [
      `--remote-debugging-port=${DEBUG_PORT}`,
      // Only needed where outbound HTTPS is intercepted by a proxy with its
      // own CA (e.g. a sandboxed CI container) — Google Fonts would
      // otherwise fail and the fallback font would skew LCP.
      ...(process.env.THEME_BASELINE_IGNORE_CERT_ERRORS === '1'
        ? ['--ignore-certificate-errors']
        : []),
    ],
  });

  const chromiumVersion = browser.version();
  const results = {};
  try {
    for (const theme of THEMES) {
      for (const testCase of CASES) {
        const url = `${BASE}${testCase.path}?__atlas_academy_preview=fx--${theme}--${testCase.state}`;
        const runs = [];
        for (let run = 0; run < RUNS; run += 1) {
          const result = await lighthouse(url, {
            port: DEBUG_PORT,
            output: 'json',
            logLevel: 'error',
            formFactor: 'mobile',
            onlyCategories: [
              'performance',
              'accessibility',
              'best-practices',
              'seo',
            ],
          });
          runs.push(summarise(result.lhr));
        }
        const key = `${theme}/${testCase.name}`;
        results[key] = {
          url: `${testCase.path}?__atlas_academy_preview=fx--${theme}--${testCase.state}`,
          ...median(runs),
        };
        const m = results[key];
        console.log(
          `${key.padEnd(42)} perf ${String(m.scores.performance).padStart(3)}  LCP ${String(m.metrics.largestContentfulPaintMs).padStart(5)}ms  CLS ${m.metrics.cumulativeLayoutShift}  TBT ${m.metrics.totalBlockingTimeMs}ms  JS ${Math.round(m.transferBytes.script / 1024)}KB`
        );
      }
    }
  } finally {
    await browser.close();
    server.kill();
  }

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(
    OUTPUT,
    `${JSON.stringify(
      {
        recordedAt: new Date().toISOString().slice(0, 10),
        lighthouseVersion: LIGHTHOUSE_VERSION,
        chromium: chromiumVersion,
        method: `mobile, simulated throttling, median of ${RUNS} runs by performance score; first visit (no consent seeded, cold cache)`,
        results,
      },
      null,
      2
    )}\n`
  );
  console.log(
    `wrote ${join('e2e/theme-baseline/baselines', 'lighthouse.json')}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
