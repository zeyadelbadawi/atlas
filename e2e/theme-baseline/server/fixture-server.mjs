/**
 * Theme baseline fixture server (Theme 1 plan, Phase 0).
 *
 * Serves a real, minified build of the app AND a fixture public-website API
 * from ONE origin — the same shape production has behind Caddy
 * (`/api/*` proxied, everything else `try_files {path} /index.html`), with
 * the same enforced Content-Security-Policy, parsed straight out of the
 * repository's `Caddyfile` so it can never drift from what ships.
 *
 * WHICH ROUTE RENDERS A FIXTURE. No new route is added to the app. The
 * public runtime already has a development-only entry point:
 * `?__atlas_academy_preview=<slug>` (`hostname-resolution.utils.ts`, only
 * honoured when the build's MODE is not production/staging). The fixture
 * build (`vite build --mode theme-fixtures`) keeps that entry point, and
 * this server answers the resulting `resolve?hostname=<slug>` lookup. The
 * page therefore renders through the unmodified production path:
 * `PublicWebsiteRouter` → `usePublicWebsiteData` → `PublicWebsitePage` →
 * `WebsiteRenderer` → `WebsiteThemeScope` → sections.
 *
 * THE SLUG SELECTS THE FIXTURE:  fx--<theme>--<state>[--<palette>[--c1]]
 *   theme    one of the theme keys (`generated/<theme>.json`)
 *   state    `new` | `rich` | `unpublished`  (see `live-data.mjs`)
 *   palette  a `FIXTURE_PALETTES` name, injected as the stored brand
 *            (default: `default`, what a new Academy stores today)
 *   c1       Theme 1 only: what template v2 provisions today (§C.1 Home,
 *            §C.2–§C.6 inner pages; `generated/modern-education.json`).
 *            Without it, Theme 1 renders `generated/legacy/
 *            modern-education.v1.json`: the v1 website every Theme 1
 *            Academy created before v2 still has (existing-Academy
 *            compatibility). In the `rich` state the v2 sample
 *            testimonials count as confirmed by the Owner.
 *   migrated Themes 2–5 only: the same website after the retirement
 *            migration (Reports/THEMES_2_5_RETIREMENT.md) — its own pages,
 *            sections and brand, with the theme key set to Theme 1.
 *   long…    Atelier only: the content-limits Home (renderer hardening) —
 *   legacy…  boundary, over-limit and steps/statistics variants, see
 *   std…     `parseAtelierLimitsComposition` in `live-data.mjs`.
 * Anything else resolves as an unknown hostname, exactly like production.
 *
 * Any API request this server has no fixture for is answered 404 in the
 * backend's normalised error shape and recorded, so a new, unmocked call
 * shows up in `GET /__fixture/report` instead of silently hanging a test.
 *
 * `THEME_BASELINE_SSR=1`: page requests are server-rendered in-process by
 * the SAME handler the production renderer uses (`server/ssr/handler.mjs`,
 * with the fixture SSR bundle from `pnpm theme-baseline:build:ssr`), so every
 * suite here runs against server-rendered, hydrated pages. The renderer
 * reaches this server's fixture API over an internal plain-HTTP listener.
 *
 * Usage: node e2e/theme-baseline/server/fixture-server.mjs [--port 4173]
 */
import { createServer } from 'node:http';
import { createSecureServer } from 'node:http2';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { readFileSync, existsSync, statSync, createReadStream } from 'node:fs';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import {
  FIXTURE_ACADEMY_NAME,
  FIXTURE_PALETTES,
  applyAtelierLimitsComposition,
  buildLiveData,
  parseAtelierLimitsComposition,
} from '../fixtures/live-data.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../..');
const DIST = resolve(REPO_ROOT, 'dist-theme-fixtures');
const GENERATED = resolve(HERE, '../fixtures/generated');
const SSR = process.env.THEME_BASELINE_SSR === '1';
const DIST_SSR = resolve(REPO_ROOT, 'dist-theme-fixtures-ssr');

const portFlag = process.argv.indexOf('--port');
const PORT = Number(portFlag > -1 ? process.argv[portFlag + 1] : 4173);

const THEMES = [
  'modern-education',
  'premium-academy',
  'corporate-learning',
  'minimal-editorial',
  'bold-creative',
  'atelier',
  'manara',
  'riwaq',
];
const STATES = ['new', 'rich', 'unpublished'];

/** The production CSP, verbatim from the `(csp)` snippet in the Caddyfile. */
function readProductionCsp() {
  const caddyfile = readFileSync(resolve(REPO_ROOT, 'Caddyfile'), 'utf8');
  const match = caddyfile.match(/header Content-Security-Policy `([^`]+)`/);
  if (!match) throw new Error('Content-Security-Policy not found in Caddyfile');
  return match[1];
}
const CSP = readProductionCsp();

const readGenerated = (file) =>
  JSON.parse(readFileSync(join(GENERATED, file), 'utf8'));
const generatedByTheme = new Map(
  THEMES.map((theme) => [
    theme,
    theme === 'modern-education'
      ? readGenerated('legacy/modern-education.v1.json')
      : readGenerated(`${theme}.json`),
  ])
);
/** Theme 1 template v2, as a new Academy receives it (the `c1` slug). */
const theme1V2 = readGenerated('modern-education.json');

/** `fx--<theme>--<state>[--<palette>]` → fixture, or null for an unknown slug. */
function parseSlug(slug) {
  const [prefix, theme, state, palette = 'default', composition, ...rest] =
    String(slug ?? '').split('--');
  if (prefix !== 'fx' || rest.length > 0) return null;
  if (!THEMES.includes(theme) || !STATES.includes(state)) return null;
  if (!Object.hasOwn(FIXTURE_PALETTES, palette)) return null;
  if (
    composition !== undefined &&
    !(composition === 'c1' && theme === 'modern-education') &&
    !(composition === 'migrated' && theme !== 'modern-education') &&
    !(theme === 'atelier' && parseAtelierLimitsComposition(composition))
  ) {
    return null;
  }
  const limits =
    theme === 'atelier' && composition !== undefined
      ? parseAtelierLimitsComposition(composition)
      : null;
  return { slug, theme, state, palette, composition, limits };
}

/** An established Academy has confirmed its testimonials: `sample` cleared. */
function confirmSampleTestimonials(page) {
  return {
    ...page,
    sections: page.sections.map((section) =>
      section.type === 'testimonials'
        ? {
            ...section,
            config: {
              ...section.config,
              items: section.config.items.map((item) => ({
                ...item,
                sample: false,
              })),
            },
          }
        : section
    ),
  };
}

/** The key the website is stored with: Theme 1 once a retired theme's website is migrated. */
function renderedThemeKey(parsed) {
  return parsed.composition === 'migrated' ? 'modern-education' : parsed.theme;
}

function buildFixture(parsed) {
  const generated =
    parsed.composition === 'c1' ? theme1V2 : generatedByTheme.get(parsed.theme);
  const academyId = parsed.slug;
  const rebaseIds = (value) =>
    JSON.parse(
      JSON.stringify(value).replaceAll('"fx-academy"', `"${academyId}"`)
    );
  const configuration = rebaseIds({
    ...generated.configuration,
    themeKey: renderedThemeKey(parsed),
    brand: { ...FIXTURE_PALETTES[parsed.palette] },
    status: 'published',
    publishedAt: '2026-09-01T09:00:00.000Z',
  });
  const pages = rebaseIds(generated.pages)
    .filter((page) => page.visible)
    .map((page) =>
      parsed.composition === 'c1' && parsed.state === 'rich'
        ? confirmSampleTestimonials(page)
        : page
    )
    .map((page) =>
      parsed.limits ? applyAtelierLimitsComposition(page, parsed.limits) : page
    );
  return {
    academyId,
    published: parsed.state !== 'unpublished',
    configuration,
    pages,
    live: buildLiveData(academyId, parsed.state === 'rich' ? 'rich' : 'new'),
  };
}

/** Observed traffic, for `GET /__fixture/report` (unmocked calls, CSP reports). */
const report = { unmocked: new Map(), cspViolations: [] };

function apiError(status, kind, messageKey) {
  return { status, body: { kind, messageKey, status } };
}
const NOT_FOUND = apiError(404, 'notFound', 'errors:notFound');

function paginate(items, searchParams) {
  const page = Number(searchParams.get('page') ?? 1) || 1;
  const pageSize = Number(searchParams.get('pageSize') ?? 12) || 12;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      totalItems: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
    },
  };
}

function filterCourses(courses, searchParams) {
  const search = (searchParams.get('search') ?? '').trim().toLowerCase();
  const categoryId = searchParams.get('categoryId');
  const level = searchParams.get('level');
  const pricingType = searchParams.get('pricingType');
  return courses.filter(
    (course) =>
      (!search || course.title.toLowerCase().includes(search)) &&
      (!categoryId || course.categoryId === categoryId) &&
      (!level || course.level === level) &&
      (!pricingType || course.pricing.type === pricingType)
  );
}

/** The public-website API, for fixture academies only. */
function handlePublicWebsites(segments, url) {
  // segments: ['resolve'] | [academyId, ...rest]
  if (segments[0] === 'resolve') {
    const parsed = parseSlug(url.searchParams.get('hostname'));
    if (!parsed) return NOT_FOUND;
    return {
      status: 200,
      body: {
        academyId: parsed.slug,
        academyName: FIXTURE_ACADEMY_NAME,
        academySlug: parsed.slug,
        // Theme 1 plan Phase 6 — the theme and public colours, published or
        // not (what the real lookup now returns).
        presentation: {
          themeKey: renderedThemeKey(parsed),
          brand: { ...FIXTURE_PALETTES[parsed.palette] },
        },
      },
    };
  }

  const parsed = parseSlug(segments[0]);
  if (!parsed) return NOT_FOUND;
  const fixture = buildFixture(parsed);
  const [, resource, id, sub] = segments;
  const { live } = fixture;

  switch (resource) {
    case undefined:
      return fixture.published
        ? { status: 200, body: fixture.configuration }
        : NOT_FOUND;
    case 'pages':
      if (!fixture.published) return NOT_FOUND;
      if (!id) return { status: 200, body: fixture.pages };
      return {
        status: 200,
        body: fixture.pages.find((page) => page.slug === id) ?? null,
      };
    case 'identity':
      return { status: 200, body: live.identity };
    case 'statistics':
      return { status: 200, body: live.statistics };
    case 'categories':
      return { status: 200, body: live.categories };
    case 'courses': {
      if (!id) {
        return {
          status: 200,
          body: paginate(
            filterCourses(live.courses, url.searchParams),
            url.searchParams
          ),
        };
      }
      const course = live.courses.find((candidate) => candidate.id === id);
      if (!course) return NOT_FOUND;
      if (!sub) return { status: 200, body: course };
      if (sub === 'curriculum') {
        return {
          status: 200,
          body: course.id === 'fx-course-1' ? live.curriculum : [],
        };
      }
      if (sub === 'reviews') {
        const reviews = live.reviews.filter((review) => review.courseId === id);
        return { status: 200, body: paginate(reviews, url.searchParams) };
      }
      if (sub === 'rating') {
        const reviews = live.reviews.filter((review) => review.courseId === id);
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const review of reviews) distribution[review.rating] += 1;
        const total = reviews.length;
        return {
          status: 200,
          body: {
            courseId: id,
            averageRating: total
              ? Math.round(
                  (reviews.reduce((s, r) => s + r.rating, 0) / total) * 10
                ) / 10
              : 0,
            totalReviews: total,
            distribution,
          },
        };
      }
      if (sub === 'recommendations') {
        return {
          status: 200,
          body: live.courses
            .filter((candidate) => candidate.id !== id)
            .slice(0, 3),
        };
      }
      return NOT_FOUND;
    }
    case 'contact':
      return { status: 204, body: null };
    default:
      return NOT_FOUND;
  }
}

function handleApi(req, url, rawBody) {
  const path = url.pathname.replace(/^\/api\/v1\/?/, '');
  const segments = path.split('/').filter(Boolean).map(decodeURIComponent);

  if (segments[0] === 'security' && segments[1] === 'csp-reports') {
    report.cspViolations.push(rawBody);
    return { status: 204, body: null };
  }
  if (segments[0] === 'public' && segments[1] === 'websites') {
    return handlePublicWebsites(segments.slice(2), url);
  }
  // `AuthOptionsController`: which sign-in methods this host offers. The
  // fixture Academy has Google sign-in off, which the backend answers as
  // `{ google: false }` (never an error) — so the auth pages render their
  // email/password form only.
  if (segments[0] === 'auth' && segments[1] === 'options') {
    return { status: 200, body: { google: false } };
  }

  const key = `${req.method} /${segments.join('/')}`;
  report.unmocked.set(key, (report.unmocked.get(key) ?? 0) + 1);
  return { ...NOT_FOUND, unmocked: true };
}

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.ico': 'image/x-icon',
};
const COMPRESSIBLE = new Set([
  '.html',
  '.js',
  '.mjs',
  '.css',
  '.json',
  '.svg',
  '.txt',
  '.xml',
]);

function send(req, res, status, headers, body) {
  const accepts = /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
  if (body && accepts && body.length > 1024) {
    body = gzipSync(body);
    headers['Content-Encoding'] = 'gzip';
    headers.Vary = 'Accept-Encoding';
  }
  if (body) headers['Content-Length'] = body.length;
  res.writeHead(status, headers);
  res.end(body ?? undefined);
}

/** Whether `url` names a file in the build (what Caddy's `try_files {path}` finds). */
function staticFileFor(url) {
  const safePath = normalize(decodeURIComponent(url.pathname)).replace(
    /^(\.\.[/\\])+/,
    ''
  );
  const file = join(DIST, safePath);
  return file.startsWith(DIST) &&
    existsSync(file) &&
    !statSync(file).isDirectory()
    ? file
    : null;
}

let ssrHandler = null;

async function serveServerRendered(req, res, url) {
  const result = await ssrHandler.handle({
    method: req.method,
    url: `${url.pathname}${url.search}`,
    host: req.headers.host ?? req.headers[':authority'],
    protocol: HTTP2 ? 'https' : 'http',
    cookieHeader: req.headers.cookie,
    clientIp: req.socket.remoteAddress,
  });
  send(
    req,
    res,
    result.status,
    {
      ...result.headers,
      'Content-Security-Policy': CSP,
      'X-Content-Type-Options': 'nosniff',
    },
    req.method === 'HEAD' ? null : Buffer.from(result.body)
  );
}

function serveStatic(req, res, url) {
  const safePath = normalize(decodeURIComponent(url.pathname)).replace(
    /^(\.\.[/\\])+/,
    ''
  );
  let file = join(DIST, safePath);
  const found =
    file.startsWith(DIST) && existsSync(file) && !statSync(file).isDirectory();
  // The Caddyfile's `(theme_assets)` block: versioned theme photographs are
  // immutable when present and a real 404 when not (no SPA fallback).
  const isThemeAsset = url.pathname.startsWith('/theme-assets/');
  if (isThemeAsset && !found) {
    res.writeHead(404, { 'X-Content-Type-Options': 'nosniff' });
    res.end();
    return;
  }
  if (!found) {
    file = join(DIST, 'index.html'); // try_files {path} /index.html
  }
  const extension = extname(file);
  const headers = {
    'Content-Type': CONTENT_TYPES[extension] ?? 'application/octet-stream',
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    ...(isThemeAsset
      ? { 'Cache-Control': 'public, max-age=31536000, immutable' }
      : {}),
  };
  if (COMPRESSIBLE.has(extension)) {
    send(req, res, 200, headers, readFileSync(file));
  } else {
    res.writeHead(200, headers);
    createReadStream(file).pipe(res);
  }
}

if (!existsSync(join(DIST, 'index.html'))) {
  console.error(
    `No fixture build at ${DIST}. Run \`pnpm theme-baseline:build\` first.`
  );
  process.exit(1);
}

/**
 * `THEME_BASELINE_HTTP2=1`: serve over HTTP/2 + TLS like production (Caddy,
 * and Cloudflare for custom hostnames, multiplex every request over one
 * connection). Used for Lighthouse runs; the screenshot/axe baseline keeps
 * plain HTTP/1.1. The certificate is self-signed and generated per run, so
 * the browser needs `--ignore-certificate-errors`.
 */
const HTTP2 = process.env.THEME_BASELINE_HTTP2 === '1';

function selfSignedCertificate() {
  const dir = mkdtempSync(join(tmpdir(), 'fixture-tls-'));
  const key = join(dir, 'key.pem');
  const cert = join(dir, 'cert.pem');
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-days',
      '1',
      '-subj',
      '/CN=127.0.0.1',
      '-keyout',
      key,
      '-out',
      cert,
    ],
    { stdio: 'ignore' }
  );
  return { key: readFileSync(key), cert: readFileSync(cert) };
}

function handle(req, res) {
  const url = new URL(
    req.url,
    `http://${req.headers.host ?? req.headers[':authority']}`
  );
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    if (url.pathname === '/__fixture/report') {
      send(
        req,
        res,
        200,
        { 'Content-Type': 'application/json' },
        Buffer.from(
          JSON.stringify({
            unmocked: Object.fromEntries(report.unmocked),
            cspViolations: report.cspViolations,
          })
        )
      );
      return;
    }
    if (url.pathname === '/__fixture/reset' && req.method === 'POST') {
      report.unmocked.clear();
      report.cspViolations.length = 0;
      send(req, res, 204, {}, null);
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      const { status, body, unmocked } = handleApi(
        req,
        url,
        Buffer.concat(chunks).toString('utf8')
      );
      send(
        req,
        res,
        status,
        {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          ...(unmocked ? { 'X-Fixture-Unmocked': '1' } : {}),
        },
        body === null ? null : Buffer.from(JSON.stringify(body))
      );
      return;
    }
    if (
      SSR &&
      !url.pathname.startsWith('/theme-assets/') &&
      !staticFileFor(url)
    ) {
      void serveServerRendered(req, res, url);
      return;
    }
    serveStatic(req, res, url);
  });
}

if (SSR) {
  // React's production build, as the production renderer runs it.
  process.env.NODE_ENV ??= 'production';
  if (!existsSync(join(DIST_SSR, 'entry-server.js'))) {
    console.error(
      `No SSR fixture build at ${DIST_SSR}. Run \`pnpm theme-baseline:build:ssr\` first.`
    );
    process.exit(1);
  }
  // The renderer calls the fixture API like the production renderer calls
  // the backend: plain HTTP on an internal listener.
  const internal = createServer(handle);
  await new Promise((done) => internal.listen(0, '127.0.0.1', done));
  const { createSsrHandler } = await import(
    resolve(REPO_ROOT, 'server/ssr/handler.mjs')
  );
  ssrHandler = await createSsrHandler({
    distDir: DIST,
    entryPath: join(DIST_SSR, 'entry-server.js'),
    apiOrigin: `http://127.0.0.1:${internal.address().port}`,
    // Fixture pages must render deterministically: no cache between runs'
    // pages (each test is a fresh visit), generous budgets.
    cacheTtlMs: Number(process.env.THEME_BASELINE_SSR_CACHE_MS ?? 0),
    renderBudgetMs: 10_000,
    apiTimeoutMs: 5_000,
    // As production (off) unless an experiment asks for it.
    preloadRouterChunks: process.env.THEME_BASELINE_SSR_PRELOAD === '1',
    preloadArabicFonts: process.env.THEME_BASELINE_SSR_AR_FONTS === '1',
    // As production (off) unless an experiment asks for it.
    preloadThemeFonts: process.env.THEME_BASELINE_SSR_THEME_FONTS === '1',
    log:
      process.env.THEME_BASELINE_SSR_LOG === '1'
        ? (event) => console.log(JSON.stringify(event))
        : undefined,
  });
}

(HTTP2
  ? createSecureServer({ ...selfSignedCertificate(), allowHTTP1: true }, handle)
  : createServer(handle)
).listen(PORT, '127.0.0.1', () => {
  console.log(
    `theme fixture server on ${HTTP2 ? 'https' : 'http'}://127.0.0.1:${PORT}`
  );
});
