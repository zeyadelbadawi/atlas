/**
 * B3 — the Atlas blog on the marketing site, rendered AT REQUEST TIME by
 * the `ssr` container (`server/ssr/blog.mjs`), so a post published from
 * the dashboard is live without a deploy. Pure: routes, data and asset URLs
 * in, HTML/XML out; the Node side only fetches the public API and caches.
 *
 * Every page uses the marketing header, footer, stylesheet and client
 * script (the same `renderDocument` as the static pages): title and
 * description, canonical, hreflang EN/AR (a post only when both languages
 * exist), Open Graph / Twitter (the cover image), JSON-LD (Blog /
 * BlogPosting / BreadcrumbList), `dir="rtl"` for Arabic.
 *
 * Routes (an `/ar` prefix for Arabic): `/blog`, `/blog/page/:n` (n ≥ 2),
 * `/blog/topics/:topic`, `/blog/topics/:topic/page/:n`, `/blog/:slug`, and
 * `/sitemaps/blog.xml`. Anything else under `/blog` is the branded 404.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { PageShell } from '../components/chrome';
import { Container, CtaBand, dirOf } from '../components/ui';
import type { MarketingBlogTopic } from '../content/content.types';
import { fill, link } from '../lib/copy';
import { formatDate, formatNumber, localePath } from '../lib/site';
import { NOT_FOUND_PAGES } from '../pages/legal';
import {
  OG_IMAGE,
  orgId,
  pageEnv,
  siteId,
  type PageEnv,
} from '../pages/shared';
import {
  absoluteUrl,
  renderDocument,
  type MarketingAssets,
} from '../prerender/document';
import {
  MARKETING_BLOG_SITEMAP,
  isMarketingBlogPath,
} from '../prerender/routing';
import type {
  MarketingHead,
  MarketingLang,
  MarketingRenderContext,
} from '../types';
import { BlogArticle } from './article';
import { blogHeadings } from './markdown';

export const BLOG_TOPICS: readonly MarketingBlogTopic[] = [
  'protection',
  'payments',
  'exams',
  'website',
  'season',
  'teaching',
  'news',
];
export const BLOG_PAGE_SIZE = 12;
export const BLOG_SITEMAP_PATH = MARKETING_BLOG_SITEMAP;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PAGE = /^[1-9]\d{0,3}$/;

// ─── Data (the public API's shapes) ─────────────────────────────────────────

export interface BlogCover {
  readonly url: string;
  readonly width: number;
  readonly height: number;
}

export interface BlogSummary {
  readonly slug: string;
  readonly kind: string;
  readonly topic: MarketingBlogTopic;
  readonly featured: boolean;
  readonly publishAt: string;
  readonly updatedAt: string;
  readonly coverImage: BlogCover | null;
  readonly coverAlt: string;
  readonly title: string;
  readonly excerpt: string;
  readonly readingMinutes: number;
  readonly authorName: string;
}

export interface BlogPostDetail extends BlogSummary {
  readonly body: string;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly related: readonly BlogSummary[];
  readonly alternateLocaleAvailable: boolean;
}

export interface BlogListResult {
  readonly items: readonly BlogSummary[];
  readonly pagination: {
    readonly page: number;
    readonly totalPages: number;
    readonly totalItems: number;
  };
}

export interface BlogSitemapItem {
  readonly slug: string;
  readonly updatedAt: string;
  readonly locales: readonly MarketingLang[];
}

export interface BlogRenderInput {
  readonly lang: MarketingLang;
  readonly ctx: MarketingRenderContext;
  readonly assets: MarketingAssets;
}

// ─── Routing ────────────────────────────────────────────────────────────────

export type BlogRoute =
  | { readonly kind: 'redirect'; readonly location: string }
  | {
      readonly kind: 'list';
      readonly lang: MarketingLang;
      readonly page: number;
      readonly topic: MarketingBlogTopic | null;
    }
  | {
      readonly kind: 'post';
      readonly lang: MarketingLang;
      readonly slug: string;
    }
  | { readonly kind: 'sitemap' }
  | { readonly kind: 'notFound'; readonly lang: MarketingLang };

/** Whether a path belongs to the blog (what Caddy routes to the renderer). */
export const isBlogPath = isMarketingBlogPath;

/** `/blog` paths in a language. */
export function blogPath(lang: MarketingLang, rest = ''): string {
  return localePath(lang, `/blog${rest}`);
}

export function blogListPath(
  lang: MarketingLang,
  topic: MarketingBlogTopic | null,
  page = 1
): string {
  const base = topic ? `/topics/${topic}` : '';
  return blogPath(lang, page > 1 ? `${base}/page/${page}` : base);
}

/**
 * Which blog page a request is, or null when it is not a blog path.
 * `search` (with `?`) is kept on redirects.
 */
export function blogRoute(pathname: string, search = ''): BlogRoute | null {
  if (!isBlogPath(pathname)) return null;
  if (pathname === BLOG_SITEMAP_PATH) return { kind: 'sitemap' };
  if (pathname.endsWith('/')) {
    return {
      kind: 'redirect',
      location: `${pathname.replace(/\/+$/, '')}${search}`,
    };
  }
  const lang: MarketingLang = pathname.startsWith('/ar/') ? 'ar' : 'en';
  const rest = pathname.slice(
    lang === 'ar' ? '/ar/blog'.length : '/blog'.length
  );
  const parts = rest.split('/').filter(Boolean);
  const notFound: BlogRoute = { kind: 'notFound', lang };
  const pageOf = (value: string | undefined) =>
    value && PAGE.test(value) ? Number(value) : null;

  if (parts.length === 0) return { kind: 'list', lang, page: 1, topic: null };
  if (parts[0] === 'page' && parts.length === 2) {
    const page = pageOf(parts[1]);
    if (page === null) return notFound;
    return page === 1
      ? { kind: 'redirect', location: `${blogPath(lang)}${search}` }
      : { kind: 'list', lang, page, topic: null };
  }
  if (parts[0] === 'topics' && (parts.length === 2 || parts.length === 4)) {
    const topic = parts[1] as MarketingBlogTopic;
    if (!BLOG_TOPICS.includes(topic)) return notFound;
    if (parts.length === 2) return { kind: 'list', lang, page: 1, topic };
    if (parts[2] !== 'page') return notFound;
    const page = pageOf(parts[3]);
    if (page === null) return notFound;
    return page === 1
      ? { kind: 'redirect', location: `${blogListPath(lang, topic)}${search}` }
      : { kind: 'list', lang, page, topic };
  }
  if (
    parts.length === 1 &&
    SLUG.test(parts[0]) &&
    parts[0].length <= 80 &&
    parts[0] !== 'page' &&
    parts[0] !== 'topics'
  ) {
    return { kind: 'post', lang, slug: parts[0] };
  }
  return notFound;
}

// ─── Components ─────────────────────────────────────────────────────────────

function readingTime(env: PageEnv, minutes: number): string {
  return fill(env.content.blog.readingTime, {
    minutes: formatNumber(env.lang, minutes),
  });
}

function topicLabel(env: PageEnv, topic: MarketingBlogTopic): string {
  return fill(env.content.blog.topics[topic]?.label ?? topic, env.tokens);
}

function Breadcrumbs({
  env,
  items,
}: {
  env: PageEnv;
  items: readonly { label: string; href?: string }[];
}) {
  return (
    <nav aria-label={env.content.blog.breadcrumbLabel} className="mb-6 text-sm">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
        {items.map((item, index) => (
          <li
            key={`${item.label}-${index}`}
            className="flex items-center gap-2"
          >
            {index > 0 ? <span aria-hidden>/</span> : null}
            {item.href ? (
              <a
                href={item.href}
                className="inline-flex min-h-11 items-center font-medium hover:text-primary"
              >
                {item.label}
              </a>
            ) : (
              <span aria-current="page" className="text-foreground">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function TopicNav({
  env,
  active,
}: {
  env: PageEnv;
  active: MarketingBlogTopic | null;
}) {
  const b = env.content.blog;
  const chip =
    'inline-flex min-h-11 items-center rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground/80 hover:border-primary hover:text-primary aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground';
  return (
    <nav aria-label={b.topicsLabel} className="mt-8">
      <ul className="flex flex-wrap gap-2">
        <li>
          <a
            href={blogPath(env.lang)}
            aria-current={active === null ? 'page' : undefined}
            className={chip}
          >
            {b.allTopics}
          </a>
        </li>
        {BLOG_TOPICS.map((topic) => (
          <li key={topic}>
            <a
              href={blogListPath(env.lang, topic)}
              aria-current={active === topic ? 'page' : undefined}
              className={chip}
            >
              {topicLabel(env, topic)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function PostCard({
  env,
  post,
  large = false,
  eager = false,
}: {
  env: PageEnv;
  post: BlogSummary;
  large?: boolean;
  eager?: boolean;
}) {
  const href = blogPath(env.lang, `/${post.slug}`);
  return (
    <article
      className={
        large
          ? 'mk-card flex flex-col overflow-hidden md:col-span-2 md:flex-row'
          : 'mk-card flex flex-col overflow-hidden'
      }
    >
      {post.coverImage ? (
        <a
          href={href}
          tabIndex={-1}
          aria-hidden
          className={large ? 'block md:w-1/2' : 'block'}
        >
          <img
            src={post.coverImage.url}
            width={post.coverImage.width}
            height={post.coverImage.height}
            alt=""
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            className="aspect-[16/9] h-full w-full bg-muted object-cover"
          />
        </a>
      ) : null}
      <div className="flex flex-1 flex-col p-6">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-primary">
          <span>{topicLabel(env, post.topic)}</span>
          {post.featured ? (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-primary">
              {env.content.blog.featured}
            </span>
          ) : null}
        </p>
        <h2
          className={
            large
              ? 'mt-3 text-2xl font-semibold leading-snug text-foreground'
              : 'mt-3 text-lg font-semibold leading-snug text-foreground'
          }
        >
          <a href={href} className="hover:text-primary">
            {post.title}
          </a>
        </h2>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          {post.excerpt}
        </p>
        <p className="mt-auto flex flex-wrap gap-x-2 pt-4 text-sm text-muted-foreground">
          <time dateTime={post.publishAt}>
            {formatDate(env.lang, post.publishAt)}
          </time>
          <span aria-hidden>·</span>
          <span>{readingTime(env, post.readingMinutes)}</span>
        </p>
      </div>
    </article>
  );
}

function Closing({ env }: { env: PageEnv }) {
  const c = env.content.blog.closing;
  return (
    <CtaBand
      title={fill(c.title, env.tokens)}
      microcopy={
        c.microcopy && env.tokens.trialDays
          ? fill(c.microcopy, env.tokens)
          : undefined
      }
      primary={link(env.lang, c.primaryCta, env.tokens)}
      secondary={
        c.secondaryCta ? link(env.lang, c.secondaryCta, env.tokens) : undefined
      }
      dir={dirOf(env.lang)}
    />
  );
}

function BlogIndex({
  env,
  topic,
  result,
}: {
  env: PageEnv;
  topic: MarketingBlogTopic | null;
  result: BlogListResult;
}) {
  const b = env.content.blog;
  const { page, totalPages } = result.pagination;
  const Arrow = env.lang === 'ar' ? ArrowLeft : ArrowRight;
  const Back = env.lang === 'ar' ? ArrowRight : ArrowLeft;
  const title = topic ? topicLabel(env, topic) : fill(b.hero.title, env.tokens);
  const lead = topic
    ? fill(b.topics[topic].description, env.tokens)
    : b.hero.lead
      ? fill(b.hero.lead, env.tokens)
      : undefined;
  // The blog home leads with the newest featured post (the editor's
  // "Featured: shown first on the blog home page"); the API lists by date.
  const home = page === 1 && !topic;
  const leadPost = home
    ? result.items.find((post) => post.featured)
    : undefined;
  const items = leadPost
    ? [leadPost, ...result.items.filter((post) => post !== leadPost)]
    : result.items;
  return (
    <>
      <section
        className="relative overflow-hidden border-b border-border"
        aria-labelledby="blog-title"
      >
        <div
          aria-hidden
          className="mk-hero-ground pointer-events-none absolute inset-0"
        />
        <Container className="relative py-12 lg:py-16">
          {topic ? (
            <Breadcrumbs
              env={env}
              items={[
                { label: b.name, href: blogPath(env.lang) },
                { label: title },
              ]}
            />
          ) : null}
          {!topic && b.hero.eyebrow ? (
            <p className="mk-eyebrow mb-4">
              {fill(b.hero.eyebrow, env.tokens)}
            </p>
          ) : null}
          <h1
            id="blog-title"
            className="mk-heading max-w-3xl text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground sm:text-5xl"
          >
            {title}
          </h1>
          {lead ? (
            <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
              {lead}
            </p>
          ) : null}
          <TopicNav env={env} active={topic} />
        </Container>
      </section>
      <section className="py-12 lg:py-16">
        <Container>
          {result.items.length === 0 ? (
            <div className="mk-card max-w-2xl p-8">
              <h2 className="text-xl font-semibold text-foreground">
                {b.empty.title}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {fill(b.empty.body, env.tokens)}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.map((post, index) => (
                <PostCard
                  key={post.slug}
                  env={env}
                  post={post}
                  large={Boolean(leadPost) && index === 0}
                  eager={index < 2}
                />
              ))}
            </div>
          )}
          {totalPages > 1 ? (
            <nav
              aria-label={b.pagination.label}
              className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6"
            >
              {page > 1 ? (
                <a
                  href={blogListPath(env.lang, topic, page - 1)}
                  rel="prev"
                  className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary hover:underline"
                >
                  <Back className="size-4" aria-hidden strokeWidth={1.75} />
                  {b.pagination.newer}
                </a>
              ) : (
                <span />
              )}
              <p className="text-sm text-muted-foreground">
                {fill(b.pagination.status, {
                  page: formatNumber(env.lang, page),
                  pages: formatNumber(env.lang, totalPages),
                })}
              </p>
              {page < totalPages ? (
                <a
                  href={blogListPath(env.lang, topic, page + 1)}
                  rel="next"
                  className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary hover:underline"
                >
                  {b.pagination.older}
                  <Arrow className="size-4" aria-hidden strokeWidth={1.75} />
                </a>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </Container>
      </section>
      <Closing env={env} />
    </>
  );
}

function BlogPostPage({ env, post }: { env: PageEnv; post: BlogPostDetail }) {
  const b = env.content.blog;
  const other: MarketingLang = env.lang === 'ar' ? 'en' : 'ar';
  const headings = blogHeadings(post.body);
  const Back = env.lang === 'ar' ? ArrowRight : ArrowLeft;
  return (
    <>
      <Container className="py-10 lg:py-14">
        <BlogArticle
          lang={env.lang}
          title={post.title}
          excerpt={post.excerpt}
          body={post.body}
          topicLabel={topicLabel(env, post.topic)}
          byline={`${post.authorName} · ${readingTime(env, post.readingMinutes)}`}
          date={{
            label: fill(b.publishedOn, {
              date: formatDate(env.lang, post.publishAt),
            }),
            iso: post.publishAt,
          }}
          cover={
            post.coverImage ? { ...post.coverImage, alt: post.coverAlt } : null
          }
          before={
            <Breadcrumbs
              env={env}
              items={[
                { label: b.name, href: blogPath(env.lang) },
                {
                  label: topicLabel(env, post.topic),
                  href: blogListPath(env.lang, post.topic),
                },
                { label: post.title },
              ]}
            />
          }
          aside={
            headings.length >= 3 ? (
              <nav
                aria-labelledby="blog-toc-title"
                className="mt-8 rounded-xl border border-border bg-surface p-5"
              >
                <h2
                  id="blog-toc-title"
                  className="text-sm font-semibold text-foreground"
                >
                  {b.post.tocLabel}
                </h2>
                <ol className="mt-3 space-y-1 text-sm">
                  {headings.map((heading) => (
                    <li key={heading.id}>
                      <a
                        href={`#${encodeURIComponent(heading.id)}`}
                        className="inline-flex min-h-9 items-center text-primary hover:underline"
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null
          }
          after={
            <footer className="mt-12 space-y-10 border-t border-border pt-8">
              {post.alternateLocaleAvailable ? (
                <p>
                  <a
                    href={blogPath(other, `/${post.slug}`)}
                    hrefLang={other}
                    lang={other}
                    dir={dirOf(other)}
                    className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {b.post.alternate}
                  </a>
                </p>
              ) : null}
              {post.related.length > 0 ? (
                <section aria-labelledby="blog-related-title">
                  <h2
                    id="blog-related-title"
                    className="text-2xl font-semibold text-foreground"
                  >
                    {b.post.relatedTitle}
                  </h2>
                  <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                    {post.related.map((item) => (
                      <li key={item.slug}>
                        <a
                          href={blogPath(env.lang, `/${item.slug}`)}
                          className="mk-card block h-full p-5 hover:border-primary"
                        >
                          <span className="block text-sm font-semibold text-primary">
                            {topicLabel(env, item.topic)}
                          </span>
                          <span className="mt-1 block font-semibold text-foreground">
                            {item.title}
                          </span>
                          <span className="mt-1 block text-sm text-muted-foreground">
                            {readingTime(env, item.readingMinutes)}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              <a
                href={blogPath(env.lang)}
                className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary hover:underline"
              >
                <Back className="size-4" aria-hidden strokeWidth={1.75} />
                {b.post.backToBlog}
              </a>
            </footer>
          }
        />
      </Container>
      <Closing env={env} />
    </>
  );
}

function Unavailable({ env }: { env: PageEnv }) {
  const u = env.content.blog.unavailable;
  return (
    <section
      className="relative overflow-hidden"
      aria-labelledby="blog-unavailable-title"
    >
      <div
        aria-hidden
        className="mk-hero-ground pointer-events-none absolute inset-0"
      />
      <Container className="relative flex min-h-[50svh] flex-col items-start justify-center py-20">
        <h1
          id="blog-unavailable-title"
          className="mk-heading text-4xl font-semibold text-foreground sm:text-5xl"
        >
          {u.title}
        </h1>
        <p className="mt-5 max-w-[56ch] text-lg leading-relaxed text-muted-foreground">
          {u.body}
        </p>
        <ul className="mt-8 flex flex-wrap gap-3">
          <li>
            <a href={blogPath(env.lang)} className="mk-btn mk-btn-primary">
              {u.retry}
            </a>
          </li>
          <li>
            <a
              href={localePath(env.lang, '/')}
              className="mk-btn mk-btn-secondary"
            >
              {u.home}
            </a>
          </li>
        </ul>
      </Container>
    </section>
  );
}

// ─── Documents ──────────────────────────────────────────────────────────────

function shellDocument(
  env: PageEnv,
  input: BlogRenderInput,
  head: MarketingHead,
  paths: { en: string; ar: string },
  body: JSX.Element
): string {
  const bodyHtml = renderToStaticMarkup(
    <PageShell
      content={env.content}
      tokens={env.tokens}
      enPath={paths.en}
      arPath={paths.ar}
      currentId="blog"
    >
      {body}
    </PageShell>
  );
  return renderDocument({
    page: { lang: env.lang, id: 'blog' },
    head,
    ctx: input.ctx,
    assets: input.assets,
    bodyHtml,
  });
}

function breadcrumbList(
  env: PageEnv,
  items: readonly { name: string; path: string }[]
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        name: env.content.chrome.breadcrumbs.home,
        path: localePath(env.lang, '/'),
      },
      ...items,
    ].map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(env.ctx.siteUrl, item.path),
    })),
  };
}

/** A list page: `/blog`, a topic, or a later page of either. 404 past the last page. */
export function renderBlogIndex(
  input: BlogRenderInput & {
    readonly page: number;
    readonly topic: MarketingBlogTopic | null;
    readonly result: BlogListResult;
  }
): { status: 200 | 404; html: string } {
  const env = pageEnv(input.lang, input.ctx);
  const { page, topic, result } = input;
  if (page > 1 && page > result.pagination.totalPages) {
    return { status: 404, html: renderBlogNotFound(input) };
  }
  const b = env.content.blog;
  const path = blogListPath(env.lang, topic, page);
  const paths = {
    en: blogListPath('en', topic, page),
    ar: blogListPath('ar', topic, page),
  };
  const suffix =
    page > 1
      ? fill(b.seo.pageSuffix, { page: formatNumber(env.lang, page) })
      : '';
  const baseTitle = topic
    ? fill(
        fill(b.seo.topicTitle, { topic: topicLabel(env, topic) }),
        env.tokens
      )
    : fill(b.seo.title, env.tokens);
  const title = suffix
    ? baseTitle.replace(/(\s*\|[^|]*)$/, `${suffix}$1`)
    : baseTitle;
  const description = topic
    ? fill(
        fill(b.seo.topicDescription, {
          description: fill(b.topics[topic].description, env.tokens),
        }),
        env.tokens
      )
    : fill(b.seo.description, env.tokens);
  const blogUrl = absoluteUrl(env.ctx.siteUrl, blogPath(env.lang));
  const crumbs = [
    { name: b.name, path: blogPath(env.lang) },
    ...(topic
      ? [{ name: topicLabel(env, topic), path: blogListPath(env.lang, topic) }]
      : []),
  ];
  const head: MarketingHead = {
    title,
    description,
    canonicalPath: path,
    alternates: paths,
    ogImage: OG_IMAGE[env.lang],
    ogImageAlt: fill(b.seo.ogImageAlt, env.tokens),
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        '@id': `${blogUrl}#blog`,
        url: blogUrl,
        name: fill(b.seo.title, env.tokens),
        description: fill(b.seo.description, env.tokens),
        inLanguage: env.lang,
        isPartOf: { '@id': siteId(env.ctx.siteUrl) },
        publisher: { '@id': orgId(env.ctx.siteUrl) },
        blogPost: result.items.map((post) => ({
          '@type': 'BlogPosting',
          headline: post.title,
          url: absoluteUrl(
            env.ctx.siteUrl,
            blogPath(env.lang, `/${post.slug}`)
          ),
          datePublished: post.publishAt,
          dateModified: post.updatedAt,
        })),
      },
      breadcrumbList(env, crumbs),
    ],
  };
  return {
    status: 200,
    html: shellDocument(
      env,
      input,
      head,
      paths,
      <BlogIndex env={env} topic={topic} result={result} />
    ),
  };
}

/** One post. hreflang only when the other language is published too. */
export function renderBlogPost(
  input: BlogRenderInput & { readonly post: BlogPostDetail }
): string {
  const env = pageEnv(input.lang, input.ctx);
  const { post } = input;
  const b = env.content.blog;
  const path = blogPath(env.lang, `/${post.slug}`);
  const both = {
    en: blogPath('en', `/${post.slug}`),
    ar: blogPath('ar', `/${post.slug}`),
  };
  // The language switch: the post in the other language when it exists, else that blog home.
  const paths = post.alternateLocaleAvailable
    ? both
    : env.lang === 'en'
      ? { en: both.en, ar: blogPath('ar') }
      : { en: blogPath('en'), ar: both.ar };
  const url = absoluteUrl(env.ctx.siteUrl, path);
  const image = post.coverImage
    ? absoluteUrl(env.ctx.siteUrl, post.coverImage.url)
    : undefined;
  const head: MarketingHead = {
    title: post.seoTitle?.trim() || `${post.title} | ${env.content.brand.name}`,
    description: post.seoDescription?.trim() || post.excerpt,
    canonicalPath: path,
    alternates: post.alternateLocaleAvailable ? both : undefined,
    ogImage: post.coverImage ? post.coverImage.url : OG_IMAGE[env.lang],
    ogImageAlt: post.coverImage
      ? post.coverAlt || post.title
      : fill(b.seo.ogImageAlt, env.tokens),
    ogImageSize: post.coverImage
      ? { width: post.coverImage.width, height: post.coverImage.height }
      : undefined,
    ogType: 'article',
    articleTimes: { published: post.publishAt, modified: post.updatedAt },
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        '@id': `${url}#article`,
        mainEntityOfPage: url,
        url,
        headline: post.title,
        description: post.seoDescription?.trim() || post.excerpt,
        inLanguage: env.lang,
        datePublished: post.publishAt,
        dateModified: post.updatedAt,
        ...(image ? { image: [image] } : {}),
        articleSection: topicLabel(env, post.topic),
        author: {
          '@type': 'Organization',
          name: post.authorName,
          url: `${env.ctx.siteUrl}/`,
        },
        publisher: { '@id': orgId(env.ctx.siteUrl) },
        isPartOf: {
          '@id': `${absoluteUrl(env.ctx.siteUrl, blogPath(env.lang))}#blog`,
        },
      },
      breadcrumbList(env, [
        { name: b.name, path: blogPath(env.lang) },
        {
          name: topicLabel(env, post.topic),
          path: blogListPath(env.lang, post.topic),
        },
        { name: post.title, path },
      ]),
    ],
  };
  return shellDocument(
    env,
    input,
    head,
    paths,
    <BlogPostPage env={env} post={post} />
  );
}

/** The branded marketing 404 (the static site's own page), for a blog URL. */
export function renderBlogNotFound(input: BlogRenderInput): string {
  const page =
    NOT_FOUND_PAGES.find((entry) => entry.lang === input.lang) ??
    NOT_FOUND_PAGES[0];
  return renderDocument({
    page,
    head: page.head(input.ctx),
    ctx: input.ctx,
    assets: input.assets,
    bodyHtml: renderToStaticMarkup(page.render(input.ctx)),
  });
}

/** "Temporarily unavailable" (served with 503) when the API cannot be reached. */
export function renderBlogUnavailable(input: BlogRenderInput): string {
  const env = pageEnv(input.lang, input.ctx);
  const u = env.content.blog.unavailable;
  const head: MarketingHead = {
    title: `${u.title} | ${env.content.brand.name}`,
    description: u.body,
    canonicalPath: blogPath(env.lang),
    ogImage: OG_IMAGE[env.lang],
    robots: 'noindex, follow',
  };
  return shellDocument(
    env,
    input,
    head,
    { en: blogPath('en'), ar: blogPath('ar') },
    <Unavailable env={env} />
  );
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * `/sitemaps/blog.xml`: the blog home in both languages and every public
 * post in each language it has, with hreflang pairs when both exist.
 */
export function buildBlogSitemap(input: {
  readonly siteUrl: string;
  readonly items: readonly BlogSitemapItem[];
}): string {
  const url = (path: string) => escapeXml(absoluteUrl(input.siteUrl, path));
  const day = (iso: string) =>
    /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : '';
  const newest = input.items
    .map((item) => item.updatedAt)
    .sort()
    .at(-1);
  const entry = (
    path: string,
    lastmod: string | undefined,
    pair?: { en: string; ar: string }
  ) => {
    const parts = [`<loc>${url(path)}</loc>`];
    if (lastmod && day(lastmod))
      parts.push(`<lastmod>${day(lastmod)}</lastmod>`);
    if (pair) {
      for (const [hreflang, target] of [
        ['en', pair.en],
        ['ar', pair.ar],
        ['x-default', pair.en],
      ] as const) {
        parts.push(
          `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${url(target)}"/>`
        );
      }
    }
    return `<url>${parts.join('')}</url>`;
  };
  const home = { en: blogPath('en'), ar: blogPath('ar') };
  const urls = [entry(home.en, newest, home), entry(home.ar, newest, home)];
  for (const item of input.items) {
    if (!SLUG.test(item.slug)) continue;
    const both = item.locales.includes('en') && item.locales.includes('ar');
    const pair = {
      en: blogPath('en', `/${item.slug}`),
      ar: blogPath('ar', `/${item.slug}`),
    };
    for (const lang of ['en', 'ar'] as const) {
      if (item.locales.includes(lang))
        urls.push(entry(pair[lang], item.updatedAt, both ? pair : undefined));
    }
  }
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' +
    urls.join('') +
    '</urlset>\n'
  );
}
