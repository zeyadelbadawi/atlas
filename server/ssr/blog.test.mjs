/**
 * B3 — the marketing blog renderer (server/ssr/blog.mjs) against the
 * PRODUCTION marketing bundle and a mock backend: pages for the apex host
 * only, cache headers and the `atlas-blog` tag, the branded 404, the 503
 * when the API fails or is slow, redirects, the sitemap, the in-process
 * cache, and nothing but the public blog endpoints is ever called.
 *
 *   MARKETING_PLANS_ALLOW_SNAPSHOT=1 pnpm build   (writes dist-marketing-ssr/)
 *   pnpm test:ssr
 */
import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLOG_CACHE_TAG, createBlogHandler, normalizeHost } from './blog.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ENTRY = join(ROOT, 'dist-marketing-ssr', 'entry.js');
const CONTEXT = join(ROOT, 'dist-marketing-ssr', 'blog-context.json');
const HOST = 'atlass.dpdns.org';

const summary = (slug, extra = {}) => ({
  slug,
  kind: 'article',
  topic: 'payments',
  featured: false,
  publishAt: '2026-10-20T09:00:00.000Z',
  updatedAt: '2026-10-21T09:00:00.000Z',
  coverImage: null,
  coverAlt: '',
  title: `Post ${slug}`,
  excerpt: 'An excerpt long enough for a card on the blog.',
  readingMinutes: 4,
  authorName: 'Atlas team',
  ...extra,
});

let mode = 'ok';
const calls = [];
const backend = createServer((req, res) => {
  calls.push({ url: req.url, headers: req.headers });
  if (mode === 'fail') {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end('{}');
    return;
  }
  if (mode === 'slow') return; // never answers: the renderer times out
  const url = new URL(req.url, 'http://backend');
  const json = (status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (url.pathname === '/api/v1/public/blog/posts') {
    const locale = url.searchParams.get('locale');
    return json(200, {
      items: [summary(`first-${locale}`), summary('second')],
      pagination: { page: Number(url.searchParams.get('page')), pageSize: 12, totalItems: 2, totalPages: 1 },
    });
  }
  if (url.pathname === '/api/v1/public/blog/posts/known-post') {
    return json(200, {
      ...summary('known-post', { title: 'A known post' }),
      body: '## Hello\n\nWorld.',
      seoTitle: null,
      seoDescription: null,
      related: [],
      alternateLocaleAvailable: true,
      locale: url.searchParams.get('locale'),
    });
  }
  if (url.pathname === '/api/v1/public/blog/sitemap') {
    return json(200, { items: [{ slug: 'known-post', updatedAt: '2026-10-21T09:00:00.000Z', locales: ['en', 'ar'] }] });
  }
  return json(404, { error: { messageKey: 'errors.notFound' } });
});

let handler;
let apiOrigin;
const skip = !existsSync(ENTRY) || !existsSync(CONTEXT);

before(async () => {
  if (skip) return;
  await new Promise((done) => backend.listen(0, '127.0.0.1', done));
  apiOrigin = `http://127.0.0.1:${backend.address().port}`;
  handler = await createBlogHandler({
    entryPath: ENTRY,
    contextPath: CONTEXT,
    apiOrigin,
    marketingHost: HOST,
    apiTimeoutMs: 300,
    cacheTtlMs: 0,
  });
});
after(() => backend.close());
beforeEach(() => {
  mode = 'ok';
  calls.length = 0;
});

const get = (url, host = HOST, method = 'GET') => handler.handleBlog({ method, url, host });

describe('marketing blog renderer', { skip: skip && 'run `pnpm build` first (dist-marketing-ssr/)' }, () => {
  it('renders /blog with the marketing chrome, cache headers and the purge tag', async () => {
    const res = await get('/blog');
    assert.equal(res.status, 200);
    assert.equal(res.headers['Cache-Control'], 'public, max-age=60, s-maxage=300');
    assert.equal(res.headers['Cache-Tag'], BLOG_CACHE_TAG);
    assert.match(res.headers['Content-Type'], /text\/html/);
    assert.match(res.body, /<html lang="en" dir="ltr">/);
    assert.match(res.body, /data-header/);
    assert.match(res.body, /href="\/blog\/first-en"/);
    assert.match(res.body, /<link rel="canonical" href="https:\/\/[^"]+\/blog">/);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /^\/api\/v1\/public\/blog\/posts\?locale=en&page=1&pageSize=12$/);
  });

  it('renders Arabic pages right to left from the Arabic data', async () => {
    const res = await get('/ar/blog/topics/payments');
    assert.equal(res.status, 200);
    assert.match(res.body, /<html lang="ar" dir="rtl">/);
    assert.match(res.body, /href="\/ar\/blog\/first-ar"/);
    assert.match(calls[0].url, /topic=payments/);
  });

  it('renders a post, and the branded 404 for an unknown one (same tag, so publishing purges it)', async () => {
    const ok = await get('/blog/known-post');
    assert.equal(ok.status, 200);
    assert.match(ok.body, /"@type":"BlogPosting"/);
    assert.match(ok.body, /<h2 id="hello"/);
    const missing = await get('/blog/not-a-post');
    assert.equal(missing.status, 404);
    assert.equal(missing.headers['Cache-Tag'], BLOG_CACHE_TAG);
    assert.match(missing.body, /noindex/);
    const bad = await get('/blog/topics/cats');
    assert.equal(bad.status, 404);
  });

  it('answers 503 with the branded page, uncached, when the API fails or times out — never the app', async () => {
    for (const failure of ['fail', 'slow']) {
      mode = failure;
      const res = await get('/ar/blog');
      assert.equal(res.status, 503, failure);
      assert.equal(res.headers['Cache-Control'], 'no-store');
      assert.equal(res.headers['Retry-After'], '60');
      assert.match(res.body, /<html lang="ar" dir="rtl">/);
      assert.doesNotMatch(res.body, /id="root"/);
    }
  });

  it('redirects a trailing slash and page 1, keeping the query', async () => {
    const res = await get('/blog/?utm_source=x');
    assert.equal(res.status, 301);
    assert.equal(res.headers.Location, '/blog?utm_source=x');
    assert.equal((await get('/ar/blog/page/1')).headers.Location, '/ar/blog');
  });

  it('serves /sitemaps/blog.xml', async () => {
    const res = await get('/sitemaps/blog.xml');
    assert.equal(res.status, 200);
    assert.match(res.headers['Content-Type'], /application\/xml/);
    assert.match(res.body, /<loc>https:\/\/[^<]+\/ar\/blog\/known-post<\/loc>/);
  });

  it('claims nothing on another host (academy websites have their own /blog)', async () => {
    assert.equal(await get('/blog', 'academy.atlass.dpdns.org'), null);
    assert.equal(await get('/blog', 'customer.com'), null);
    assert.equal(await get('/pricing'), null);
    assert.equal(calls.length, 0);
    assert.equal(normalizeHost('ATLASS.dpdns.org:443'), HOST);
  });

  it('refuses other methods and never forwards cookies or credentials', async () => {
    assert.equal((await get('/blog', HOST, 'POST')).status, 405);
    await handler.handleBlog({ method: 'GET', url: '/blog', host: HOST, cookieHeader: 'session=secret' });
    for (const call of calls) {
      assert.equal(call.headers.cookie, undefined);
      assert.equal(call.headers.authorization, undefined);
      assert.match(call.url, /^\/api\/v1\/public\/blog\//);
    }
  });

  it('caches rendered pages in process', async () => {
    const cached = await createBlogHandler({ entryPath: ENTRY, contextPath: CONTEXT, apiOrigin, marketingHost: HOST, cacheTtlMs: 60_000 });
    await cached.handleBlog({ method: 'GET', url: '/blog', host: HOST });
    const second = await cached.handleBlog({ method: 'GET', url: '/blog', host: HOST });
    assert.equal(second.headers['X-Atlas-SSR'], 'blog-hit');
    assert.equal(second.headers['Cache-Tag'], BLOG_CACHE_TAG);
    assert.equal(calls.length, 1);
  });
});
