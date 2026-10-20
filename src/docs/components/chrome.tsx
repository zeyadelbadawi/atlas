/**
 * Help center chrome: header (logo, search, language, theme, back to Atlas),
 * the topics sidebar, breadcrumbs and footer. Everything works without
 * JavaScript (`<details>` for the menus, a GET form for search); the client
 * script only enhances it (instant results, theme memory, `/` shortcut).
 */
import type { ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Menu, Monitor, Moon, Search, Sun, X } from 'lucide-react';
import { AtlasMark } from '@/marketing/components/chrome';
import { DOC_CATEGORIES } from '../categories';
import { DOCS_COPY, fmt } from '../copy';
import { articlePath, categoryPath, localDocsPath } from '../content/parse';
import type { DocArticle, DocLang } from '../types';
import { CategoryIcon } from './icons';

export interface ChromeProps {
  readonly lang: DocLang;
  readonly siteUrl: string;
  /** The same page in the other language. */
  readonly altPath: string;
  /** Articles per category (current language), in display order. */
  readonly nav: ReadonlyMap<string, readonly DocArticle[]>;
  readonly currentCategory?: string;
  readonly currentPath?: string;
  readonly query?: string;
}

/** Atlas app / marketing link in a language (`/pricing` → `/ar/pricing`). */
export function siteHref(siteUrl: string, lang: DocLang, path: string): string {
  const localised = lang === 'ar' ? (path === '/' ? '/ar' : `/ar${path}`) : path;
  return `${siteUrl}${localised}`;
}

export function appHref(siteUrl: string, lang: DocLang, path: string): string {
  return `${siteUrl}${path}${lang === 'ar' ? `${path.includes('?') ? '&' : '?'}lang=ar` : ''}`;
}

export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

function Logo({ lang }: { lang: DocLang }) {
  const c = DOCS_COPY[lang];
  return (
    <a href={localDocsPath(lang, '/')} className="flex min-h-11 shrink-0 items-center gap-2 rounded-md text-foreground" aria-label={c.brand}>
      <AtlasMark className="size-8 text-primary" />
      <span className="flex items-baseline gap-2 font-[family-name:var(--font-display)]">
        <span className="text-lg font-semibold tracking-tight">{lang === 'ar' ? 'أطلس' : 'Atlas'}</span>
        <span className="hidden h-5 w-px self-center bg-border-strong sm:block" aria-hidden />
        <span className="hidden text-lg font-medium text-muted-foreground sm:inline">{c.brandShort}</span>
      </span>
    </a>
  );
}

export function SearchForm({ lang, query, id, large = false }: { lang: DocLang; query?: string; id: string; large?: boolean }) {
  const c = DOCS_COPY[lang].search;
  return (
    <form role="search" action={localDocsPath(lang, '/search')} method="get" className="doc-search relative w-full" data-search-form>
      <label htmlFor={id} className="sr-only">
        {c.label}
      </label>
      <Search className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground ${large ? 'start-4 size-5' : 'start-3 size-4'}`} aria-hidden />
      <input
        id={id}
        name="q"
        type="search"
        defaultValue={query}
        placeholder={c.placeholder}
        autoComplete="off"
        enterKeyHint="search"
        spellCheck={false}
        maxLength={120}
        data-search-input
        aria-autocomplete="list"
        aria-controls={`${id}-results`}
        aria-expanded="false"
        role="combobox"
        className={`doc-search-input w-full rounded-xl border border-border-strong bg-background text-foreground placeholder:text-muted-foreground ${large ? 'h-14 ps-12 pe-4 text-base sm:text-lg' : 'h-11 ps-9 pe-12 text-[0.95rem]'}`}
      />
      {!large && (
        <kbd className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-surface px-1.5 text-xs text-muted-foreground lg:inline" aria-hidden>
          /
        </kbd>
      )}
      <div id={`${id}-results`} className="doc-search-results" role="listbox" aria-label={c.label} hidden data-search-results />
      <button type="submit" className="sr-only">
        {c.submit}
      </button>
    </form>
  );
}

function ThemeToggle({ lang }: { lang: DocLang }) {
  const t = DOCS_COPY[lang].theme;
  const options = [
    { value: 'light', label: t.light, Icon: Sun },
    { value: 'dark', label: t.dark, Icon: Moon },
    { value: 'system', label: t.system, Icon: Monitor },
  ] as const;
  return (
    <div role="group" aria-label={t.label} className="inline-flex rounded-full border border-border bg-surface p-0.5">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          data-theme-value={value}
          aria-pressed={value === 'system' ? 'true' : 'false'}
          title={label}
          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
        >
          <Icon className="size-4" aria-hidden strokeWidth={1.75} />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}

function LanguageLink({ lang, altPath }: { lang: DocLang; altPath: string }) {
  const sw = DOCS_COPY[lang].languageSwitch;
  const other: DocLang = lang === 'en' ? 'ar' : 'en';
  return (
    <a
      href={altPath}
      hrefLang={other}
      lang={other}
      className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-foreground hover:bg-surface"
      title={sw.label}
    >
      {sw.name}
    </a>
  );
}

export function Header(props: ChromeProps) {
  const { lang, siteUrl, altPath, query } = props;
  const c = DOCS_COPY[lang];
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/85" data-header>
      <Container className="flex h-16 items-center gap-3 lg:gap-6">
        <Logo lang={lang} />
        <div className="hidden flex-1 md:block md:max-w-xl">
          <SearchForm lang={lang} query={query} id="header-search" />
        </div>
        <div className="ms-auto flex items-center gap-1 sm:gap-2">
          <details className="doc-popover md:hidden" data-search-popover>
            <summary className="inline-flex size-11 cursor-pointer items-center justify-center rounded-lg text-foreground hover:bg-surface" aria-label={c.search.open}>
              <Search className="size-5" aria-hidden />
            </summary>
            <div className="absolute inset-x-0 top-16 border-b border-border bg-background p-4 shadow-sm">
              <SearchForm lang={lang} query={query} id="mobile-search" />
            </div>
          </details>
          <LanguageLink lang={lang} altPath={altPath} />
          <div className="hidden lg:block">
            <ThemeToggle lang={lang} />
          </div>
          <a href={siteHref(siteUrl, lang, '/')} className="hidden min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:text-foreground lg:inline-flex">
            {c.nav.backToAtlas}
          </a>
          <a href={appHref(siteUrl, lang, '/auth/sign-in')} className="doc-btn doc-btn-primary hidden sm:inline-flex">
            {c.nav.signIn}
          </a>
          <details className="doc-popover lg:hidden" data-menu>
            <summary className="inline-flex size-11 cursor-pointer items-center justify-center rounded-lg text-foreground hover:bg-surface" aria-label={c.nav.mainMenu}>
              <Menu className="size-5 doc-when-closed" aria-hidden />
              <X className="size-5 doc-when-open" aria-hidden />
            </summary>
            <div className="absolute inset-x-0 top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border bg-background p-4 shadow-sm">
              <nav aria-label={c.nav.topics}>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {DOC_CATEGORIES.map((category) => (
                    <li key={category.id}>
                      <a href={categoryPath(lang, category.id)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-[0.95rem] text-foreground hover:bg-surface" aria-current={props.currentCategory === category.id ? 'page' : undefined}>
                        <CategoryIcon name={category.icon} className="size-4 text-primary" />
                        {category.title[lang]}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                <ThemeToggle lang={lang} />
                <a href={siteHref(siteUrl, lang, '/')} className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:text-foreground">
                  {c.nav.backToAtlas}
                </a>
                <a href={appHref(siteUrl, lang, '/auth/sign-in')} className="doc-btn doc-btn-primary sm:hidden">
                  {c.nav.signIn}
                </a>
              </div>
            </div>
          </details>
        </div>
      </Container>
    </header>
  );
}

/** Topics tree: every category, the current one open with its articles. */
export function Sidebar(props: Pick<ChromeProps, 'lang' | 'nav' | 'currentCategory' | 'currentPath'>) {
  const { lang, nav, currentCategory, currentPath } = props;
  const c = DOCS_COPY[lang];
  return (
    <nav aria-label={c.nav.topics} className="doc-sidebar">
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground rtl:tracking-normal">{c.nav.topics}</p>
      <ul className="space-y-0.5">
        {DOC_CATEGORIES.map((category) => {
          const articles = nav.get(category.id) ?? [];
          const open = category.id === currentCategory;
          return (
            <li key={category.id}>
              <details open={open} className="group">
                <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2.5 rounded-lg px-3 text-[0.925rem] font-medium text-foreground hover:bg-surface">
                  <CategoryIcon name={category.icon} className="size-4 shrink-0 text-primary" />
                  <span className="flex-1">{category.title[lang]}</span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <ul className="mb-2 ms-[1.4rem] space-y-0.5 border-s border-border ps-3 pt-1">
                  <li>
                    <a href={categoryPath(lang, category.id)} className="doc-side-link" aria-current={currentPath === categoryPath(lang, category.id) ? 'page' : undefined}>
                      {c.nav.allArticles}
                    </a>
                  </li>
                  {articles.map((article) => {
                    const href = articlePath(article);
                    return (
                      <li key={article.id}>
                        <a href={href} className="doc-side-link" aria-current={href === currentPath ? 'page' : undefined}>
                          {article.title}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Breadcrumbs({ lang, items }: { lang: DocLang; items: readonly { label: string; href?: string }[] }) {
  const c = DOCS_COPY[lang];
  const Chevron = lang === 'ar' ? ChevronLeft : ChevronRight;
  return (
    <nav aria-label={c.nav.breadcrumbs} className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 && <Chevron className="size-3.5" aria-hidden />}
            {item.href ? (
              <a href={item.href} className="rounded hover:text-foreground hover:underline">
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

export function Footer({ lang, siteUrl, buildYear }: { lang: DocLang; siteUrl: string; buildYear: number }) {
  const c = DOCS_COPY[lang];
  const f = c.footer;
  return (
    <footer className="mt-20 border-t border-border bg-surface/60">
      <Container className="grid gap-10 py-12 md:grid-cols-[1.2fr_2fr_1fr_1fr]">
        <div>
          <Logo lang={lang} />
          <p className="mt-3 max-w-[32ch] text-sm leading-relaxed text-muted-foreground">{f.about}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{f.topics}</h2>
          <ul className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {DOC_CATEGORIES.map((category) => (
              <li key={category.id}>
                <a href={categoryPath(lang, category.id)} className="text-muted-foreground hover:text-foreground hover:underline">
                  {category.title[lang]}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{f.atlas}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href={siteHref(siteUrl, lang, '/')} className="text-muted-foreground hover:text-foreground hover:underline">{f.home}</a></li>
            <li><a href={siteHref(siteUrl, lang, '/pricing')} className="text-muted-foreground hover:text-foreground hover:underline">{f.pricing}</a></li>
            <li><a href={siteHref(siteUrl, lang, '/security')} className="text-muted-foreground hover:text-foreground hover:underline">{f.security}</a></li>
            <li><a href={siteHref(siteUrl, lang, '/contact')} className="text-muted-foreground hover:text-foreground hover:underline">{f.contact}</a></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{f.legal}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href={siteHref(siteUrl, lang, '/privacy-policy')} className="text-muted-foreground hover:text-foreground hover:underline">{f.privacy}</a></li>
            <li><a href={siteHref(siteUrl, lang, '/terms')} className="text-muted-foreground hover:text-foreground hover:underline">{f.terms}</a></li>
          </ul>
        </div>
      </Container>
      <Container className="border-t border-border py-6 text-sm text-muted-foreground">
        <p>{fmt(f.rights, { year: new Intl.NumberFormat(c.locale, { useGrouping: false }).format(buildYear) })}</p>
      </Container>
    </footer>
  );
}

export function Shell(props: ChromeProps & { readonly children: ReactNode; readonly buildYear: number; readonly withSidebar?: boolean }) {
  const { lang, children, withSidebar = true } = props;
  const c = DOCS_COPY[lang];
  return (
    <>
      <a href="#main" className="doc-skip">
        {c.skip}
      </a>
      <Header {...props} />
      <Container className={withSidebar ? 'lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10' : ''}>
        {withSidebar && (
          <aside className="hidden lg:block">
            <div className="sticky top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto py-8 pe-2">
              <Sidebar {...props} />
            </div>
          </aside>
        )}
        <main id="main" tabIndex={-1} className="min-w-0 py-8 outline-none lg:py-10">
          {children}
        </main>
      </Container>
      <Footer lang={lang} siteUrl={props.siteUrl} buildYear={props.buildYear} />
    </>
  );
}
