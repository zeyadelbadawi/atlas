/**
 * Help center page templates (home, category, article, search, 404). Each
 * returns static markup; `prerender/site.ts` wraps it in a document.
 */
import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ListOrdered, ThumbsDown, ThumbsUp } from 'lucide-react';
import { DOC_CATEGORIES, categoryById } from '../categories';
import { DOCS_COPY, fmt, formatCount, formatDocDate } from '../copy';
import { articlePath, categoryPath, localDocsPath } from '../content/parse';
import type { DocArticle, DocHeading, DocLang } from '../types';
import { Breadcrumbs, SearchForm, Shell, appHref, siteHref, type ChromeProps } from '../components/chrome';
import { CategoryIcon } from '../components/icons';

export interface PageEnv extends Omit<ChromeProps, 'altPath'> {
  readonly buildYear: number;
  readonly docsUrl: string;
}

function ContactCta({ lang, env }: { lang: DocLang; env: PageEnv }) {
  const c = DOCS_COPY[lang].contact;
  const ticket = env.nav.get('support')?.find((a) => a.id === 'DOC-SUP-001');
  return (
    <section className="doc-card mt-14 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8" aria-labelledby="contact-cta-title">
      <div>
        <h2 id="contact-cta-title" className="font-[family-name:var(--font-display)] text-xl font-semibold text-foreground">
          {c.title}
        </h2>
        <p className="mt-1 text-muted-foreground">{c.body}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {ticket && (
          <a href={articlePath(ticket)} className="doc-btn doc-btn-primary">
            {c.ticket}
          </a>
        )}
        <a href={siteHref(env.siteUrl, lang, '/contact')} className="doc-btn doc-btn-secondary">
          {c.contact}
        </a>
      </div>
    </section>
  );
}

function ArticleCard({ article, showCategory = false }: { article: DocArticle; showCategory?: boolean }) {
  const category = categoryById(article.category);
  return (
    <li>
      <a href={articlePath(article)} className="doc-card doc-card-link block h-full p-5">
        {showCategory && category && (
          <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
            <CategoryIcon name={category.icon} className="size-3.5" />
            {category.title[article.lang]}
          </span>
        )}
        <span className="block font-[family-name:var(--font-display)] text-[1.05rem] font-semibold leading-snug text-foreground">{article.title}</span>
        <span className="mt-1.5 line-clamp-3 block text-sm leading-relaxed text-muted-foreground">{article.description}</span>
      </a>
    </li>
  );
}

export function HomePage({ lang, env, intro, popular }: { lang: DocLang; env: PageEnv; intro?: ReactNode; popular: readonly DocArticle[] }) {
  const c = DOCS_COPY[lang];
  const featured = DOC_CATEGORIES.filter((cat) => cat.featured);
  return (
    <Shell {...env} lang={lang} altPath={localDocsPath(lang === 'en' ? 'ar' : 'en', '/')} withSidebar={false}>
      <section className="doc-hero -mt-8 rounded-b-3xl px-4 pb-14 pt-14 text-center sm:px-8 lg:-mt-10 lg:pt-20" aria-labelledby="home-title">
        <p className="doc-eyebrow justify-center">{c.home.eyebrow}</p>
        <h1 id="home-title" className="mx-auto mt-3 max-w-[22ch] font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-foreground sm:text-5xl rtl:tracking-normal">
          {c.home.title}
        </h1>
        <p className="mx-auto mt-4 max-w-[56ch] text-lg leading-relaxed text-muted-foreground">{c.home.subtitle}</p>
        <div className="mx-auto mt-8 max-w-2xl text-start">
          <SearchForm lang={lang} id="home-search" large />
        </div>
        {intro && <div className="doc-prose mx-auto mt-6 max-w-2xl text-start text-muted-foreground">{intro}</div>}
      </section>

      <section className="mt-14" aria-labelledby="start-title">
        <h2 id="start-title" className="doc-h2">{c.home.startHere}</h2>
        <ul className="mt-5 grid gap-4 md:grid-cols-3">
          {featured.map((category) => (
            <li key={category.id}>
              <a href={categoryPath(lang, category.id)} className="doc-card doc-card-link flex h-full flex-col gap-3 p-6">
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CategoryIcon name={category.icon} className="size-5" />
                </span>
                <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">{category.title[lang]}</span>
                <span className="text-sm leading-relaxed text-muted-foreground">{category.description[lang]}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14" aria-labelledby="topics-title">
        <h2 id="topics-title" className="doc-h2">{c.home.allTopics}</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DOC_CATEGORIES.filter((cat) => !cat.featured).map((category) => {
            const count = env.nav.get(category.id)?.length ?? 0;
            return (
              <li key={category.id}>
                <a href={categoryPath(lang, category.id)} className="doc-card doc-card-link flex h-full items-start gap-4 p-5">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface text-primary">
                    <CategoryIcon name={category.icon} className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-foreground">{category.title[lang]}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{category.description[lang]}</span>
                    {count > 0 && <span className="mt-2 block text-xs font-medium text-muted-foreground">{formatCount(lang, c.home.articles, count)}</span>}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </section>

      {popular.length > 0 && (
        <section className="mt-14" aria-labelledby="popular-title">
          <h2 id="popular-title" className="doc-h2">{c.home.popular}</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((article) => (
              <ArticleCard key={article.id} article={article} showCategory />
            ))}
          </ul>
        </section>
      )}
      <ContactCta lang={lang} env={env} />
    </Shell>
  );
}

export function CategoryPage({
  lang,
  env,
  categoryId,
  articles,
  intro,
  introArticle,
}: {
  lang: DocLang;
  env: PageEnv;
  categoryId: string;
  articles: readonly DocArticle[];
  intro?: ReactNode;
  introArticle?: DocArticle;
}) {
  const c = DOCS_COPY[lang];
  const category = categoryById(categoryId)!;
  const path = categoryPath(lang, categoryId);
  return (
    <Shell {...env} lang={lang} altPath={categoryPath(lang === 'en' ? 'ar' : 'en', categoryId)} currentCategory={categoryId} currentPath={path}>
      <Breadcrumbs lang={lang} items={[{ label: c.nav.home, href: localDocsPath(lang, '/') }, { label: category.title[lang] }]} />
      <header className="flex items-start gap-4">
        <span className="hidden size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:inline-flex">
          <CategoryIcon name={category.icon} className="size-6" />
        </span>
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-foreground sm:text-4xl rtl:tracking-normal">
            {introArticle?.title ?? category.title[lang]}
          </h1>
          <p className="mt-2 max-w-[65ch] text-lg leading-relaxed text-muted-foreground">{introArticle?.summary ?? category.description[lang]}</p>
          <p className="mt-2 text-sm text-muted-foreground">{formatCount(lang, c.home.articles, articles.length)}</p>
        </div>
      </header>
      {intro && <div className="doc-prose mt-8 max-w-[72ch]">{intro}</div>}
      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </ul>
      <ContactCta lang={lang} env={env} />
    </Shell>
  );
}

function Toc({ lang, headings }: { lang: DocLang; headings: readonly DocHeading[] }) {
  if (headings.length < 2) return null;
  return (
    <nav aria-label={DOCS_COPY[lang].nav.onThisPage} className="doc-toc">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground rtl:tracking-normal">{DOCS_COPY[lang].nav.onThisPage}</p>
      <ul className="mt-3 space-y-1.5 border-s border-border text-sm">
        {headings.map((h) => (
          <li key={h.id}>
            <a href={`#${h.id}`} className="-ms-px block border-s-2 border-transparent ps-3 text-muted-foreground hover:border-primary hover:text-foreground" data-toc-link>
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export interface ArticlePageProps {
  readonly lang: DocLang;
  readonly env: PageEnv;
  readonly article: DocArticle;
  readonly body: ReactNode;
  readonly headings: readonly DocHeading[];
  readonly steps: number;
  readonly related: readonly DocArticle[];
  readonly previous?: DocArticle;
  readonly next?: DocArticle;
  readonly altPath: string;
}

export function ArticlePage(props: ArticlePageProps) {
  const { lang, env, article, body, headings, steps, related, previous, next } = props;
  const c = DOCS_COPY[lang];
  const category = categoryById(article.category)!;
  const path = articlePath(article);
  const Back = lang === 'ar' ? ArrowRight : ArrowLeft;
  const Forward = lang === 'ar' ? ArrowLeft : ArrowRight;
  const siblings = env.nav.get(article.category) ?? [];
  return (
    <Shell {...env} lang={lang} altPath={props.altPath} currentCategory={article.category} currentPath={path}>
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_14rem] xl:gap-10">
        <article className="min-w-0 max-w-[48rem]" data-article-id={article.id}>
          <Breadcrumbs
            lang={lang}
            items={[
              { label: c.nav.home, href: localDocsPath(lang, '/') },
              { label: category.title[lang], href: categoryPath(lang, category.id) },
              { label: article.title },
            ]}
          />
          <details className="doc-card mb-6 lg:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 text-sm font-semibold text-foreground">
              {c.nav.inCategory}: {category.title[lang]}
            </summary>
            <ul className="space-y-0.5 border-t border-border p-2">
              {siblings.map((a) => (
                <li key={a.id}>
                  <a href={articlePath(a)} className="doc-side-link" aria-current={a.id === article.id ? 'page' : undefined}>
                    {a.title}
                  </a>
                </li>
              ))}
            </ul>
          </details>
          <header>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-[2.5rem] rtl:leading-snug rtl:tracking-normal">
              {article.title}
            </h1>
            <p className="doc-answer mt-4 text-lg leading-relaxed text-foreground/85">{article.summary}</p>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="sr-only">{c.article.forAudience}</span>
              {article.audience.map((a) => (
                <span key={a} className="doc-badge">{c.audience[a]}</span>
              ))}
              {steps > 0 && (
                <span className="inline-flex items-center gap-1.5 ps-1">
                  <ListOrdered className="size-4" aria-hidden />
                  {formatCount(lang, c.article.steps, steps)}
                </span>
              )}
              <span className="ps-1">· {fmt(c.article.updated, { date: formatDocDate(lang, article.updated) })}</span>
            </div>
          </header>
          <div className="doc-prose mt-8">{body}</div>

          <section className="doc-helpful mt-12 flex flex-wrap items-center gap-3 border-t border-border pt-6" data-helpful={article.id} aria-labelledby="helpful-q">
            <p id="helpful-q" className="font-semibold text-foreground">{c.helpful.question}</p>
            <div className="flex gap-2" data-helpful-buttons>
              <button type="button" className="doc-btn doc-btn-secondary" data-helpful-answer="yes">
                <ThumbsUp className="size-4" aria-hidden />
                {c.helpful.yes}
              </button>
              <button type="button" className="doc-btn doc-btn-secondary" data-helpful-answer="no">
                <ThumbsDown className="size-4" aria-hidden />
                {c.helpful.no}
              </button>
            </div>
            <p className="text-muted-foreground" role="status" data-helpful-thanks hidden>
              {c.helpful.thanks}
            </p>
          </section>

          {related.length > 0 && (
            <section className="mt-10" aria-labelledby="related-title">
              <h2 id="related-title" className="doc-h2 text-xl">{c.article.related}</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {related.map((a) => (
                  <ArticleCard key={a.id} article={a} showCategory={a.category !== article.category} />
                ))}
              </ul>
            </section>
          )}

          {(previous || next) && (
            <nav className="mt-10 grid gap-3 sm:grid-cols-2" aria-label={`${c.nav.previous} / ${c.nav.next}`}>
              {previous ? (
                <a href={articlePath(previous)} className="doc-card doc-card-link flex flex-col gap-1 p-4">
                  <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><Back className="size-3.5" aria-hidden />{c.nav.previous}</span>
                  <span className="font-semibold text-foreground">{previous.title}</span>
                </a>
              ) : <span />}
              {next && (
                <a href={articlePath(next)} className="doc-card doc-card-link flex flex-col items-end gap-1 p-4 text-end">
                  <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">{c.nav.next}<Forward className="size-3.5" aria-hidden /></span>
                  <span className="font-semibold text-foreground">{next.title}</span>
                </a>
              )}
            </nav>
          )}
          <ContactCta lang={lang} env={env} />
        </article>
        <aside className="hidden xl:block">
          <div className="sticky top-24 py-2">
            <Toc lang={lang} headings={headings} />
          </div>
        </aside>
      </div>
    </Shell>
  );
}

export function SearchPage({ lang, env, popular }: { lang: DocLang; env: PageEnv; popular: readonly DocArticle[] }) {
  const c = DOCS_COPY[lang];
  return (
    <Shell {...env} lang={lang} altPath={localDocsPath(lang === 'en' ? 'ar' : 'en', '/search')}>
      <Breadcrumbs lang={lang} items={[{ label: c.nav.home, href: localDocsPath(lang, '/') }, { label: c.search.resultsTitle }]} />
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-foreground" data-search-heading data-template={c.search.resultsFor}>
        {c.search.resultsTitle}
      </h1>
      <div className="mt-6 max-w-2xl">
        <SearchForm lang={lang} id="page-search" large />
      </div>
      <p className="mt-6 text-muted-foreground" data-search-status role="status" aria-live="polite">
        {c.search.emptyHint}
      </p>
      <ol className="mt-4 space-y-3" data-search-page-results />
      <section className="mt-12" aria-labelledby="search-popular" data-search-popular>
        <h2 id="search-popular" className="doc-h2 text-xl">{c.home.popular}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {popular.map((a) => (
            <ArticleCard key={a.id} article={a} showCategory />
          ))}
        </ul>
      </section>
    </Shell>
  );
}

export function NotFoundPage({ lang, env, popular }: { lang: DocLang; env: PageEnv; popular: readonly DocArticle[] }) {
  const c = DOCS_COPY[lang];
  return (
    <Shell {...env} lang={lang} altPath={localDocsPath(lang === 'en' ? 'ar' : 'en', '/')} withSidebar={false}>
      <section className="mx-auto max-w-2xl py-10 text-center">
        <p className="font-[family-name:var(--font-display)] text-6xl font-semibold text-primary">404</p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold text-foreground">{c.notFound.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{c.notFound.body}</p>
        <div className="mt-8 text-start">
          <SearchForm lang={lang} id="notfound-search" large />
        </div>
        <a href={localDocsPath(lang, '/')} className="doc-btn doc-btn-primary mt-6">
          {c.notFound.home}
        </a>
      </section>
      {popular.length > 0 && (
        <section className="mt-6" aria-labelledby="nf-popular">
          <h2 id="nf-popular" className="doc-h2 text-xl">{c.home.popular}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((a) => (
              <ArticleCard key={a.id} article={a} showCategory />
            ))}
          </ul>
        </section>
      )}
    </Shell>
  );
}

export { appHref };
