/**
 * B3 — the resources hub `/resources` · `/ar/resources`: the latest blog
 * posts, the help center's categories, the demo academy and the guides.
 *
 * Static and edge-cached like every page. The "Latest from the blog" cards
 * are topic links in the HTML (complete without JavaScript or when the API
 * is down); `client/resources.ts` swaps them for the three newest posts
 * from `GET /api/v1/public/blog/posts` in place — the same three card
 * slots, so nothing below moves. The founding programme is link-only and
 * is deliberately not listed here.
 */
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ExternalLink,
  Newspaper,
} from 'lucide-react';
import { DOC_CATEGORIES } from '@/docs/categories';
import {
  Container,
  CtaBand,
  Section,
  SectionHeading,
  dirOf,
} from '../components/ui';
import { HeroArt } from '../components/hero-art';
import { DEMO_ACADEMY_HOST } from '../data/demo';
import type { MarketingBlogTopic } from '../content/content.types';
import { fill, link } from '../lib/copy';
import { docsHref, localePath } from '../lib/site';
import type { MarketingLang, MarketingPageDef } from '../types';
import {
  Shell,
  breadcrumb,
  pageEnv,
  seoHead,
  webPage,
  type PageEnv,
} from './shared';

/** The three topics shown until (or unless) the newest posts load. */
export const RESOURCES_FALLBACK_TOPICS: readonly MarketingBlogTopic[] = [
  'protection',
  'payments',
  'exams',
];
export const DEMO_ACADEMY_URL = `https://${DEMO_ACADEMY_HOST}`;

function ResourcesPage({ env }: { env: PageEnv }) {
  const { content, tokens, lang } = env;
  const r = content.resources;
  const dir = dirOf(lang);
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const closing = r.closing;
  const categories = DOC_CATEGORIES.filter(
    (category) => category.featured || category.order <= 6
  ).slice(0, 6);
  return (
    <Shell env={env} path="/resources" currentId="resources">
      <section
        className="relative overflow-hidden border-b border-border"
        aria-labelledby="resources-title"
      >
        <div
          aria-hidden
          className="mk-hero-ground pointer-events-none absolute inset-0"
        />
        <Container className="relative grid items-center gap-10 py-14 lg:grid-cols-12 lg:gap-12 lg:py-20">
          <div className="lg:col-span-7">
            <SectionHeading
              id="resources-title"
              level={1}
              eyebrow={
                r.hero.eyebrow ? fill(r.hero.eyebrow, tokens) : undefined
              }
              title={fill(r.hero.title, tokens)}
              lead={r.hero.lead ? fill(r.hero.lead, tokens) : undefined}
            />
          </div>
          <div className="lg:col-span-5">
            <HeroArt
              name="resources"
              className="mx-auto max-w-md lg:max-w-none"
            />
          </div>
        </Container>
      </section>

      <Section id="blog" labelledBy="resources-blog-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            id="resources-blog-title"
            title={fill(r.blog.title, tokens)}
            lead={r.blog.lead ? fill(r.blog.lead, tokens) : undefined}
          />
          <a
            href={localePath(lang, '/blog')}
            className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline-offset-4 hover:underline"
          >
            {r.blog.allPosts}
            <Arrow className="size-4" aria-hidden strokeWidth={1.75} />
          </a>
        </div>
        <ul
          className="mt-10 grid gap-5 md:grid-cols-3"
          data-blog-latest
          data-locale={lang}
          data-reading-time={r.blog.readingTime.replace('{minutes}', '%s')}
          aria-live="polite"
        >
          {RESOURCES_FALLBACK_TOPICS.map((topic) => (
            <li key={topic} className="flex">
              <a
                href={localePath(lang, `/blog/topics/${topic}`)}
                className="mk-card flex min-h-[11rem] w-full flex-col p-6 hover:border-primary"
              >
                <Newspaper
                  className="size-5 text-primary"
                  aria-hidden
                  strokeWidth={1.75}
                />
                <span className="mt-4 block text-lg font-semibold text-foreground">
                  {fill(content.blog.topics[topic].label, tokens)}
                </span>
                <span className="mt-2 block leading-relaxed text-muted-foreground">
                  {fill(content.blog.topics[topic].description, tokens)}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p
          className="mt-4 text-sm text-muted-foreground"
          data-blog-latest-fallback
        >
          {fill(r.blog.fallback, tokens)}
        </p>
      </Section>

      <Section
        id="help"
        labelledBy="resources-help-title"
        className="border-t border-border"
        tinted
      >
        <SectionHeading
          id="resources-help-title"
          title={fill(r.help.title, tokens)}
          lead={r.help.lead ? fill(r.help.lead, tokens) : undefined}
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id}>
              <a
                href={docsHref(lang, `/${category.id}`)}
                className="mk-card block h-full bg-background p-5 hover:border-primary"
              >
                <span className="block font-semibold text-foreground">
                  {category.title[lang]}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                  {category.description[lang]}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <a
          href={docsHref(lang, '/')}
          data-mkt-help
          className="mt-8 inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline-offset-4 hover:underline"
        >
          <BookOpen className="size-4" aria-hidden strokeWidth={1.75} />
          {r.help.cta}
        </a>
      </Section>

      <Section
        id="demo"
        labelledBy="resources-demo-title"
        className="border-t border-border"
      >
        <div className="mk-card grid gap-6 p-6 sm:p-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <SectionHeading
              id="resources-demo-title"
              title={fill(r.demo.title, tokens)}
              lead={r.demo.lead ? fill(r.demo.lead, tokens) : undefined}
            />
            <p className="mt-4 text-sm text-muted-foreground">
              {fill(r.demo.note, tokens)}
            </p>
          </div>
          <div className="lg:text-end">
            <a
              href={DEMO_ACADEMY_URL}
              rel="noopener"
              className="mk-btn mk-btn-primary"
            >
              {r.demo.cta}
              <ExternalLink
                className="size-4 rtl:-scale-x-100"
                aria-hidden
                strokeWidth={1.75}
              />
            </a>
            <p
              className="mt-3 font-mono text-xs text-muted-foreground"
              dir="ltr"
            >
              {DEMO_ACADEMY_HOST}
            </p>
          </div>
        </div>
      </Section>

      <Section
        id="guides"
        labelledBy="resources-guides-title"
        className="border-t border-border"
      >
        <SectionHeading
          id="resources-guides-title"
          title={fill(r.guides.title, tokens)}
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {r.guides.items.map((item) => (
            <li key={item.href}>
              <a
                href={localePath(lang, item.href)}
                className="mk-card block h-full p-5 hover:border-primary"
              >
                <span className="block font-semibold text-foreground">
                  {fill(item.title, tokens)}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                  {fill(item.body, tokens)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand
        title={fill(closing.title, tokens)}
        microcopy={
          closing.microcopy && tokens.trialDays
            ? fill(closing.microcopy, tokens)
            : undefined
        }
        primary={link(lang, closing.primaryCta, tokens)}
        secondary={
          closing.secondaryCta
            ? link(lang, closing.secondaryCta, tokens)
            : undefined
        }
        dir={dir}
      />
    </Shell>
  );
}

function resourcesPage(lang: MarketingLang): MarketingPageDef {
  return {
    id: 'resources',
    lang,
    path: localePath(lang, '/resources'),
    file: lang === 'ar' ? 'ar/resources/index.html' : 'resources/index.html',
    inSitemap: true,
    head: (ctx) => {
      const env = pageEnv(lang, ctx);
      return seoHead(env, 'resources', '/resources', [
        webPage(
          env,
          '/resources',
          fill(env.content.seo.resources.ogTitle, env.tokens),
          'CollectionPage'
        ),
        breadcrumb(env, [
          {
            name: fill(env.content.chrome.header.resources, env.tokens),
            path: '/resources',
          },
        ]),
      ]);
    },
    render: (ctx) => <ResourcesPage env={pageEnv(lang, ctx)} />,
  };
}

export const RESOURCES_PAGES = [
  resourcesPage('en'),
  resourcesPage('ar'),
] as const;
