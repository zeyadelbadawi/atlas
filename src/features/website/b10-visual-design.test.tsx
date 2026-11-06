/**
 * B10 (UX audit) — the website themes' visual design, the parts a DOM test
 * can hold (the rest is CSS, checked in the browser QA run):
 *
 *   - V01/V02 every face of a theme family declares one weight range, so
 *     Chromium keeps them one family split by `unicode-range` (a family
 *     whose faces disagree renders one script in a system font);
 *   - V03 the desktop header: links never break, the navigation keeps its
 *     width, and Atelier and Manara show it from 1280 px (the menu below);
 *   - V06 each theme's auth frame names the scope its form styles hang on;
 *   - V09 every Arabic line-height rule applies only where text runs right
 *     to left, without gaining weight;
 *   - V22 the strip under a theme footer continues the footer's own ground.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType, ReactNode } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import { WebsiteThemeScope } from './renderer/WebsiteThemeScope';
import { PublicWebsiteLocaleProvider } from './renderer/PublicWebsiteLocaleContext';
import { WebsiteChrome } from './renderer/WebsiteChrome';
import { getWebsiteTheme } from './themes/website-theme.registry';
import { ModernEducationHeader } from './modern-education/ModernEducationHeader';
import { ModernEducationAuthFrame } from './modern-education/ModernEducationAuthFrame';
import { AtelierAuthFrame, AtelierHeader } from './atelier/chrome';
import { ManaraAuthFrame, ManaraHeader } from './manara/chrome';
import { RiwaqAuthFrame, RiwaqHeader } from './riwaq/chrome';
import type { WebsiteHeaderProps } from './renderer/WebsiteHeader';
import type { WebsiteLinkRenderer } from './renderer/website-link-renderer.types';
import type { ThemeAuthFrameProps } from './theme-packs/theme-pack.types';
import type { WebsiteThemeKey, WebsitePage } from '@types';

vi.mock('@/shared/hooks/useAcademyIdentity', () => ({
  useAcademyIdentity: () => ({ data: {} }),
}));
vi.mock('@/shared/hooks/usePublicCourseCategories', () => ({
  usePublicCourseCategories: () => ({ data: [], isLoading: false }),
}));

const lt = (en: string, ar = '') => ({ en, ar });
const PAGES = [
  { id: 'p-home', coreType: 'home', slug: 'home', title: 'Home' },
  { id: 'p-courses', coreType: 'courses', slug: 'courses', title: 'Courses' },
] as unknown as WebsitePage[];

const HEADER: WebsiteHeaderProps = {
  academyName: 'Web Development Academy',
  navigation: [
    { id: 'n1', label: lt('About', 'من نحن'), pageId: 'p-home', order: 0 },
    {
      id: 'n2',
      label: lt('Courses', 'الدورات'),
      pageId: 'p-courses',
      order: 1,
    },
  ] as WebsiteHeaderProps['navigation'],
  pages: PAGES,
  header: {},
  activePageId: 'p-courses',
  onNavigate: () => undefined,
};

const linkRenderer: WebsiteLinkRenderer = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

function wrap(theme: WebsiteThemeKey, children: ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={createI18nInstance('en')}>
        <MemoryRouter>
          <WebsiteThemeScope theme={getWebsiteTheme(theme)}>
            <PublicWebsiteLocaleProvider locale="en">
              {children}
            </PublicWebsiteLocaleProvider>
          </WebsiteThemeScope>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView ??= () => undefined;
});
afterEach(cleanup);

const css = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');

describe('V01/V02 theme font families', () => {
  /**
   * `font-weight` and `unicode-range` of every `@font-face`, grouped by
   * family and style.
   */
  function faces(
    source: string
  ): Map<string, { weights: Set<string>; ranges: Set<string> }> {
    const families = new Map<
      string,
      { weights: Set<string>; ranges: Set<string> }
    >();
    for (const [, body] of source.matchAll(/@font-face\s*{([^}]*)}/g)) {
      const family = /font-family:\s*([^;]+);/.exec(body)?.[1].trim();
      const weight = /font-weight:\s*([^;]+);/.exec(body)?.[1].trim();
      const style = /font-style:\s*([^;]+);/.exec(body)?.[1].trim() ?? '';
      const range =
        /unicode-range:\s*([^;]+);/.exec(body)?.[1].replace(/\s+/g, ' ') ?? '';
      if (!family || !weight) continue;
      const key = `${family} ${style}`;
      const entry = families.get(key) ?? {
        weights: new Set<string>(),
        ranges: new Set<string>(),
      };
      entry.weights.add(weight);
      entry.ranges.add(range);
      families.set(key, entry);
    }
    return families;
  }

  // Chromium groups a family's faces by their descriptors before
  // `unicode-range`: faces that split a family by script must declare the
  // same weight range, or one script never gets its face. A family of one
  // script (Riwaq's Arabic, B10 V29) may hold several weights.
  it.each([
    ['atelier/atelier.css', "'Atelier Display' normal"],
    ['manara/manara.css', "'Manara Display' normal"],
    ['riwaq/riwaq.css', "'Riwaq Sans' normal"],
  ])('%s: every face of %s declares the same weight range', (file, key) => {
    const families = faces(css(file));
    expect(families.get(key)?.weights.size).toBe(1);
    for (const [family, { weights, ranges }] of families) {
      if (ranges.size > 1) expect(weights.size, family).toBe(1);
    }
  });

  it("riwaq/riwaq.css: Arabic in its own family, in Plex Sans Arabic's own weights", () => {
    const families = faces(css('riwaq/riwaq.css'));
    expect(families.get("'Riwaq Sans Arabic' normal")).toEqual({
      weights: new Set(['100 450', '451 600', '601 700']),
      ranges: expect.any(Set),
    });
    expect(families.get("'Riwaq Sans Arabic' normal")?.ranges.size).toBe(1);
    expect(css('riwaq/riwaq.css')).toMatch(
      /--rw-font:\s*'Riwaq Sans', 'Riwaq Sans Arabic',/
    );
  });
});

describe('V03 desktop header', () => {
  const HEADERS: readonly [
    WebsiteThemeKey,
    ComponentType<WebsiteHeaderProps>,
    'lg' | 'xl',
  ][] = [
    ['modern-education', ModernEducationHeader, 'lg'],
    ['atelier', AtelierHeader, 'xl'],
    ['manara', ManaraHeader, 'xl'],
  ];

  it.each(HEADERS)(
    '%s: the bar keeps the navigation one line and shows it from its breakpoint',
    (theme, Header, breakpoint) => {
      wrap(theme, <Header {...HEADER} linkRenderer={linkRenderer} />);
      const nav = screen.getAllByRole('navigation', { name: 'Main' })[0];
      expect(nav.className).toContain(`${breakpoint}:block`);
      // The navigation keeps its width; the name takes the squeeze. Past
      // half the bar the list may still wrap rather than run off the edge.
      expect(nav.className).toContain('shrink-0');
      expect(nav.className).toContain('max-w-[50%]');
      expect(nav.className).not.toContain('min-w-0');
      const menu = screen.getByRole('button', { name: 'Open menu' });
      expect(menu.closest(`.${breakpoint}\\:hidden`)).toBeTruthy();
    }
  );

  it('Theme 1: a navigation link never breaks inside its label', () => {
    wrap(
      'modern-education',
      <ModernEducationHeader {...HEADER} linkRenderer={linkRenderer} />
    );
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0];
    for (const link of nav.querySelectorAll('a')) {
      expect(link.className).toContain('whitespace-nowrap');
    }
  });

  it('Riwaq keeps its own masthead classes (the rules are in riwaq-pages.css)', () => {
    wrap('riwaq', <RiwaqHeader {...HEADER} linkRenderer={linkRenderer} />);
    expect(document.querySelector('.rwc-nav-wrap .rwc-nav')).toBeTruthy();
    const rules = css('riwaq/riwaq-pages.css');
    expect(rules).toMatch(
      /\.rwc-nav-wrap\s*{\s*display:\s*block;\s*flex:\s*none;\s*max-inline-size:\s*50%;/
    );
  });
});

describe('V06 auth frames', () => {
  it.each([
    ['modern-education', ModernEducationAuthFrame, '.t1-auth-form'],
    ['atelier', AtelierAuthFrame, '[data-atelier-auth-frame]'],
    ['manara', ManaraAuthFrame, '.mnp-auth-form'],
    ['riwaq', RiwaqAuthFrame, '.rwc-auth-form'],
  ] as const)(
    '%s: the form sits in the scope its theme styles',
    (theme, Frame, scope) => {
      const AuthFrame = Frame as ComponentType<ThemeAuthFrameProps>;
      const { container } = wrap(
        theme,
        <AuthFrame>
          <form aria-label="Sign in">
            <input aria-label="Email" />
          </form>
        </AuthFrame>
      );
      expect(container.querySelector(`${scope} form`)).toBeTruthy();
    }
  );
});

describe('V09 Arabic line heights', () => {
  it.each([
    'atelier/atelier-arabic.css',
    'manara/manara-arabic.css',
    'riwaq/riwaq-arabic.css',
    'modern-education/modern-education.css',
  ])('%s: every :lang(ar) rule but the scope also needs :dir(rtl)', (file) => {
    const code = css(file).replace(/\/\*[\s\S]*?\*\//g, '');
    const uses = [
      ...code.matchAll(/:lang\(ar\)(:where\(\s*:dir\(rtl\)\s*\))?/g),
    ];
    expect(uses.length).toBeGreaterThan(0);
    const bare = uses.filter((match) => !match[1]);
    // Only the theme scope's own running-text rule stays bare.
    expect(bare).toHaveLength(1);
    expect(
      code.slice(Math.max(0, bare[0].index - 80), bare[0].index)
    ).toContain('.website-theme-scope');
  });
});

describe('V22 the strip under a theme footer', () => {
  it("continues the footer's own ground, the soft surface by default", () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <I18nextProvider i18n={createI18nInstance('en')}>
          <MemoryRouter>
            <WebsiteChrome
              academyName="Web Development Academy"
              configuration={{
                themeKey: 'manara',
                brand: {
                  primaryColor: '#1f6feb',
                  secondaryColor: '#0b4fc4',
                  accentColor: '#f59e0b',
                },
                navigation: [],
                header: {},
                footer: { groups: [], socialLinks: [] },
              }}
              pages={PAGES}
              onNavigate={() => undefined}
              linkRenderer={linkRenderer}
            >
              <p>Body</p>
            </WebsiteChrome>
          </MemoryRouter>
        </I18nextProvider>
      </QueryClientProvider>
    );
    const strip = container.querySelector('[data-footer-continuation]')!;
    expect(strip.className).toContain(
      'bg-[var(--website-footer-surface,var(--website-surface))]'
    );
    expect(css('manara/manara.css')).toContain(
      '--website-footer-surface: var(--mn-night);'
    );
  });
});
