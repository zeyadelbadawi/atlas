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
 * THE SLUG SELECTS THE FIXTURE:  fx--<theme>--<state>[--<palette>]
 *   theme    one of the five theme keys (`generated/<theme>.json`)
 *   state    `new` | `rich` | `unpublished`  (see `live-data.mjs`)
 *   palette  a `FIXTURE_PALETTES` name, injected as the stored brand
 *            (default: `default`, what a new Academy stores today)
 * Anything else resolves as an unknown hostname, exactly like production.
 *
 * Any API request this server has no fixture for is answered 404 in the
 * backend's normalised error shape and recorded, so a new, unmocked call
 * shows up in `GET /__fixture/report` instead of silently hanging a test.
 *
 * Usage: node e2e/theme-baseline/server/fixture-server.mjs [--port 4173]
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, createReadStream } from 'node:fs';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import {
  FIXTURE_ACADEMY_NAME,
  FIXTURE_PALETTES,
  buildLiveData,
} from '../fixtures/live-data.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../..');
const DIST = resolve(REPO_ROOT, 'dist-theme-fixtures');
const GENERATED = resolve(HERE, '../fixtures/generated');

const portFlag = process.argv.indexOf('--port');
const PORT = Number(portFlag > -1 ? process.argv[portFlag + 1] : 4173);

const THEMES = [
  'modern-education',
  'premium-academy',
  'corporate-learning',
  'minimal-editorial',
  'bold-creative',
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

const generatedByTheme = new Map(
  THEMES.map((theme) => [
    theme,
    JSON.parse(readFileSync(join(GENERATED, `${theme}.json`), 'utf8')),
  ])
);

/** `fx--<theme>--<state>[--<palette>]` → fixture, or null for an unknown slug. */
function parseSlug(slug) {
  const [prefix, theme, state, palette = 'default', ...rest] = String(
    slug ?? ''
  ).split('--');
  if (prefix !== 'fx' || rest.length > 0) return null;
  if (!THEMES.includes(theme) || !STATES.includes(state)) return null;
  if (!(palette in FIXTURE_PALETTES)) return null;
  return { slug, theme, state, palette };
}

function buildFixture(parsed) {
  const generated = generatedByTheme.get(parsed.theme);
  const academyId = parsed.slug;
  const rebaseIds = (value) =>
    JSON.parse(
      JSON.stringify(value).replaceAll('"fx-academy"', `"${academyId}"`)
    );
  const configuration = rebaseIds({
    ...generated.configuration,
    brand: { ...FIXTURE_PALETTES[parsed.palette] },
    status: 'published',
    publishedAt: '2026-09-01T09:00:00.000Z',
  });
  const pages = rebaseIds(generated.pages).filter((page) => page.visible);
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

createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
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
    serveStatic(req, res, url);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`theme fixture server on http://127.0.0.1:${PORT}`);
});
