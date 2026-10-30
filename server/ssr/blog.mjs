/**
 * B3 — the Atlas blog on the marketing apex, rendered at request time by
 * this container (not prerendered), so a post published from the Platform
 * Owner dashboard is live without a deploy.
 *
 * Caddy sends the apex's `/blog`, `/blog/*`, `/ar/blog`, `/ar/blog/*` and
 * `/sitemaps/blog.xml` here (academy hosts never: the host must equal the
 * marketing host). The pages are built by the marketing prerender bundle
 * (`dist-marketing-ssr/entry.js`, the same React components, header,
 * footer, stylesheet and client script as the static pages) with the build
 * context the prerender wrote next to it (`blog-context.json`). Data comes
 * from the backend's public blog endpoints only (no cookie, no credential).
 *
 *   200  the page; `Cache-Control: public, max-age=60, s-maxage=300` and
 *        `Cache-Tag: atlas-blog` (the backend purges that tag on every
 *        publish, unpublish, archive, delete or edit of a public post)
 *   301  trailing slash, `/blog/page/1`
 *   404  unknown slug / topic / page: the branded marketing 404 (same tag,
 *        so publishing a post purges a cached 404 at its address)
 *   503  the API failed or timed out: a short branded "temporarily
 *        unavailable" page, never cached, never the single-page app
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { RenderCache } from './handler.mjs';

export const BLOG_CACHE_TAG = 'atlas-blog';
export const BLOG_CACHE_CONTROL = 'public, max-age=60, s-maxage=300';

const HTML = 'text/html; charset=utf-8';
const XML = 'application/xml; charset=utf-8';

class ApiFailure extends Error {}

/** `atlass.dpdns.org:443` → `atlass.dpdns.org`. */
export function normalizeHost(host) {
  return String(host ?? '')
    .toLowerCase()
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
}

/**
 * @param {object} options
 * @param {string} options.entryPath   dist-marketing-ssr/entry.js
 * @param {string} options.contextPath dist-marketing-ssr/blog-context.json
 * @param {string} options.apiOrigin   e.g. http://backend:3000
 * @param {string} [options.marketingHost] defaults to the build's site URL host
 * @param {number} [options.apiTimeoutMs]
 * @param {number} [options.cacheTtlMs] in-process page cache (0 disables)
 * @param {number} [options.cacheMaxEntries]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {(event: object) => void} [options.log]
 */
export async function createBlogHandler({
  entryPath,
  contextPath,
  apiOrigin,
  marketingHost,
  apiTimeoutMs = 2_000,
  cacheTtlMs = 30_000,
  cacheMaxEntries = 300,
  fetchImpl = globalThis.fetch,
  log = () => {},
}) {
  const entry = await import(pathToFileURL(entryPath).href);
  const context = JSON.parse(readFileSync(contextPath, 'utf8'));
  const ctx = {
    plans: context.plans,
    siteUrl: context.siteUrl,
    buildDate: context.buildDate,
  };
  const assets = context.assets;
  const host = normalizeHost(marketingHost || new URL(context.siteUrl).host);
  const cache = new RenderCache({ ttlMs: cacheTtlMs, maxEntries: cacheMaxEntries });

  async function api(path, params) {
    const url = new URL(`/api/v1/public/blog/${path}`, apiOrigin);
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), apiTimeoutMs);
    try {
      const response = await fetchImpl(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        redirect: 'error',
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new ApiFailure(`api ${response.status}`);
      return await response.json();
    } catch (error) {
      if (error instanceof ApiFailure) throw error;
      throw new ApiFailure(String(error?.message ?? error));
    } finally {
      clearTimeout(timer);
    }
  }

  const page = (status, body, extra = {}) => ({
    status,
    headers: {
      'Content-Type': HTML,
      'Cache-Control': BLOG_CACHE_CONTROL,
      'Cache-Tag': BLOG_CACHE_TAG,
      'X-Atlas-SSR': 'blog',
      ...extra,
    },
    body,
  });

  async function render(route) {
    if (route.kind === 'sitemap') {
      const data = await api('sitemap');
      const items = Array.isArray(data?.items) ? data.items : [];
      return {
        status: 200,
        headers: {
          'Content-Type': XML,
          'Cache-Control': BLOG_CACHE_CONTROL,
          'Cache-Tag': BLOG_CACHE_TAG,
          'X-Atlas-SSR': 'blog',
        },
        body: entry.buildBlogSitemap({ siteUrl: ctx.siteUrl, items }),
      };
    }
    if (route.kind === 'notFound') {
      return page(404, entry.renderBlogNotFound({ lang: route.lang, ctx, assets }));
    }
    if (route.kind === 'list') {
      const data = await api('posts', {
        locale: route.lang,
        page: route.page,
        pageSize: entry.BLOG_PAGE_SIZE,
        topic: route.topic ?? undefined,
      });
      const items = Array.isArray(data?.items) ? data.items : [];
      const pagination = data?.pagination ?? {};
      const result = {
        items,
        pagination: {
          page: route.page,
          totalItems: Number(pagination.totalItems ?? data?.total ?? items.length) || 0,
          totalPages: Math.max(1, Number(pagination.totalPages) || 1),
        },
      };
      const out = entry.renderBlogIndex({ lang: route.lang, page: route.page, topic: route.topic, result, ctx, assets });
      return page(out.status, out.html);
    }
    // A post.
    const post = await api(`posts/${encodeURIComponent(route.slug)}`, { locale: route.lang });
    if (!post || typeof post.body !== 'string' || post.slug !== route.slug) {
      return page(404, entry.renderBlogNotFound({ lang: route.lang, ctx, assets }));
    }
    return page(200, entry.renderBlogPost({ lang: route.lang, post, ctx, assets }));
  }

  /**
   * @param {{ method: string, url: string, host: string }} request
   * @returns {Promise<null | { status: number, headers: Record<string,string>, body: string }>}
   *   null when the request is not a blog page of the marketing host
   */
  async function handleBlog(request) {
    if (normalizeHost(request.host) !== host) return null;
    const url = new URL(request.url, 'http://renderer.invalid');
    const route = entry.blogRoute(url.pathname, url.search);
    if (!route) return null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return { status: 405, headers: { Allow: 'GET, HEAD', 'Content-Type': 'text/plain' }, body: 'method not allowed' };
    }
    if (route.kind === 'redirect') {
      // Same-origin path only (the route builds it from the path itself).
      const location = /^\/(?![/\\])/.test(route.location) ? route.location : '/blog';
      return {
        status: 301,
        headers: { Location: location, 'Cache-Control': BLOG_CACHE_CONTROL, 'Cache-Tag': BLOG_CACHE_TAG, 'X-Atlas-SSR': 'blog' },
        body: '',
      };
    }
    const key = url.pathname;
    const cached = cache.get(key);
    if (cached) {
      const hit = JSON.parse(cached);
      return { ...hit, headers: { ...hit.headers, 'X-Atlas-SSR': 'blog-hit' } };
    }
    const started = Date.now();
    try {
      const result = await render(route);
      cache.set(key, JSON.stringify(result));
      log({ event: 'blog', status: result.status, ms: Date.now() - started });
      return result;
    } catch (error) {
      log({ event: 'blog-unavailable', message: String(error?.message ?? error), ms: Date.now() - started });
      const lang = route.lang ?? 'en';
      if (route.kind === 'sitemap') {
        return { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '60' }, body: 'temporarily unavailable' };
      }
      return {
        status: 503,
        headers: {
          'Content-Type': HTML,
          'Cache-Control': 'no-store',
          'Retry-After': '60',
          'X-Robots-Tag': 'noindex',
          'X-Atlas-SSR': 'blog-unavailable',
        },
        body: entry.renderBlogUnavailable({ lang, ctx, assets }),
      };
    }
  }

  return { handleBlog, cache, host };
}
