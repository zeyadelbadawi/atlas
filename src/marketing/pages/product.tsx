/**
 * M1b product pages `/features/<id>` · `/ar/features/<id>` (IA §3.3–3.7):
 * a hero with the page's own illustration, one block per question with a
 * quotable answer, real screenshots where one exists, the honest limits in
 * their own block, links to sibling pages and back to the product overview,
 * and the shared closing call to action.
 */
import { Check, Minus } from 'lucide-react';
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

export const PRODUCT_PAGE_IDS: readonly MarketingProductPageId[] = [
  'academy-website',
  'payments',
  'content-protection',
  'teams-and-academies',
  'quizzes-and-certificates',
];

/** Real captures (marketing/launch-kits/assets/screenshots) per page and section. */
const SECTION_SHOTS: Record<MarketingProductPageId, Partial<Record<string, ScreenshotKey>>> = {
  'academy-website': { editor: 'website-editor', designs: 'academy-site-home', 'languages-and-domain': 'academy-site-course' },
  payments: { methods: 'payment-methods', review: 'payments-review' },
  'content-protection': { lessons: 'course-builder' },
  'teams-and-academies': { academies: 'students-list' },
  'quizzes-and-certificates': { quizzes: 'quiz-builder' },
};

function ProductPage({ env, id }: { env: PageEnv; id: MarketingProductPageId }) {
  const { content, tokens, lang } = env;
  const page = content.product[id];
  const dir = dirOf(lang);
  const primary = link(lang, page.hero.primaryCta, tokens);
  const secondary = link(lang, page.hero.secondaryCta, tokens);
  const closing = content.features.closing;
  const pageLinks = content.chrome.productPages;
  return (
    <Shell env={env} path={`/features/${id}`} currentId={id}>
      <section className="relative overflow-hidden border-b border-border" aria-labelledby="product-title">
        <div aria-hidden className="mk-hero-ground pointer-events-none absolute inset-0" />
        <Container className="relative grid items-center gap-10 py-14 lg:grid-cols-12 lg:gap-12 lg:py-20">
          <div className="lg:col-span-7">
            <nav aria-label={content.chrome.breadcrumbs.product} className="mb-4 text-sm">
              <a href={localePath(lang, '/features')} className="font-medium text-muted-foreground hover:text-primary">
                {content.chrome.header.productOverview.label}
              </a>
            </nav>
            <SectionHeading
              id="product-title"
              level={1}
              eyebrow={page.hero.eyebrow ? fill(page.hero.eyebrow, tokens) : undefined}
              title={fill(page.hero.title, tokens)}
              lead={page.hero.lead ? fill(page.hero.lead, tokens) : undefined}
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={primary.href} signedIn={primary.signedIn} arrow dir={dir}>
                {primary.label}
              </ButtonLink>
              <ButtonLink href={secondary.href} variant="secondary">
                {secondary.label}
              </ButtonLink>
            </div>
          </div>
          <div className="lg:col-span-5">
            <HeroArt name={id} className="mx-auto max-w-md lg:max-w-none" />
          </div>
        </Container>
      </section>

      {page.sections.map((section, index) => {
        const shot = SECTION_SHOTS[id][section.id];
        const text = (
          <div>
            <SectionHeading id={`${section.id}-title`} title={fill(section.title, tokens)} lead={section.lead ? fill(section.lead, tokens) : undefined} />
            <ul className="mt-8 space-y-3">
              {section.points.map((point) => (
                <li key={point} className="flex gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-success" aria-hidden strokeWidth={2.25} />
                  <span className="leading-relaxed">{fill(point, tokens)}</span>
                </li>
              ))}
            </ul>
            {section.note ? (
              <p className="mt-6 rounded-lg border border-border bg-surface p-4 leading-relaxed">{fill(section.note, tokens)}</p>
            ) : null}
            {section.learnMore ? <LearnMore lang={lang} value={section.learnMore} tokens={tokens} /> : null}
          </div>
        );
        return (
          <Section key={section.id} id={section.id} labelledBy={`${section.id}-title`} className={index > 0 ? 'border-t border-border' : undefined}>
            {shot ? (
              <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                <div className={index % 2 ? 'lg:order-2' : undefined}>{text}</div>
                <div className={index % 2 ? 'lg:order-1' : undefined}>
                  <Screenshot name={shot} lang={lang} alt={fill(section.title, tokens)} demoLabel={content.chrome.demoLabel} />
                </div>
              </div>
            ) : (
              <div className="max-w-3xl">{text}</div>
            )}
          </Section>
        );
      })}

      <Section id="limits" labelledBy="limits-title" className="border-t border-border">
        <div className="max-w-3xl rounded-xl border border-border bg-surface p-6 sm:p-8">
          <SectionHeading id="limits-title" title={fill(page.limits.title, tokens)} lead={page.limits.lead ? fill(page.limits.lead, tokens) : undefined} />
          <ul className="mt-6 space-y-3">
            {page.limits.items.map((item) => (
              <li key={item} className="flex gap-3">
                <Minus className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden strokeWidth={2.25} />
                <span className="leading-relaxed">{fill(item, tokens)}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section labelledBy="related-title" className="border-t border-border">
        <SectionHeading id="related-title" title={fill(page.relatedTitle, tokens)} />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {page.related.map((relatedId) => {
            const item = pageLinks.find((p) => p.id === relatedId);
            if (!item) return null;
            return (
              <li key={relatedId}>
                <a href={productPagePath(lang, relatedId)} className="mk-card block h-full p-5 hover:border-primary">
                  <span className="block font-semibold text-foreground">{item.label}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{item.description}</span>
                </a>
              </li>
            );
          })}
        </ul>
        <MoreLink href={localePath(lang, '/features')} dir={dir}>
          {content.chrome.header.productOverview.label}
        </MoreLink>
      </Section>

      <CtaBand
        title={fill(closing.title, tokens)}
        body={closing.lead ? fill(closing.lead, tokens) : undefined}
        primary={link(lang, closing.primaryCta, tokens)}
        secondary={closing.secondaryCta ? link(lang, closing.secondaryCta, tokens) : undefined}
        dir={dir}
      />
    </Shell>
  );
}

function productPage(id: MarketingProductPageId, lang: MarketingLang): MarketingPageDef {
  const path = `/features/${id}`;
  return {
    id,
    lang,
    path: localePath(lang, path),
    file: lang === 'ar' ? `ar/features/${id}/index.html` : `features/${id}/index.html`,
    inSitemap: true,
    head: (ctx) => {
      const env = pageEnv(lang, ctx);
      return seoHead(env, id, path, [
        webPage(env, path, fill(env.content.seo[id].ogTitle, env.tokens)),
        breadcrumb(env, [
          { name: env.content.chrome.breadcrumbs.product, path: '/features' },
          { name: env.content.product[id].name, path },
        ]),
      ]);
    },
    render: (ctx) => <ProductPage env={pageEnv(lang, ctx)} id={id} />,
  };
}

export const PRODUCT_PAGES = PRODUCT_PAGE_IDS.flatMap((id) => [productPage(id, 'en'), productPage(id, 'ar')]);
