/**
 * Page chrome: document body wrapper, header (with a <details> product menu
 * and mobile drawer that work without JS), footer, logo and theme toggle.
 */
import type { ReactNode } from 'react';
import { ChevronDown, Menu, Monitor, Moon, Sun } from 'lucide-react';
import type { MarketingContent, MarketingProductPageId } from '../content/content.types';
import type { MarketingLang } from '../types';
import { fill, link, type Tokens } from '../lib/copy';
import { docsHref, localePath } from '../lib/site';
import { Container } from './ui';

/** Logo mark path (owner-approved, 20 Oct 2026), viewBox from public/brand/atlas-mark.svg. */
const MARK_VIEWBOX = '433.5 431.2 1180.9 1180.9';
const MARK_PATH =
  'M 1011.45 595.394 C 1037.12 593.403 1062.92 597.028 1087.04 606.019 C 1118.36 617.525 1145.76 637.686 1166.06 664.157 C 1182.65 685.727 1193.8 712.918 1205.32 737.766 L 1239.97 812.462 L 1354.97 1057.94 C 1278.62 1024.44 1210.97 1024.33 1134.1 1054.02 C 1098.24 975.997 1062.88 897.745 1028 819.273 C 1026.33 815.581 1025.15 813.332 1023.1 809.835 C 986.041 890.859 949.419 972.082 913.239 1053.5 C 830.846 1024.04 774.414 1024.55 693.079 1057.99 C 707.682 1029.65 722.767 994.85 736.474 965.719 L 822.043 784.552 C 865.6 692.472 891.638 606.038 1011.45 595.394 z M 690.045 999.268 L 690.928 999.38 C 691.771 1001.65 644.231 1101 639.031 1112.57 C 701.943 1081.63 774.753 1054.82 845.589 1068.28 C 921.258 1082.65 981.303 1127.49 1024.47 1189.94 C 1061.85 1136.88 1101.38 1102.6 1163.4 1079.07 C 1249.76 1046.31 1331.33 1075.17 1410.41 1112.39 C 1394.23 1075.01 1375.32 1035.65 1357.88 998.699 C 1380.99 1003.65 1403.96 1009.25 1426.76 1015.48 C 1452.13 1066.91 1502.07 1168.35 1530.42 1225.45 C 1530.31 1225.89 1530.19 1226.34 1530.07 1226.79 L 1527.57 1226.01 C 1503.33 1213.02 1478.11 1203.79 1453.21 1192.74 C 1314.56 1131.22 1084.3 1153.31 1023.89 1316.6 C 1021.49 1308.16 1018.41 1299.93 1014.68 1291.99 C 988.972 1237.41 933.651 1201.52 878.444 1182.04 C 777.971 1146.58 682.949 1156.84 585.732 1196.54 C 562.249 1206.12 539.942 1217.03 517.044 1227.99 C 527.147 1209.6 536.378 1188.77 546.094 1169.91 C 572.17 1119.3 596.416 1065.93 622.842 1015.67 C 643.749 1009.21 668.583 1003.51 690.045 999.268 z M 732.781 1193.58 C 771.779 1191.46 805.655 1194.95 843.594 1202.72 L 779.081 1345.18 C 763.409 1379.88 747.007 1414.87 731.741 1449.69 L 606.5 1449.78 L 496.765 1450.01 C 507.769 1425.32 521.478 1398.36 533.319 1373.69 L 608.674 1217.73 C 646.493 1203.44 692.543 1195.6 732.781 1193.58 z M 1277.68 1193.44 C 1322.41 1188.53 1397.5 1202.57 1439.64 1217.7 L 1551.17 1449.78 L 1480.63 1449.76 L 1317.37 1449.86 C 1280.7 1366.96 1243.38 1284.36 1205.41 1202.05 C 1232.29 1197 1250.53 1194.74 1277.68 1193.44 z';

export function AtlasMark({ className }: { className?: string }) {
  return (
    <svg viewBox={MARK_VIEWBOX} className={className} aria-hidden focusable="false">
      <path fill="currentColor" d={MARK_PATH} />
    </svg>
  );
}

export function Logo({ lang, brand, label }: { lang: MarketingLang; brand: string; label?: string }) {
  return (
    <a
      href={localePath(lang, '/')}
      className="flex min-h-11 items-center gap-2 rounded-md text-foreground"
      aria-label={label ?? brand}
    >
      <AtlasMark className="size-8 text-primary" />
      <span className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
        {brand}
      </span>
    </a>
  );
}

/** Theme toggle: three buttons; `client/main.ts` wires them and stores the choice. */
function ThemeToggle({ copy }: { copy: MarketingContent['chrome']['theme'] }) {
  const options = [
    { value: 'light', label: copy.light, Icon: Sun },
    { value: 'dark', label: copy.dark, Icon: Moon },
    { value: 'system', label: copy.system, Icon: Monitor },
  ] as const;
  return (
    <div
      role="group"
      aria-label={copy.label}
      className="inline-flex rounded-full border border-border bg-surface p-0.5"
    >
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

/** M1b — the product page of a topic, in the page language. */
export function productPagePath(lang: MarketingContent['lang'], id: MarketingProductPageId): string {
  return localePath(lang, `/features/${id}`);
}

function ProductSectionList({ content }: { content: MarketingContent }) {
  return (
    <ul className="mt-1 border-t border-border pt-1">
      {content.chrome.productPages.map((item) => (
        <li key={item.id}>
          <a href={productPagePath(content.lang, item.id)} className="block rounded-lg p-3 hover:bg-surface">
            <span className="block font-medium text-foreground">{item.label}</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">{item.description}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function Header({
  content,
  tokens,
  altPath,
  currentId,
}: {
  content: MarketingContent;
  tokens: Tokens;
  /** The same page in the other language (real link, works without JS). */
  altPath: string;
  currentId?: string;
}) {
  const lang = content.lang;
  const h = content.chrome.header;
  const sw = content.chrome.languageSwitch;
  const nav = [
    { id: 'pricing', label: h.pricing, href: localePath(lang, '/pricing') },
    { id: 'security', label: h.security, href: localePath(lang, '/security') },
    { id: 'contact', label: h.contact, href: localePath(lang, '/contact') },
    { id: 'help', label: h.help, href: docsHref(lang, '/') },
  ];
  const trial = link(lang, content.chrome.ctas.trial, tokens);
  const trialShort = link(lang, content.chrome.ctas.trialShort, tokens);
  const signIn = link(lang, content.chrome.ctas.signIn, tokens);
  // DL-63 — swapped in by the client script when the signed-in hint exists.
  const dashboard = link(lang, content.chrome.ctas.goToDashboard, tokens);
  const dashboardShort = link(lang, content.chrome.ctas.goToDashboardShort, tokens);
  const authCta = {
    'data-auth-cta': '',
    'data-signed-in-href': dashboard.href,
    'data-signed-in-label': dashboard.label,
  };
  const overview = localePath(lang, '/features');

  return (
    <header
      className="sticky top-0 z-50 h-layout-header border-b border-transparent bg-background/90 transition-colors data-[scrolled=true]:border-border"
      data-header
    >
      <Container className="flex h-full items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo lang={lang} brand={content.brand.name} label={h.homeLabel} />
          <nav aria-label={h.navLabel} className="hidden items-center gap-1 lg:flex">
            <details className="mk-menu relative">
              <summary className="inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-[0.95rem] font-medium text-foreground/80 hover:text-foreground">
                {h.product}
                <ChevronDown className="size-4" aria-hidden strokeWidth={1.75} />
              </summary>
              <div className="absolute start-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-popover p-2 shadow-lg">
                <a
                  href={overview}
                  className="block rounded-lg p-3 hover:bg-surface"
                  aria-current={currentId === 'features' ? 'page' : undefined}
                >
                  <span className="block font-semibold text-foreground">{h.productOverview.label}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {h.productOverview.description}
                  </span>
                </a>
                <ProductSectionList content={content} />
              </div>
            </details>
            {nav.map((item) => (
              <a
                key={item.id}
                href={item.href}
                aria-current={currentId === item.id ? 'page' : undefined}
                className="inline-flex min-h-11 items-center rounded-md px-3 text-[0.95rem] font-medium text-foreground/80 hover:text-foreground aria-[current=page]:text-primary"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden xl:block">
            <ThemeToggle copy={content.chrome.theme} />
          </div>
          <a
            href={altPath}
            hrefLang={sw.targetLang}
            lang={sw.targetLang}
            aria-label={sw.targetAccessibleName}
            className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <span className="hidden sm:inline">{sw.targetName}</span>
            <span className="sm:hidden">{sw.targetShort}</span>
          </a>
          {/*
            DL-63 — signed out: "Sign in" and the trial button. Signed in (the
            `atlas_signed_in` hint, read by `client/app-handoff.ts`): one
            primary "Open dashboard" button instead; nothing to start.
          */}
          <a
            href={signIn.href}
            data-signed-out-only
            className="hidden min-h-11 items-center rounded-md px-3 text-[0.95rem] font-medium text-foreground/80 hover:text-foreground lg:inline-flex"
          >
            {signIn.label}
          </a>
          <a href={trial.href} data-mkt-cta="cta_t" data-signed-out-only className="mk-btn mk-btn-primary hidden px-4 text-sm sm:inline-flex">
            {trial.label}
          </a>
          <a href={trialShort.href} data-mkt-cta="cta_t" data-signed-out-only className="mk-btn mk-btn-primary px-3 text-sm sm:hidden" aria-label={trial.label}>
            {trialShort.label}
          </a>
          <a href={dashboard.href} data-signed-in-only className="mk-btn mk-btn-primary px-3 text-sm sm:px-4">
            <span className="hidden sm:inline">{dashboard.label}</span>
            <span className="sm:hidden">{dashboardShort.label}</span>
          </a>
          <details className="mk-menu lg:hidden" data-drawer>
            <summary
              className="inline-flex size-11 items-center justify-center rounded-lg border border-border"
              aria-label={h.menuOpen}
            >
              <Menu className="size-5" aria-hidden strokeWidth={1.75} />
            </summary>
            <div className="fixed inset-x-0 bottom-0 top-layout-header z-50 overflow-y-auto border-t border-border bg-background">
              <Container className="py-6">
                <nav aria-label={h.menuLabel}>
                  <ul className="space-y-1 text-lg">
                    <li>
                      <a href={overview} className="block rounded-lg px-3 py-3 font-semibold">
                        {h.productOverview.label}
                      </a>
                      <ul className="ms-3 border-s border-border ps-2 text-base">
                        {content.chrome.productPages.map((item) => (
                          <li key={item.id}>
                            <a
                              href={productPagePath(lang, item.id)}
                              aria-current={currentId === item.id ? 'page' : undefined}
                              className="block rounded-lg px-3 py-2.5 text-muted-foreground aria-[current=page]:text-primary"
                            >
                              {item.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </li>
                    {[...nav, { id: 'about', label: h.about, href: localePath(lang, '/about') }].map((item) => (
                      <li key={item.id}>
                        <a
                          href={item.href}
                          aria-current={currentId === item.id ? 'page' : undefined}
                          className="block rounded-lg px-3 py-3 font-medium aria-[current=page]:text-primary"
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                    <li>
                      <a href={signIn.href} {...authCta} className="block rounded-lg px-3 py-3 font-medium">
                        {signIn.label}
                      </a>
                    </li>
                  </ul>
                  <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-6">
                    <span className="text-sm text-muted-foreground">{content.chrome.theme.label}</span>
                    <ThemeToggle copy={content.chrome.theme} />
                  </div>
                </nav>
              </Container>
            </div>
          </details>
        </div>
      </Container>
    </header>
  );
}

export function Footer({
  content,
  tokens,
  enPath,
  arPath,
}: {
  content: MarketingContent;
  tokens: Tokens;
  enPath: string;
  arPath: string;
}) {
  const lang = content.lang;
  const f = content.chrome.footer;
  return (
    <footer className="border-t border-border bg-surface" aria-label={f.label}>
      <Container className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(5,1fr)]">
          <div className="max-w-xs">
            <Logo lang={lang} brand={content.brand.name} label={content.chrome.header.homeLabel} />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{fill(f.blurb, tokens)}</p>
          </div>
          {f.columns.map((column) => (
            <div key={column.title}>
              <h2 className="text-sm font-semibold text-foreground">{column.title}</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {column.links.map((item) => {
                  const resolved = link(lang, item, tokens);
                  return (
                    <li key={item.label}>
                      <a href={resolved.href} className="text-muted-foreground hover:text-foreground">
                        {resolved.label}
                      </a>
                    </li>
                  );
                })}
                {column.products ? (
                  <li>
                    <ul className="space-y-3">
                      {content.chrome.productPages.map((item) => (
                        <li key={item.id}>
                          <a
                            href={productPagePath(lang, item.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : null}
              </ul>
            </div>
          ))}
          <div>
            <h2 className="text-sm font-semibold text-foreground">{content.chrome.languageSwitch.columnTitle}</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a href={enPath} hrefLang="en" lang="en" className="text-muted-foreground hover:text-foreground">
                  English
                </a>
              </li>
              <li>
                <a href={arPath} hrefLang="ar" lang="ar" className="text-muted-foreground hover:text-foreground">
                  العربية
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
          {fill(f.copyright, tokens)}
        </p>
      </Container>
    </footer>
  );
}

/** Whole page body: skip link, header, main, footer. */
export function PageShell({
  content,
  tokens,
  enPath,
  arPath,
  currentId,
  children,
}: {
  content: MarketingContent;
  tokens: Tokens;
  enPath: string;
  arPath: string;
  currentId?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="mk-skip">
        {content.chrome.skipToContent}
      </a>
      <Header
        content={content}
        tokens={tokens}
        altPath={content.lang === 'ar' ? enPath : arPath}
        currentId={currentId}
      />
      <main id="main" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <Footer content={content} tokens={tokens} enPath={enPath} arPath={arPath} />
      <AppHandoff content={content} />
    </div>
  );
}

/**
 * DL-63 — the screen shown while a link opens the dashboard host (shown by
 * `client/app-handoff.ts`; hidden, and inert, without JavaScript).
 */
function AppHandoff({ content }: { content: MarketingContent }) {
  const copy = content.chrome.appHandoff;
  return (
    <div
      id="mk-app-handoff"
      hidden
      role="status"
      aria-live="polite"
      data-text-dashboard={copy.dashboard}
      data-text-sign-in={copy.signIn}
      data-text-sign-up={copy.signUp}
      className="mk-app-handoff fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-background text-foreground"
    >
      <img src="/brand/atlas-mark-color.svg" alt="" width={64} height={64} className="size-16 dark:brightness-0 dark:invert" />
      <span className="mk-app-handoff-ring" aria-hidden />
      <p data-handoff-text className="text-base font-medium" />
    </div>
  );
}
