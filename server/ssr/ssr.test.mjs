/**
 * Server renderer — isolation, caching, failure and security tests
 * (Reports/SSR_ARCHITECTURE_ANALYSIS.md §9).
 *
 * Runs the PRODUCTION bundles against a mock backend that serves two
 * published Academies with different palettes, content and courses on
 * their own hostnames, one unpublished Academy, and failure modes on
 * demand. The mock answers with the theme baseline's own generated
 * website and live data (the shapes the real API returns). Every request
 * the renderer makes to the backend is recorded, so what it sends — and
 * never sends — is asserted too.
 *
 *   VITE_PLATFORM_BASE_DOMAIN=atlass.dpdns.org pnpm build
 *   VITE_PLATFORM_BASE_DOMAIN=atlass.dpdns.org pnpm build:ssr
 *   pnpm test:ssr
 */
import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSsrHandler,
  DEFAULT_MAX_HTML_BYTES,
  findPublicRouterChunk,
  RenderCache,
} from './handler.mjs';
import { buildLiveData } from '../../e2e/theme-baseline/fixtures/live-data.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = join(ROOT, 'dist');
const ENTRY = join(ROOT, 'dist-ssr', 'entry-server.js');
const BASE = 'atlass.dpdns.org';

// Theme 1's own generated website, as provisioning creates it.
const TEMPLATE = JSON.parse(
  readFileSync(
    join(ROOT, 'e2e/theme-baseline/fixtures/generated/modern-education.json'),
    'utf8'
  )
);

function withHeroTitle(pages, title) {
  return pages.map((page) =>
    page.coreType === 'home'
      ? {
          ...page,
          sections: page.sections.map((section) =>
            section.type === 'hero'
              ? {
                  ...section,
                  config: {
                    ...section.config,
                    title: { en: title, ar: `${title} ع` },
                  },
                }
              : section
          ),
        }
      : page
  );
}

/** One Academy: its own id, host, palette, hero title, identity and courses. */
function academy(label, id, primaryColor, heroTitle) {
  const rebase = (value) =>
    JSON.parse(JSON.stringify(value).replaceAll('"fx-academy"', `"${id}"`));
  const brand = {
    primaryColor,
    secondaryColor: primaryColor,
    accentColor: primaryColor,
  };
  const live = buildLiveData(id, 'rich');
  const name = `${label[0].toUpperCase()}${label.slice(1)}`;
  live.identity = {
    ...live.identity,
    name: `${name} Academy`,
    contactEmail: `hello@${label}.example`,
  };
  live.courses = live.courses.map((course) => ({
    ...course,
    title: `${name} course ${course.id}`,
  }));
  return {
    host: `${label}.${BASE}`,
    resolve: {
      academyId: id,
      academyName: `${name} Academy`,
      academySlug: label,
      presentation: { themeKey: 'modern-education', brand },
    },
    // What the public API returns for a published website (as the
    // fixture server does): its publication, and visible pages only.
    configuration: {
      ...rebase(TEMPLATE.configuration),
      brand,
      status: 'published',
      publishedAt: '2026-09-01T09:00:00.000Z',
    },
    pages: withHeroTitle(rebase(TEMPLATE.pages), heroTitle).filter(
      (page) => page.visible
    ),
    live,
    published: true,
  };
}

const ALPHA_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BETA_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const GAMMA_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ALPHA = `alpha.${BASE}`;
const BETA = `beta.${BASE}`;
const GAMMA = `gamma.${BASE}`;
const ALPHA_PRIMARY = '350 60% 45%';
const BETA_PRIMARY = '200 80% 35%';

let state;
function resetState() {
  const gamma = academy(
    'gamma',
    GAMMA_ID,
    '120 40% 40%',
    'Gamma is not live yet'
  );
  gamma.published = false;
  state = {
    academies: {
      [ALPHA_ID]: academy(
        'alpha',
        ALPHA_ID,
        ALPHA_PRIMARY,
        'Alpha learns faster'
      ),
      [BETA_ID]: academy('beta', BETA_ID, BETA_PRIMARY, 'Beta builds careers'),
      [GAMMA_ID]: gamma,
    },
    requests: [],
    failPages: false,
    malformedPages: false,
    delayMs: 0,
  };
}

const NOT_FOUND = {
  kind: 'notFound',
  messageKey: 'errors:notFound',
  status: 404,
};

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

/** The public website API, as the fixture server answers it. */
function route(url) {
  if (!url.pathname.startsWith('/api/v1/public/websites/'))
    return [404, NOT_FOUND];
  const segments = url.pathname
    .replace(/^\/api\/v1\/public\/websites\/?/, '')
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);
  if (segments[0] === 'resolve') {
    const host = url.searchParams.get('hostname');
    const found = Object.values(state.academies).find((a) => a.host === host);
    return found ? [200, found.resolve] : [404, NOT_FOUND];
  }
  const target = state.academies[segments[0]];
  if (!target) return [404, NOT_FOUND];
  const [, resource, id, sub] = segments;
  const { live } = target;
  switch (resource) {
    case undefined:
      return target.published ? [200, target.configuration] : [404, NOT_FOUND];
    case 'pages':
      if (!target.published) return [404, NOT_FOUND];
      if (state.failPages) return [500, { kind: 'server', status: 500 }];
      if (state.malformedPages) {
        return [
          200,
          target.pages.map((page) => ({ ...page, sections: 'not-an-array' })),
        ];
      }
      return [200, target.pages];
    case 'identity':
      return [200, live.identity];
    case 'statistics':
      return [200, live.statistics];
    case 'categories':
      return [200, live.categories];
    case 'courses': {
      if (!id) return [200, paginate(live.courses, url.searchParams)];
      const course = live.courses.find((candidate) => candidate.id === id);
      if (!course) return [404, NOT_FOUND];
      if (!sub) return [200, course];
      if (sub === 'curriculum')
        return [200, id === 'fx-course-1' ? live.curriculum : []];
      const reviews = live.reviews.filter((review) => review.courseId === id);
      if (sub === 'reviews') return [200, paginate(reviews, url.searchParams)];
      if (sub === 'rating') {
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const review of reviews) distribution[review.rating] += 1;
        const total = reviews.length;
        return [
          200,
          {
            courseId: id,
            averageRating: total
              ? Math.round(
                  (reviews.reduce((s, r) => s + r.rating, 0) / total) * 10
                ) / 10
              : 0,
            totalReviews: total,
            distribution,
          },
        ];
      }
      if (sub === 'recommendations') {
        return [200, live.courses.filter((c) => c.id !== id).slice(0, 3)];
      }
      return [404, NOT_FOUND];
    }
    default:
      return [404, NOT_FOUND];
  }
}

const backend = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://backend');
  state.requests.push({
    path: url.pathname + url.search,
    headers: req.headers,
  });
  if (state.delayMs)
    await new Promise((done) => setTimeout(done, state.delayMs));
  const [status, body] = route(url);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
});

let apiOrigin;
let handler;

function makeHandler(overrides = {}) {
  return createSsrHandler({
    distDir: DIST,
    entryPath: ENTRY,
    apiOrigin,
    cacheTtlMs: 0,
    renderBudgetMs: 10_000,
    apiTimeoutMs: 5_000,
    ...overrides,
  });
}

function get(h, host, url = '/', extra = {}) {
  return h.handle({ method: 'GET', url, host, protocol: 'https', ...extra });
}

const CONSENT_BANNER = 'aria-label="Cookies and similar technologies"';

/** The server-rendered markup only — not the head, not the hydration data. */
function markupOf(html) {
  const start = html.indexOf('<div id="root">');
  const end = html.indexOf(
    '<script type="application/json" id="__atlas_ssr__">'
  );
  assert.ok(start > -1 && end > start, 'the page has server markup and data');
  return html.slice(start, end);
}

/** The page's hydration data. */
function payloadOf(html) {
  const raw = html.match(
    /<script type="application\/json" id="__atlas_ssr__">([^<]*)<\/script>/
  );
  assert.ok(raw, 'the page carries its hydration data');
  return JSON.parse(raw[1]);
}

before(async () => {
  assert.ok(
    existsSync(ENTRY) && existsSync(join(DIST, '.vite', 'manifest.json')),
    'build the production bundles first (see the header of this file)'
  );
  await new Promise((done) => backend.listen(0, '127.0.0.1', done));
  apiOrigin = `http://127.0.0.1:${backend.address().port}`;
  resetState();
  handler = await makeHandler();
});

after(() => {
  backend.closeAllConnections();
  backend.close();
});
beforeEach(() => resetState());

describe('server-rendered public pages', () => {
  it('renders Home with the Academy’s own content and palette', async () => {
    const result = await get(handler, ALPHA, '/');
    assert.equal(result.headers['X-Atlas-SSR'], 'render', result.reason);
    assert.match(result.body, /<html lang="en" dir="ltr">/);
    assert.match(markupOf(result.body), /Alpha learns faster/);
    assert.ok(markupOf(result.body).includes(ALPHA_PRIMARY));
    assert.match(
      result.body,
      /<link rel="canonical" href="https:\/\/alpha\.atlass\.dpdns\.org\/"/
    );
    assert.equal(result.headers['Cache-Control'], 'private, no-cache');
  });

  it('does not preload the router chunks unless asked (they would delay the first paint)', async () => {
    const manifest = JSON.parse(
      readFileSync(join(DIST, '.vite', 'manifest.json'), 'utf8')
    );
    const key = findPublicRouterChunk(manifest);
    assert.ok(key, 'the router chunk is in the manifest');
    const tag = `<link rel="modulepreload" crossorigin href="/${manifest[key].file}">`;
    const byDefault = await get(handler, ALPHA, '/');
    assert.equal(byDefault.headers['X-Atlas-SSR'], 'render');
    assert.ok(!byDefault.body.includes(tag));
    const preloading = await makeHandler({ preloadRouterChunks: true });
    assert.ok((await get(preloading, ALPHA, '/')).body.includes(tag));
  });

  it('preloads the Arabic font subsets on Arabic pages only, and only when asked', async () => {
    const fontPreload =
      /<link rel="preload" as="font" type="font\/woff2" crossorigin href="\/assets\/(rubik|readex-pro)-arabic-/g;
    assert.doesNotMatch((await get(handler, ALPHA, '/ar/')).body, fontPreload);
    const withFonts = await makeHandler({ preloadArabicFonts: true });
    assert.equal(
      (await get(withFonts, ALPHA, '/ar/')).body.match(fontPreload)?.length,
      2
    );
    assert.doesNotMatch((await get(withFonts, ALPHA, '/')).body, fontPreload);
  });

  it('renders Arabic pages right to left', async () => {
    const result = await get(handler, ALPHA, '/ar/');
    assert.equal(result.headers['X-Atlas-SSR'], 'render', result.reason);
    assert.match(result.body, /<html lang="ar" dir="rtl">/);
    assert.match(markupOf(result.body), /Alpha learns faster ع/);
    assert.equal(payloadOf(result.body).locale, 'ar');
  });

  for (const path of [
    '/courses',
    '/about',
    '/faqs',
    '/contact',
    '/ar/courses',
    '/ar/contact',
  ]) {
    it(`renders ${path}`, async () => {
      const result = await get(handler, ALPHA, path);
      assert.equal(result.headers['X-Atlas-SSR'], 'render', result.reason);
      const markup = markupOf(result.body);
      assert.match(markup, /data-theme-pack="modern-education"/);
      assert.doesNotMatch(markup, /data-testid="academy-coming-soon"/);
    });
  }

  it('renders Course Details with that Academy’s course', async () => {
    const result = await get(handler, ALPHA, '/courses/fx-course-1');
    assert.equal(result.headers['X-Atlas-SSR'], 'render', result.reason);
    assert.match(markupOf(result.body), /Alpha course fx-course-1/);
  });

  it('renders the 404 page for an unknown path', async () => {
    const result = await get(handler, ALPHA, '/no-such-page');
    assert.equal(result.headers['X-Atlas-SSR'], 'render', result.reason);
    assert.match(result.body, /name="robots" content="noindex/);
  });

  it('renders Coming Soon for an unpublished Academy, without its draft content', async () => {
    const result = await get(handler, GAMMA, '/');
    assert.equal(result.headers['X-Atlas-SSR'], 'render', result.reason);
    assert.match(result.body, /data-testid="academy-coming-soon"/);
    assert.doesNotMatch(result.body, /Gamma is not live yet/);
  });

  it('emits no Suspense boundary on a public page (hydrated in one pass)', async () => {
    for (const path of ['/', '/courses', '/courses/fx-course-1', '/ar/faqs']) {
      const result = await get(handler, ALPHA, path);
      assert.doesNotMatch(result.body, /<!--\$/, path);
    }
  });
});

describe('tenant isolation', () => {
  it('Academy A and Academy B never receive each other’s content, palette, identity or courses', async () => {
    for (const path of ['/', '/courses', '/contact', '/ar/']) {
      const a = await get(handler, ALPHA, path);
      const b = await get(handler, BETA, path);
      for (const [mine, theirs] of [
        [
          a.body,
          [
            /Beta builds careers/,
            /beta\.atlass/,
            /Beta Academy/,
            /Beta course/,
            /hello@beta/,
          ],
        ],
        [
          b.body,
          [
            /Alpha learns faster/,
            /alpha\.atlass/,
            /Alpha Academy/,
            /Alpha course/,
            /hello@alpha/,
          ],
        ],
      ]) {
        for (const pattern of theirs)
          assert.doesNotMatch(mine, pattern, `${path} ${pattern}`);
      }
      assert.ok(!a.body.includes(BETA_PRIMARY), path);
      assert.ok(!b.body.includes(ALPHA_PRIMARY), path);
    }
  });

  it('every backend call for a host names only the Academy that host resolved to', async () => {
    await get(handler, BETA, '/');
    await get(handler, BETA, '/courses/fx-course-1');
    const ids = state.requests
      .map((request) => request.path.match(/websites\/([0-9a-f-]{36})/)?.[1])
      .filter(Boolean);
    assert.ok(ids.length > 0);
    assert.deepEqual([...new Set(ids)], [BETA_ID]);
  });

  it('interleaved concurrent renders of two Academies stay separate', async () => {
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        get(handler, i % 2 ? BETA : ALPHA, i % 3 ? '/' : '/courses').then(
          (r) => [i, r]
        )
      )
    );
    for (const [i, result] of results) {
      const [mine, theirs] =
        i % 2
          ? [/beta\.atlass/, /alpha\.atlass/]
          : [/alpha\.atlass/, /beta\.atlass/];
      assert.equal(result.headers['X-Atlas-SSR'], 'render', result.reason);
      assert.match(result.body, mine);
      assert.doesNotMatch(result.body, theirs);
    }
  });

  it('the page cache never serves one Academy’s HTML to another for the same path', async () => {
    const cached = await makeHandler({ cacheTtlMs: 60_000 });
    const a1 = await get(cached, ALPHA, '/courses');
    const b1 = await get(cached, BETA, '/courses');
    const a2 = await get(cached, ALPHA, '/courses');
    const b2 = await get(cached, BETA, '/courses');
    assert.deepEqual(
      [a1, b1, a2, b2].map((r) => r.headers['X-Atlas-SSR']),
      ['render', 'render', 'hit', 'hit']
    );
    assert.match(a2.body, /alpha\.atlass/);
    assert.doesNotMatch(a2.body, /beta\.atlass/);
    assert.match(b2.body, /beta\.atlass/);
    assert.doesNotMatch(b2.body, /alpha\.atlass/);
  });

  it('the cache separates locales and query strings', async () => {
    const cached = await makeHandler({ cacheTtlMs: 60_000 });
    await get(cached, ALPHA, '/courses');
    const ar = await get(cached, ALPHA, '/ar/courses');
    const query = await get(cached, ALPHA, '/courses?level=beginner');
    assert.equal(ar.headers['X-Atlas-SSR'], 'render');
    assert.equal(query.headers['X-Atlas-SSR'], 'render');
    assert.match(ar.body, /<html lang="ar" dir="rtl">/);
  });

  it('a Host header with a port or another protocol cannot poison the cached page', async () => {
    const cached = await makeHandler({ cacheTtlMs: 60_000 });
    const poisoned = await get(cached, `${ALPHA}:6666`, '/');
    assert.match(poisoned.body, /alpha\.atlass\.dpdns\.org:6666/);
    const overHttp = await cached.handle({
      method: 'GET',
      url: '/',
      host: ALPHA,
      protocol: 'http',
    });
    assert.match(overHttp.body, /http:\/\/alpha\.atlass/);
    const visitor = await get(cached, ALPHA, '/');
    assert.equal(visitor.headers['X-Atlas-SSR'], 'render');
    assert.doesNotMatch(visitor.body, /:6666|http:\/\/alpha/);
  });

  it('a host that resolves to nothing is never rendered, even with a warm cache', async () => {
    const cached = await makeHandler({ cacheTtlMs: 60_000 });
    await get(cached, ALPHA, '/');
    const unknown = await get(cached, `nobody.${BASE}`, '/');
    assert.equal(unknown.headers['X-Atlas-SSR'], 'pass');
    assert.doesNotMatch(unknown.body, /Alpha learns faster/);
  });

  it('a Host header carrying another host or a path resolves nothing', async () => {
    for (const host of [
      `evil.example/${ALPHA}`,
      `${ALPHA}.evil.example`,
      `${ALPHA}@evil.example`,
    ]) {
      const result = await get(handler, host, '/');
      assert.equal(result.headers['X-Atlas-SSR'], 'pass', host);
      assert.doesNotMatch(result.body, /Alpha learns faster/, host);
    }
  });
});

describe('caching and publishing', () => {
  it('a publish (configVersion bump) is served at once, whatever the cache lifetime', async () => {
    const cached = await makeHandler({ cacheTtlMs: 60_000 });
    await get(cached, ALPHA, '/');
    const target = state.academies[ALPHA_ID];
    target.pages = withHeroTitle(target.pages, 'Republished title');
    target.configuration = {
      ...target.configuration,
      configVersion: target.configuration.configVersion + 1,
    };
    const next = await get(cached, ALPHA, '/');
    assert.equal(next.headers['X-Atlas-SSR'], 'render');
    assert.match(markupOf(next.body), /Republished title/);
  });

  it('unpublishing is served at once', async () => {
    const cached = await makeHandler({ cacheTtlMs: 60_000 });
    await get(cached, ALPHA, '/');
    state.academies[ALPHA_ID].published = false;
    const next = await get(cached, ALPHA, '/');
    assert.match(next.body, /data-testid="academy-coming-soon"/);
    assert.doesNotMatch(next.body, /Alpha learns faster/);
  });

  it('an entry expires after its lifetime', async () => {
    const cached = await makeHandler({ cacheTtlMs: 150 });
    await get(cached, ALPHA, '/');
    assert.equal((await get(cached, ALPHA, '/')).headers['X-Atlas-SSR'], 'hit');
    await new Promise((done) => setTimeout(done, 200));
    assert.equal(
      (await get(cached, ALPHA, '/')).headers['X-Atlas-SSR'],
      'render'
    );
  });

  it('the consent decision is part of the key (banner vs no banner)', async () => {
    const cached = await makeHandler({ cacheTtlMs: 60_000 });
    const undecided = await get(cached, ALPHA, '/');
    const decided = await get(cached, ALPHA, '/', {
      cookieHeader: 'atlas_consent=1',
    });
    assert.equal(decided.headers['X-Atlas-SSR'], 'render');
    assert.ok(undecided.body.includes(CONSENT_BANNER));
    assert.ok(!decided.body.includes(CONSENT_BANNER));
  });

  it('leaves no timer behind after a request (no per-request cache outlives it)', async () => {
    const timers = () =>
      process.getActiveResourcesInfo().filter((kind) => kind === 'Timeout')
        .length;
    await get(handler, ALPHA, '/');
    const before = timers();
    for (const path of [
      '/',
      '/courses',
      '/courses/fx-course-1',
      '/ar/about',
      '/faqs',
    ]) {
      await get(handler, ALPHA, path);
      await get(handler, GAMMA, path);
    }
    assert.ok(timers() <= before, `timers grew from ${before} to ${timers()}`);
  });

  it('RenderCache expires entries and evicts the least recently used', () => {
    let now = 0;
    const cache = new RenderCache({
      ttlMs: 100,
      maxEntries: 2,
      now: () => now,
    });
    cache.set('a', 'A');
    cache.set('b', 'B');
    cache.get('a');
    cache.set('c', 'C');
    assert.equal(cache.get('b'), undefined);
    assert.equal(cache.get('a'), 'A');
    now = 200;
    assert.equal(cache.get('a'), undefined);
    const disabled = new RenderCache({ ttlMs: 0, maxEntries: 5 });
    disabled.set('a', 'A');
    assert.equal(disabled.size, 0);
  });
});

/** A legacy inline image (`data:image/png;base64,…`) of about `bytes` bytes. */
function inlineImage(bytes) {
  return `data:image/png;base64,iVBORw0KGgo${'A'.repeat(Math.max(0, bytes - 33))}`;
}

const occurrences = (haystack, needle) => haystack.split(needle).length - 1;

function withHomeHeroImage(pages, image) {
  return pages.map((page) =>
    page.coreType === 'home'
      ? {
          ...page,
          sections: page.sections.map((section) =>
            section.type === 'hero'
              ? { ...section, config: { ...section.config, image } }
              : section
          ),
        }
      : page
  );
}

describe('size budget (inline images)', () => {
  const PAGES = [
    '/',
    '/courses',
    '/courses/fx-course-1',
    '/about',
    '/faqs',
    '/contact',
  ];

  it('the budget leaves at least 2.5× headroom over every real page', async () => {
    let largest = 0;
    for (const path of PAGES) {
      for (const locale of ['', '/ar']) {
        const url = locale ? `${locale}${path === '/' ? '/' : path}` : path;
        const result = await get(handler, ALPHA, url);
        assert.equal(result.headers['X-Atlas-SSR'], 'render', url);
        largest = Math.max(largest, Buffer.byteLength(result.body));
      }
    }
    assert.ok(
      largest * 2.5 <= DEFAULT_MAX_HTML_BYTES,
      `largest page ${largest} B leaves less than 2.5x headroom under ${DEFAULT_MAX_HTML_BYTES} B`
    );
  });

  it('a page carries an inline logo four times and an inline section image twice', async () => {
    const big = await makeHandler({ maxHtmlBytes: Infinity });
    const logo = inlineImage(20_000);
    state.academies[ALPHA_ID].resolve.academyLogo = logo;
    const withLogo = await get(big, ALPHA, '/');
    assert.equal(withLogo.headers['X-Atlas-SSR'], 'render');
    assert.equal(
      occurrences(withLogo.body, logo),
      4,
      'JSON-LD, header, footer and hydration data'
    );

    resetState();
    const image = inlineImage(20_000);
    state.academies[ALPHA_ID].pages = withHomeHeroImage(
      state.academies[ALPHA_ID].pages,
      image
    );
    const withImage = await get(big, ALPHA, '/');
    assert.equal(withImage.headers['X-Atlas-SSR'], 'render');
    assert.equal(
      occurrences(withImage.body, image),
      2,
      'the section and hydration data'
    );
  });

  it('still renders an Academy whose inline logo is just under 100 KB (production’s active Academies)', async () => {
    state.academies[ALPHA_ID].resolve.academyLogo = inlineImage(100 * 1024 - 1);
    for (const url of [
      '/',
      '/ar/',
      '/courses/fx-course-1',
      '/ar/courses/fx-course-1',
    ]) {
      const result = await get(handler, ALPHA, url);
      assert.equal(result.headers['X-Atlas-SSR'], 'render', url);
      assert.ok(Buffer.byteLength(result.body) <= DEFAULT_MAX_HTML_BYTES, url);
    }
  });

  // Two layers, both failing closed: an API response over the budget stops
  // the render before anything is rendered (the page embeds the data, so it
  // would be over budget too); a page that only crosses the budget once
  // rendered (an inline image repeated) passes on its final size.
  for (const [label, reason, mutate] of [
    [
      'a 1 MB inline logo',
      'api response over budget',
      () => {
        state.academies[ALPHA_ID].resolve.academyLogo = inlineImage(
          1024 * 1024
        );
      },
    ],
    [
      'production’s largest inline logo (3.4 MB)',
      'api response over budget',
      () => {
        state.academies[ALPHA_ID].resolve.academyLogo = inlineImage(3_473_306);
      },
    ],
    [
      'production’s 1.9 MB inline section image',
      'api response over budget',
      () => {
        state.academies[ALPHA_ID].pages = withHomeHeroImage(
          state.academies[ALPHA_ID].pages,
          inlineImage(1_938_534)
        );
      },
    ],
    [
      'a 300 KB inline logo (no response over budget, the page is: 4 copies)',
      'html over budget',
      () => {
        state.academies[ALPHA_ID].resolve.academyLogo = inlineImage(300 * 1024);
      },
    ],
  ]) {
    it(`fails closed to the single-page app for ${label}, and caches nothing`, async () => {
      const cached = await makeHandler({ cacheTtlMs: 30_000 });
      mutate();
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const result = await get(cached, ALPHA, '/');
        assert.equal(result.headers['X-Atlas-SSR'], 'pass');
        assert.equal(result.reason, reason);
        assert.equal(
          result.body,
          cached.template,
          'the unchanged single-page app shell'
        );
      }
      assert.equal(cached.cache.size, 0);
      assert.equal(cached.cache.bytes, 0);
      // The same handler keeps rendering other Academies normally.
      const other = await get(cached, BETA, '/');
      assert.equal(other.headers['X-Atlas-SSR'], 'render');
    });
  }

  it('stops downloading an over-budget API response instead of reading it whole', async () => {
    const small = await makeHandler({ maxHtmlBytes: 64 * 1024 });
    state.academies[ALPHA_ID].resolve.academyLogo = inlineImage(128 * 1024);
    const result = await get(small, ALPHA, '/');
    assert.equal(result.reason, 'api response over budget');
    // Nothing past the resolve call was requested: the render stopped there.
    assert.deepEqual(
      state.requests.map((r) => r.path.replace(/\?.*$/, '')),
      ['/api/v1/public/websites/resolve']
    );
  });

  it('passes exactly when a page is one byte over the budget', async () => {
    const size = Buffer.byteLength((await get(handler, ALPHA, '/')).body);
    const atBudget = await makeHandler({ maxHtmlBytes: size });
    assert.equal(
      (await get(atBudget, ALPHA, '/')).headers['X-Atlas-SSR'],
      'render'
    );
    const underBudget = await makeHandler({ maxHtmlBytes: size - 1 });
    const result = await get(underBudget, ALPHA, '/');
    assert.equal(result.headers['X-Atlas-SSR'], 'pass');
    assert.equal(result.reason, 'html over budget');
  });

  it('counts UTF-8 bytes, not characters (Arabic pages)', async () => {
    const result = await get(handler, ALPHA, '/ar/');
    const bytes = Buffer.byteLength(result.body);
    assert.ok(
      bytes > result.body.length,
      'the Arabic page has multi-byte characters'
    );
    const tight = await makeHandler({ maxHtmlBytes: result.body.length });
    assert.equal((await get(tight, ALPHA, '/ar/')).reason, 'html over budget');
  });

  it('RenderCache is bounded by memory and never stores an over-budget page', () => {
    // Counted at two bytes per character (worst-case V8 heap): 'aaaa' = 8.
    const cache = new RenderCache({
      ttlMs: 1_000,
      maxEntries: 10,
      maxBytes: 20,
      maxEntryBytes: 6,
    });
    cache.set('a', 'aaaa');
    cache.set('b', 'bbbb');
    assert.equal(cache.bytes, 16);
    cache.get('a'); // a is now the most recent
    cache.set('c', 'cccc'); // 24 > 20: evicts b, the least recent
    assert.equal(cache.get('b'), undefined);
    assert.equal(cache.get('a'), 'aaaa');
    assert.equal(cache.bytes, 16);
    cache.set('big', 'xxxxxxx'); // 7 UTF-8 bytes > maxEntryBytes
    assert.equal(cache.get('big'), undefined);
    cache.set('a', 'aa'); // replacing an entry re-counts it
    assert.equal(cache.bytes, 4 + 8);
    cache.set('ar', 'ععع'); // 6 UTF-8 bytes (in budget), 6 bytes of heap
    assert.equal(cache.get('ar'), 'ععع');
    assert.equal(cache.bytes, 4 + 8 + 6);
  });
});

describe('what is and is not server-rendered', () => {
  for (const host of [BASE, `www.${BASE}`, 'localhost', '127.0.0.1']) {
    it(`passes the non-Academy host ${host}`, async () => {
      assert.equal(
        (await get(handler, host, '/')).headers['X-Atlas-SSR'],
        'pass'
      );
    });
  }

  for (const path of [
    '/sign-in',
    '/ar/sign-up',
    '/forgot-password',
    '/reset-password?token=x',
    '/auth/google/return',
    '/verify-email',
    '/verify/ABC123',
    '/my',
    '/ar/my/courses/1/learn/2',
    '/my-learning',
    '/robots.txt',
    '/sitemap.xml',
    '/assets/missing.js',
    '/?__atlas_probe=1',
  ]) {
    it(`passes ${path} (the unchanged single-page app)`, async () => {
      const result = await get(handler, ALPHA, path);
      assert.equal(result.headers['X-Atlas-SSR'], 'pass');
      assert.match(result.body, /<div id="root"><\/div>/);
      assert.doesNotMatch(result.body, /__atlas_ssr__/);
    });
  }

  it('passes any method but GET and HEAD', async () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
      const result = await handler.handle({
        method,
        url: '/',
        host: ALPHA,
        protocol: 'https',
      });
      assert.equal(result.headers['X-Atlas-SSR'], 'pass', method);
    }
  });
});

describe('failures fall back to the single-page app', () => {
  it('passes when a public API call fails, and caches nothing', async () => {
    const cached = await makeHandler({ cacheTtlMs: 60_000 });
    state.failPages = true;
    assert.equal(
      (await get(cached, ALPHA, '/')).headers['X-Atlas-SSR'],
      'pass'
    );
    assert.equal(cached.cache.size, 0);
  });

  it('passes when the data cannot be rendered (renderer failure)', async () => {
    state.malformedPages = true;
    const result = await get(handler, ALPHA, '/');
    assert.equal(result.headers['X-Atlas-SSR'], 'pass');
    assert.match(result.body, /<div id="root"><\/div>/);
  });

  it('passes when the backend is slower than the budget', async () => {
    const slow = await makeHandler({ renderBudgetMs: 300 });
    state.delayMs = 1_000;
    assert.equal((await get(slow, ALPHA, '/')).headers['X-Atlas-SSR'], 'pass');
    // The abandoned render finishes in the background (bounded by the API
    // timeout per call); let it, so it does not outlive the suite.
    state.delayMs = 0;
    await new Promise((done) => setTimeout(done, 1_500));
  });

  it('passes when the backend is unreachable', async () => {
    const down = await makeHandler({ apiOrigin: 'http://127.0.0.1:9' });
    assert.equal((await get(down, ALPHA, '/')).headers['X-Atlas-SSR'], 'pass');
  });
});

describe('security', () => {
  it('forwards only the visitor IP and never a cookie or credential', async () => {
    await get(handler, ALPHA, '/', {
      cookieHeader: 'refresh_token=secret; atlas_consent=1',
      clientIp: '203.0.113.9',
    });
    assert.ok(state.requests.length > 0);
    for (const request of state.requests) {
      assert.equal(request.headers.cookie, undefined);
      assert.equal(request.headers.authorization, undefined);
      assert.equal(request.headers['x-real-ip'], '203.0.113.9');
    }
  });

  it('renders a visitor with a session cookie exactly as an anonymous one', async () => {
    const strip = (html) =>
      html.replace(/"(dehydratedAt|dataUpdatedAt|errorUpdatedAt)":\d+/g, '');
    const anonymous = await get(handler, ALPHA, '/', {
      cookieHeader: 'atlas_consent=1',
    });
    const withSession = await get(handler, ALPHA, '/', {
      cookieHeader: 'refresh_token=secret; atlas_session=1; atlas_consent=1',
    });
    assert.equal(strip(withSession.body), strip(anonymous.body));
    assert.doesNotMatch(withSession.body, /secret/);
  });

  it('calls only the public website API', async () => {
    for (const path of [
      '/',
      '/courses',
      '/courses/fx-course-1',
      '/about',
      '/faqs',
      '/contact',
    ]) {
      await get(handler, ALPHA, path);
    }
    for (const request of state.requests) {
      assert.match(
        request.path,
        /^\/api\/v1\/public\/websites\//,
        request.path
      );
    }
  });

  it('owner-authored text cannot break out of the markup, the head or the data', async () => {
    const attack =
      '</script><script>alert(1)</script><img src=x onerror=alert(2)>\u2028';
    const target = state.academies[ALPHA_ID];
    target.pages = withHeroTitle(target.pages, attack).map((page) =>
      page.coreType === 'home'
        ? {
            ...page,
            seo: {
              ...page.seo,
              title: { en: attack, ar: attack },
              description: { en: attack, ar: attack },
            },
          }
        : page
    );
    const result = await get(handler, ALPHA, '/');
    assert.equal(result.headers['X-Atlas-SSR'], 'render', result.reason);
    assert.doesNotMatch(result.body, /<script>alert/);
    assert.doesNotMatch(result.body, /<img src=x/);
    // A raw line terminator only matters inside a script context (the
    // hydration data and JSON-LD); as escaped text in the markup it is inert.
    for (const [, body] of result.body.matchAll(
      /<script[^>]*>([^]*?)<\/script>/g
    )) {
      assert.ok(!body.includes('\u2028'), 'no raw U+2028 inside a script');
    }
    assert.match(
      markupOf(result.body),
      /&lt;\/script&gt;&lt;script&gt;alert\(1\)/
    );
    for (const [, attrs] of result.body.matchAll(/<script([^>]*)>/g)) {
      assert.match(
        attrs,
        /type="module"|type="application\/json"|type="application\/ld\+json"/,
        `unexpected script: ${attrs}`
      );
    }
    // The data still round-trips to the original text.
    assert.ok(JSON.stringify(payloadOf(result.body)).includes('alert(1)'));
  });

  it('the page data holds only public website queries, and no credential', async () => {
    const result = await get(handler, ALPHA, '/courses/fx-course-1');
    const payload = payloadOf(result.body);
    assert.ok(payload.queries.queries.length > 0);
    for (const query of payload.queries.queries) {
      assert.equal(query.queryKey[0], 'public-website');
    }
    assert.doesNotMatch(
      JSON.stringify(payload),
      /password|token|secret|refresh/i
    );
  });
});
