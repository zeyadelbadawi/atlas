/**
 * B3 — the server-rendered blog pages (pure renderer): routes, the marketing
 * chrome, SEO head (title, description, canonical, hreflang, OG/Twitter,
 * JSON-LD), RTL, pagination, the branded 404 / 503, and the blog sitemap.
 */
import { describe, expect, it } from 'vitest';
import type { Plan } from '@/types/plan.types';
import snapshot from '../data/plans.snapshot.json';
import type { MarketingAssets } from '../prerender/document';
import type { MarketingRenderContext } from '../types';
import {
  blogRoute,
  buildBlogSitemap,
  renderBlogIndex,
  renderBlogNotFound,
  renderBlogPost,
  renderBlogUnavailable,
  type BlogPostDetail,
  type BlogSummary,
} from './site';

const ctx: MarketingRenderContext = {
  plans: snapshot as unknown as Plan[],
  siteUrl: 'https://atlass.dpdns.org',
  buildDate: '2026-10-26',
};
const assets: MarketingAssets = {
  stylesheets: ['/assets/marketing-abc.css'],
  moduleScripts: ['/assets/marketing-abc.js'],
  modulePreloads: [],
  themeScript: '/assets/theme-abc.js',
  fontPreloads: { en: [], ar: [] },
};

const summary = (overrides: Partial<BlogSummary> = {}): BlogSummary => ({
  slug: 'protect-recorded-lessons',
  kind: 'pillar',
  topic: 'protection',
  featured: true,
  publishAt: '2026-10-20T09:00:00.000Z',
  updatedAt: '2026-10-21T09:00:00.000Z',
  coverImage: {
    url: '/api/v1/public/media/platform/blog/a.webp',
    width: 1600,
    height: 900,
  },
  coverAlt: 'A phone playing a lesson',
  title: 'Protect your recorded lessons',
  excerpt:
    'How watermarking and device limits keep paid lessons with paying students.',
  readingMinutes: 6,
  authorName: 'Atlas team',
  ...overrides,
});

const post = (overrides: Partial<BlogPostDetail> = {}): BlogPostDetail => ({
  ...summary(),
  body: '## Why it matters\n\nText.\n\n## Device limits\n\nMore.\n\n## Watermarks\n\nEnd. <script>alert(1)</script>',
  seoTitle: null,
  seoDescription: null,
  related: [
    summary({
      slug: 'collect-payments',
      topic: 'payments',
      title: 'Collect payments',
    }),
  ],
  alternateLocaleAvailable: true,
  ...overrides,
});

describe('blog routes', () => {
  it('maps every blog URL', () => {
    expect(blogRoute('/blog')).toEqual({
      kind: 'list',
      lang: 'en',
      page: 1,
      topic: null,
    });
    expect(blogRoute('/ar/blog/page/3')).toEqual({
      kind: 'list',
      lang: 'ar',
      page: 3,
      topic: null,
    });
    expect(blogRoute('/blog/topics/exams/page/2')).toEqual({
      kind: 'list',
      lang: 'en',
      page: 2,
      topic: 'exams',
    });
    expect(blogRoute('/ar/blog/my-post')).toEqual({
      kind: 'post',
      lang: 'ar',
      slug: 'my-post',
    });
    expect(blogRoute('/sitemaps/blog.xml')).toEqual({ kind: 'sitemap' });
  });

  it('redirects trailing slashes and page 1, and 404s the rest', () => {
    expect(blogRoute('/blog/', '?utm=x')).toEqual({
      kind: 'redirect',
      location: '/blog?utm=x',
    });
    expect(blogRoute('/blog/page/1')).toEqual({
      kind: 'redirect',
      location: '/blog',
    });
    expect(blogRoute('/ar/blog/topics/news/page/1')).toEqual({
      kind: 'redirect',
      location: '/ar/blog/topics/news',
    });
    for (const path of [
      '/blog/page/0',
      '/blog/page/x',
      '/blog/topics/cats',
      '/blog/Bad_Slug',
      '/blog/a/b',
      '/blog/page/01',
    ]) {
      expect(blogRoute(path), path).toEqual({ kind: 'notFound', lang: 'en' });
    }
    expect(blogRoute('/pricing')).toBeNull();
    expect(blogRoute('/blogger')).toBeNull();
  });
});

describe('blog index', () => {
  it('renders the marketing chrome with SEO, hreflang and Blog JSON-LD', () => {
    const { status, html } = renderBlogIndex({
      lang: 'en',
      page: 1,
      topic: null,
      result: {
        items: [summary(), summary({ slug: 'second', featured: false })],
        pagination: { page: 1, totalPages: 2, totalItems: 13 },
      },
      ctx,
      assets,
    });
    expect(status).toBe(200);
    expect(html).toContain('<html lang="en" dir="ltr">');
    expect(html).toContain(
      '<title>Blog: Running an Online Academy in Egypt | Atlas</title>'
    );
    expect(html).toContain(
      '<link rel="canonical" href="https://atlass.dpdns.org/blog">'
    );
    expect(html).toContain(
      'hreflang="ar" href="https://atlass.dpdns.org/ar/blog"'
    );
    expect(html).toContain('"@type":"Blog"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('href="/assets/marketing-abc.css"');
    expect(html).toContain('data-header');
    expect(html).toContain('href="/blog/protect-recorded-lessons"');
    expect(html).toContain('rel="next"');
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(html).toMatch(/aria-current="page"[^>]*>Blog</);
  });

  it('leads the blog home with the newest featured post, not on topic pages', () => {
    const items = [
      summary({ slug: 'newest', featured: false, title: 'Newest post' }),
      summary({ slug: 'pillar', featured: true, title: 'Pillar post' }),
      summary({ slug: 'older', featured: false, title: 'Older post' }),
    ];
    const order = (html: string) =>
      ['newest', 'pillar', 'older'].sort(
        (a, b) =>
          html.indexOf(`href="/blog/${a}"`) - html.indexOf(`href="/blog/${b}"`)
      );
    const home = renderBlogIndex({
      lang: 'en',
      page: 1,
      topic: null,
      result: { items, pagination: { page: 1, totalPages: 1, totalItems: 3 } },
      ctx,
      assets,
    }).html;
    expect(order(home)).toEqual(['pillar', 'newest', 'older']);
    const topicPage = renderBlogIndex({
      lang: 'en',
      page: 1,
      topic: 'protection',
      result: { items, pagination: { page: 1, totalPages: 1, totalItems: 3 } },
      ctx,
      assets,
    }).html;
    expect(order(topicPage)).toEqual(['newest', 'pillar', 'older']);
  });

  it('renders Arabic topic pages right to left with their own title', () => {
    const { html } = renderBlogIndex({
      lang: 'ar',
      page: 2,
      topic: 'payments',
      result: {
        items: [summary({ topic: 'payments' })],
        pagination: { page: 2, totalPages: 2, totalItems: 13 },
      },
      ctx,
      assets,
    });
    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html).toContain(
      '<title>المدفوعات: مقالات لأصحاب الأكاديميات (صفحة ٢) | أطلس</title>'
    );
    expect(html).toContain(
      '<link rel="canonical" href="https://atlass.dpdns.org/ar/blog/topics/payments/page/2">'
    );
    expect(html).toContain('rel="prev"');
    expect(html).toContain('صفحة ٢ من ٢');
  });

  it('404s past the last page', () => {
    const out = renderBlogIndex({
      lang: 'en',
      page: 5,
      topic: null,
      result: {
        items: [],
        pagination: { page: 5, totalPages: 2, totalItems: 13 },
      },
      ctx,
      assets,
    });
    expect(out.status).toBe(404);
    expect(out.html).toContain('noindex');
  });

  it('shows an empty state with no posts', () => {
    const { html } = renderBlogIndex({
      lang: 'en',
      page: 1,
      topic: 'news',
      result: {
        items: [],
        pagination: { page: 1, totalPages: 1, totalItems: 0 },
      },
      ctx,
      assets,
    });
    expect(html).toContain('No articles here yet');
  });
});

describe('blog post', () => {
  it('renders the article with BlogPosting JSON-LD, article OG and the cover as the image', () => {
    const html = renderBlogPost({ lang: 'en', post: post(), ctx, assets });
    expect(html).toContain(
      '<title>Protect your recorded lessons | Atlas</title>'
    );
    expect(html).toContain(
      '<meta name="description" content="How watermarking and device limits keep paid lessons with paying students.">'
    );
    expect(html).toContain('<meta property="og:type" content="article">');
    expect(html).toContain(
      '<meta property="og:image" content="https://atlass.dpdns.org/api/v1/public/media/platform/blog/a.webp">'
    );
    expect(html).toContain('<meta property="og:image:width" content="1600">');
    expect(html).toContain(
      '<meta name="twitter:card" content="summary_large_image">'
    );
    expect(html).toContain('"@type":"BlogPosting"');
    expect(html).toContain('"datePublished":"2026-10-20T09:00:00.000Z"');
    expect(html).toContain(
      'hreflang="ar" href="https://atlass.dpdns.org/ar/blog/protect-recorded-lessons"'
    );
    expect(html).toContain('<h2 id="why-it-matters"');
    expect(html).toContain('On this page');
    expect(html).toContain('href="/blog/collect-payments"');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it('uses the SEO title/description and drops hreflang when only one language exists', () => {
    const html = renderBlogPost({
      lang: 'ar',
      post: post({
        seoTitle: 'عنوان البحث',
        seoDescription: 'وصف البحث',
        alternateLocaleAvailable: false,
        coverImage: null,
      }),
      ctx,
      assets,
    });
    expect(html).toContain('<title>عنوان البحث</title>');
    expect(html).toContain('content="وصف البحث"');
    expect(html).not.toContain('hreflang=');
    expect(html).toContain('og-ar.jpg');
    // The language switch goes to the English blog home, not a missing post.
    expect(html).toMatch(
      /href="\/blog" hrefLang="en"|hrefLang="en"[^>]*href="\/blog"/i
    );
  });
});

describe('fallback pages and sitemap', () => {
  it('serves the branded 404 and 503 pages, noindex', () => {
    expect(renderBlogNotFound({ lang: 'ar', ctx, assets })).toContain(
      '<html lang="ar" dir="rtl">'
    );
    const unavailable = renderBlogUnavailable({ lang: 'en', ctx, assets });
    expect(unavailable).toContain('The blog is temporarily unavailable');
    expect(unavailable).toContain(
      '<meta name="robots" content="noindex, follow">'
    );
  });

  it('lists the blog homes and each post language, with hreflang pairs', () => {
    const xml = buildBlogSitemap({
      siteUrl: 'https://atlass.dpdns.org',
      items: [
        {
          slug: 'both',
          updatedAt: '2026-10-25T10:00:00.000Z',
          locales: ['en', 'ar'],
        },
        {
          slug: 'en-only',
          updatedAt: '2026-10-24T10:00:00.000Z',
          locales: ['en'],
        },
        {
          slug: '../bad',
          updatedAt: '2026-10-24T10:00:00.000Z',
          locales: ['en'],
        },
      ],
    });
    expect(xml).toContain(
      '<loc>https://atlass.dpdns.org/blog</loc><lastmod>2026-10-25</lastmod>'
    );
    expect(xml).toContain('<loc>https://atlass.dpdns.org/ar/blog/both</loc>');
    expect(xml).toContain(
      'hreflang="ar" href="https://atlass.dpdns.org/ar/blog/both"'
    );
    expect(xml).toContain(
      '<loc>https://atlass.dpdns.org/blog/en-only</loc><lastmod>2026-10-24</lastmod></url>'
    );
    expect(xml).not.toContain('/ar/blog/en-only');
    expect(xml).not.toContain('bad');
  });
});
