/**
 * Privacy policy and terms (`/privacy-policy`, `/terms`, + `/ar/*`) and the
 * branded 404. Legal pages render the SAME `LegalDocument` objects as the
 * in-app pages (single source, parity tests already cover them); the URL
 * selects the language (SPEC §B.5). The 404 is `noindex`, without canonical,
 * hreflang or OG alternates, and links only to home, pricing and contact.
 */
import { PRIVACY_POLICY_AR } from '@/features/legal/content/privacy-policy.ar';
import { PRIVACY_POLICY_EN } from '@/features/legal/content/privacy-policy.en';
import { TERMS_AR } from '@/features/legal/content/terms.ar';
import { TERMS_EN } from '@/features/legal/content/terms.en';
import type { LegalBlock, LegalDocument } from '@/features/legal/content/legal-content.types';
import enLegal from '@/localization/resources/en/legal.json';
import arLegal from '@/localization/resources/ar/legal.json';
import { Container } from '../components/ui';
import { HeroArt } from '../components/hero-art';
import { fill, link } from '../lib/copy';
import { localePath } from '../lib/site';
import type { MarketingLang, MarketingPageDef } from '../types';
import { OG_IMAGE, Shell, breadcrumb, pageEnv, pairPaths, webPage, type PageEnv } from './shared';

const DOCS = {
  'privacy-policy': { en: PRIVACY_POLICY_EN, ar: PRIVACY_POLICY_AR },
  terms: { en: TERMS_EN, ar: TERMS_AR },
} as const;

const LABELS = { en: enLegal, ar: arLegal } as const;

function Block({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case 'paragraph':
      return <p className="leading-relaxed text-muted-foreground">{block.text}</p>;
    case 'list':
      return (
        <ul className="list-disc space-y-2 ps-6 text-muted-foreground">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'definitions':
      return (
        <dl className="space-y-3">
          {block.items.map((item) => (
            <div key={item.term}>
              <dt className="font-medium text-foreground">{item.term}</dt>
              <dd className="mt-1 text-muted-foreground">{item.detail}</dd>
            </div>
          ))}
        </dl>
      );
  }
}

function LegalPage({ env, doc, path, id }: { env: PageEnv; doc: LegalDocument; path: string; id: string }) {
  const labels = LABELS[env.lang];
  return (
    <Shell env={env} path={path} currentId={id}>
      <Container className="py-12 lg:py-16">
        <article className="mx-auto max-w-[70ch]">
          <header className="flex items-center gap-6 border-b border-border pb-6">
            <div className="min-w-0 flex-1 space-y-3">
              <h1 className="mk-heading text-3xl font-semibold text-foreground sm:text-4xl">{doc.title}</h1>
              <p className="text-muted-foreground">{doc.summary}</p>
              <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <div className="flex gap-2">
                  <dt>{labels.effectiveDate}:</dt>
                  <dd>{doc.effectiveDate}</dd>
                </div>
                <div className="flex gap-2">
                  <dt>{labels.lastUpdated}:</dt>
                  <dd>{doc.lastUpdated}</dd>
                </div>
              </dl>
            </div>
            {/* Beside the title from tablet width up; on a phone the text comes first. */}
            <HeroArt name={id === 'terms' ? 'terms' : 'privacy'} sizes="11rem" hiddenOnPhones className="hidden w-44 shrink-0 md:block" />
          </header>
          <nav aria-label={labels.tableOfContents} className="my-8">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{labels.tableOfContents}</h2>
            <ol className="space-y-1">
              {doc.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-sm text-primary underline-offset-4 hover:underline">
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="space-y-10">
            {doc.sections.map((section) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="space-y-4">
                <h2 id={`${section.id}-heading`} className="text-xl font-semibold text-foreground">
                  {section.heading}
                </h2>
                {section.blocks.map((block, index) => (
                  <Block key={index} block={block} />
                ))}
              </section>
            ))}
          </div>
        </article>
      </Container>
    </Shell>
  );
}

function legalPage(id: keyof typeof DOCS, lang: MarketingLang): MarketingPageDef {
  const path = `/${id}`;
  return {
    id,
    lang,
    path: localePath(lang, path),
    file: lang === 'ar' ? `ar/${id}/index.html` : `${id}/index.html`,
    inSitemap: true,
    head: (ctx) => {
      const env = pageEnv(lang, ctx);
      const doc = DOCS[id][lang];
      return {
        title: `${doc.title} | ${env.content.brand.name}`,
        description: doc.summary,
        canonicalPath: localePath(lang, path),
        alternates: pairPaths(path),
        ogImage: OG_IMAGE[lang],
        jsonLd: [webPage(env, path, doc.title), breadcrumb(env, [{ name: doc.title, path }])],
      };
    },
    render: (ctx) => <LegalPage env={pageEnv(lang, ctx)} doc={DOCS[id][lang]} path={path} id={id} />,
  };
}

// ─── 404 ────────────────────────────────────────────────────────────────────

function NotFoundPage({ env }: { env: PageEnv }) {
  const { content, tokens, lang } = env;
  const n = content.notFound;
  return (
    <Shell env={env} path="/">
      <section className="relative overflow-hidden" aria-labelledby="not-found-title">
        <div aria-hidden className="mk-hero-ground pointer-events-none absolute inset-0" />
        <Container className="relative grid min-h-[60svh] items-center gap-10 py-20 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col items-start lg:col-span-7">
            <p className="mk-eyebrow mb-4">{fill(n.eyebrow, tokens)}</p>
            <h1 id="not-found-title" className="mk-heading text-4xl font-semibold text-foreground sm:text-5xl">
              {fill(n.title, tokens)}
            </h1>
            <p className="mt-5 max-w-[56ch] text-lg leading-relaxed text-muted-foreground">{fill(n.body, tokens)}</p>
            <p className="mt-2 max-w-[56ch] text-muted-foreground">{fill(n.plannedHint, tokens)}</p>
            <ul className="mt-8 flex flex-wrap gap-3">
              {n.links.map((item, index) => {
                const resolved = link(lang, item, tokens);
                return (
                  <li key={item.href}>
                    <a href={resolved.href} className={index === 0 ? 'mk-btn mk-btn-primary' : 'mk-btn mk-btn-secondary'}>
                      {resolved.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="lg:col-span-5">
            <HeroArt name="not-found" className="mx-auto max-w-xs lg:max-w-none" />
          </div>
        </Container>
      </section>
    </Shell>
  );
}

function notFoundPage(lang: MarketingLang): MarketingPageDef {
  return {
    id: '404',
    lang,
    path: lang === 'ar' ? '/ar/404' : '/404',
    file: lang === 'ar' ? 'ar/404.html' : '404.html',
    inSitemap: false,
    head: (ctx) => {
      const env = pageEnv(lang, ctx);
      return {
        title: `${fill(env.content.notFound.title, env.tokens)} | ${env.content.brand.name}`,
        description: fill(env.content.notFound.body, env.tokens),
        canonicalPath: localePath(lang, '/404'),
        ogImage: OG_IMAGE[lang],
        robots: 'noindex, follow',
      };
    },
    render: (ctx) => <NotFoundPage env={pageEnv(lang, ctx)} />,
  };
}

export const LEGAL_PAGES = (['en', 'ar'] as const).flatMap((lang) => [
  legalPage('privacy-policy', lang),
  legalPage('terms', lang),
]);

export const NOT_FOUND_PAGES = [notFoundPage('en'), notFoundPage('ar')] as const;
