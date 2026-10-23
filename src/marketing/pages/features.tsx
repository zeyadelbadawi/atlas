/**
 * Product hub `/features` · `/ar/features` — SPEC §B.5: one block per
 * capability group with a question H2, a quotable answer, the honest limit,
 * a real screenshot, a link to the group's product page (M1b), and the
 * five product pages listed at the end.
 */
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { ButtonLink, Container, CtaBand, LearnMore, MoreLink, Section, SectionHeading, dirOf } from '../components/ui';
import { Screenshot } from '../components/screenshot';
import { HeroArt } from '../components/hero-art';
import { productPagePath } from '../components/chrome';
import type { MarketingProductPageId } from '../content/content.types';
import type { ScreenshotKey } from '../data/screenshots';
import { fill, link } from '../lib/copy';
import { localePath } from '../lib/site';
import type { MarketingLang, MarketingPageDef } from '../types';
import { Shell, breadcrumb, pageEnv, seoHead, webPage, type PageEnv } from './shared';

/** The product page that covers each group in detail (M1b). */
const GROUP_PAGE: Record<string, MarketingProductPageId> = {
  payments: 'payments',
  website: 'academy-website',
  lessons: 'content-protection',
  assessments: 'quizzes-and-certificates',
  team: 'teams-and-academies',
};

/** Real capture per group id; groups without one render text only. */
const GROUP_SHOTS: Record<string, ScreenshotKey> = {
  payments: 'payments-review',
  website: 'website-editor',
  lessons: 'course-builder',
  assessments: 'quiz-builder',
  students: 'students-list',
};

function FeaturesPage({ env }: { env: PageEnv }) {
  const { content, tokens, lang } = env;
  const f = content.features;
  const dir = dirOf(lang);
  const primary = link(lang, f.hero.primaryCta, tokens);
  const secondary = link(lang, f.hero.secondaryCta, tokens);
  return (
    <Shell env={env} path="/features" currentId="features">
      <section className="relative overflow-hidden border-b border-border" aria-labelledby="features-title">
        <div aria-hidden className="mk-hero-ground pointer-events-none absolute inset-0" />
        <Container className="relative grid items-center gap-10 py-14 lg:grid-cols-12 lg:gap-12 lg:py-20">
          <div className="lg:col-span-7">
            <SectionHeading
              id="features-title"
              level={1}
              eyebrow={f.hero.eyebrow ? fill(f.hero.eyebrow, tokens) : undefined}
              title={fill(f.hero.title, tokens)}
              lead={f.hero.lead ? fill(f.hero.lead, tokens) : undefined}
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={primary.href} signedIn={primary.signedIn} arrow dir={dir}>
                {primary.label}
              </ButtonLink>
              <ButtonLink href={secondary.href} variant="secondary">
                {secondary.label}
              </ButtonLink>
            </div>
            <nav aria-label={fill(f.hero.title, tokens)} className="mt-10 flex flex-wrap gap-2">
              {f.groups.map((group) => (
                <a
                  key={group.id}
                  href={`#${group.anchor ?? group.id}`}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground/80 hover:border-primary hover:text-primary"
                >
                  {fill(group.title, tokens)}
                </a>
              ))}
            </nav>
          </div>
          <div className="lg:col-span-5">
            <HeroArt name="features" className="mx-auto max-w-md lg:max-w-none" />
          </div>
        </Container>
      </section>

      {f.groups.map((group, index) => {
        const shot = GROUP_SHOTS[group.id];
        const text = (
          <div>
            <SectionHeading
              id={`${group.id}-title`}
              eyebrow={group.eyebrow ? fill(group.eyebrow, tokens) : undefined}
              title={fill(group.title, tokens)}
              lead={group.lead ? fill(group.lead, tokens) : undefined}
            />
            <ul className="mt-8 space-y-3">
              {group.points.map((point) => (
                <li key={point} className="flex gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-success" aria-hidden strokeWidth={2.25} />
                  <span className="leading-relaxed">{fill(point, tokens)}</span>
                </li>
              ))}
            </ul>
            {group.note ? (
              <p className="mt-6 rounded-lg border border-border bg-surface p-4 leading-relaxed">{fill(group.note, tokens)}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-6">
              {GROUP_PAGE[group.id] ? (
                <MoreLink href={productPagePath(lang, GROUP_PAGE[group.id])} dir={dir}>
                  {content.chrome.productPages.find((p) => p.id === GROUP_PAGE[group.id])?.moreLabel}
                </MoreLink>
              ) : null}
              {group.learnMore ? <LearnMore lang={lang} value={group.learnMore} tokens={tokens} /> : null}
            </div>
          </div>
        );
        return (
          <Section key={group.id} id={group.anchor ?? group.id} labelledBy={`${group.id}-title`} className={index > 0 ? 'border-t border-border' : undefined}>
            {shot ? (
              <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                <div className={index % 2 ? 'lg:order-2' : undefined}>{text}</div>
                <div className={index % 2 ? 'lg:order-1' : undefined}>
                  <Screenshot name={shot} lang={lang} alt={fill(group.title, tokens)} demoLabel={content.chrome.demoLabel} />
                </div>
              </div>
            ) : (
              text
            )}
          </Section>
        );
      })}

      <Section labelledBy="product-pages-title" className="border-t border-border">
        <SectionHeading
          id="product-pages-title"
          eyebrow={f.productPages.eyebrow ? fill(f.productPages.eyebrow, tokens) : undefined}
          title={fill(f.productPages.title, tokens)}
          lead={f.productPages.lead ? fill(f.productPages.lead, tokens) : undefined}
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {content.chrome.productPages.map((item) => (
            <li key={item.id}>
              <a href={productPagePath(lang, item.id)} className="mk-card block h-full p-5 hover:border-primary">
                <span className="flex items-center justify-between gap-2 font-semibold text-foreground">
                  {item.label}
                  {dir === 'rtl' ? (
                    <ArrowLeft className="size-4 shrink-0 text-primary" aria-hidden strokeWidth={1.75} />
                  ) : (
                    <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden strokeWidth={1.75} />
                  )}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">{item.description}</span>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand
        title={fill(f.closing.title, tokens)}
        body={f.closing.lead ? fill(f.closing.lead, tokens) : undefined}
        primary={link(lang, f.closing.primaryCta, tokens)}
        secondary={f.closing.secondaryCta ? link(lang, f.closing.secondaryCta, tokens) : undefined}
        dir={dir}
      />
    </Shell>
  );
}

function featuresPage(lang: MarketingLang): MarketingPageDef {
  return {
    id: 'features',
    lang,
    path: localePath(lang, '/features'),
    file: lang === 'ar' ? 'ar/features/index.html' : 'features/index.html',
    inSitemap: true,
    head: (ctx) => {
      const env = pageEnv(lang, ctx);
      return seoHead(env, 'features', '/features', [
        webPage(env, '/features', fill(env.content.seo.features.ogTitle, env.tokens)),
        breadcrumb(env, [{ name: env.content.chrome.breadcrumbs.product, path: '/features' }]),
      ]);
    },
    render: (ctx) => <FeaturesPage env={pageEnv(lang, ctx)} />,
  };
}

export const FEATURES_PAGES = [featuresPage('en'), featuresPage('ar')] as const;
