/**
 * Atelier chrome: the header's navigation, current-page marker, full-screen
 * menu (focus trap, Escape, focus return, direction), the shared CTA /
 * signed-in rules and hidden-page links; the colophon footer's attribution,
 * Home link, live columns and hidden-page links; the auth frame.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import type { ReactNode } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import { WebsiteThemeScope } from '@/features/website/renderer/WebsiteThemeScope';
import { PublicWebsiteLocaleProvider } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { getWebsiteTheme } from '@/features/website/themes/website-theme.registry';
import type { WebsiteHeaderProps } from '@/features/website/renderer/WebsiteHeader';
import type { WebsiteLinkRenderer } from '@/features/website/renderer/website-link-renderer.types';
import type { PublicWebsiteLocale, WebsiteFooterConfig, WebsitePage } from '@types';
import fragmentEn from '../i18n/pages.en.json';
import fragmentAr from '../i18n/pages.ar.json';
import { ATELIER_CHROME, AtelierAuthFrame, AtelierFooter, AtelierHeader } from '.';

/* ------------------------------------------------------------------ */
/* Live data                                                            */
/* ------------------------------------------------------------------ */

let identity: Record<string, unknown> = {};
let categories: unknown[] = [];
vi.mock('@/shared/hooks/useAcademyIdentity', () => ({
  useAcademyIdentity: () => ({ data: identity }),
}));
vi.mock('@/shared/hooks/usePublicCourseCategories', () => ({
  usePublicCourseCategories: () => ({ data: categories, isLoading: false }),
}));

/* ------------------------------------------------------------------ */
/* Harness                                                              */
/* ------------------------------------------------------------------ */

const lt = (en: string, ar = '') => ({ en, ar });

function i18nFor(locale: PublicWebsiteLocale) {
  const i18n = createI18nInstance(locale);
  i18n.addResourceBundle(
    locale,
    'website',
    { atelier: locale === 'en' ? fragmentEn : fragmentAr },
    true,
    true
  );
  return i18n;
}

function wrap(children: ReactNode, locale: PublicWebsiteLocale = 'en') {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={i18nFor(locale)}>
        <WebsiteThemeScope theme={getWebsiteTheme('atelier')}>
          <PublicWebsiteLocaleProvider locale={locale}>
            {children}
          </PublicWebsiteLocaleProvider>
        </WebsiteThemeScope>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

const linkRenderer: WebsiteLinkRenderer = ({
  href,
  className,
  ariaCurrent,
  ariaLabel,
  children,
}) => (
  <a href={href} className={className} aria-current={ariaCurrent} aria-label={ariaLabel}>
    {children}
  </a>
);

const page = (id: string, coreType: string): WebsitePage =>
  ({
    id,
    coreType,
    slug: coreType,
    title: coreType[0].toUpperCase() + coreType.slice(1),
    sections: [],
  }) as unknown as WebsitePage;

/** The public API returns visible pages only: FAQs is hidden here. */
const PAGES = [page('p-home', 'home'), page('p-courses', 'courses')];
const HIDDEN = 'p-faqs';

const HEADER: WebsiteHeaderProps = {
  academyName: 'Horizon Academy',
  navigation: [
    { id: 'n1', label: lt('Home', 'الرئيسية'), pageId: 'p-home', order: 0 },
    { id: 'n2', label: lt('Courses', 'الدورات'), pageId: 'p-courses', order: 1 },
    { id: 'n3', label: lt('FAQs', 'الأسئلة'), pageId: HIDDEN, order: 2 },
  ] as WebsiteHeaderProps['navigation'],
  pages: PAGES,
  header: {},
  activePageId: 'p-courses',
  onNavigate: () => undefined,
};

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView ??= () => undefined;
});
beforeEach(() => {
  identity = {};
  categories = [];
});
afterEach(cleanup);

/* ------------------------------------------------------------------ */
/* Header                                                               */
/* ------------------------------------------------------------------ */

describe('AtelierHeader', () => {
  it('is the pack chrome, inside the Atelier scope', () => {
    expect(ATELIER_CHROME).toEqual({
      Header: AtelierHeader,
      Footer: AtelierFooter,
      AuthFrame: AtelierAuthFrame,
    });
    const { container } = wrap(<AtelierHeader {...HEADER} />);
    expect(container.querySelector('[data-theme-pack="atelier"] header')).toBeTruthy();
  });

  it('marks the current page; previews keep every item as an inert button', () => {
    const onNavigate = vi.fn();
    wrap(<AtelierHeader {...HEADER} onNavigate={onNavigate} />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    const courses = within(nav).getByRole('button', { name: 'Courses' });
    expect(courses.getAttribute('aria-current')).toBe('page');
    expect(within(nav).getByRole('button', { name: 'Home' }).getAttribute('aria-current')).toBeNull();
    expect(within(nav).getByRole('button', { name: 'FAQs' })).toBeTruthy();
    expect(within(nav).getByRole('button', { name: 'My Learn' })).toBeTruthy();
    courses.click();
    expect(onNavigate).toHaveBeenCalledWith('p-courses');
  });

  it('public site: a hidden page has no entry, every entry is a link, the wordmark links Home', () => {
    wrap(<AtelierHeader {...HEADER} linkRenderer={linkRenderer} />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).queryByText('FAQs')).toBeNull();
    expect(within(nav).getByRole('link', { name: 'Courses' }).getAttribute('href')).toBe('/courses');
    expect(within(nav).queryAllByRole('button')).toHaveLength(0);
    expect(
      screen.getByRole('link', { name: 'Horizon Academy home' }).getAttribute('href')
    ).toBe('/');
  });

  it('one call to action (Sign up by default) with Sign in beside it', () => {
    const { container } = wrap(<AtelierHeader {...HEADER} />);
    // The desktop group and the small-screen bar each hold the one CTA.
    const ctas = container.querySelectorAll('header .at-btn');
    expect(ctas).toHaveLength(2);
    expect([...ctas].every((cta) => cta.textContent === 'Sign up')).toBe(true);
    expect(screen.getAllByRole('button', { name: 'Sign in' })).toHaveLength(1);
  });

  it('a configured CTA takes the slot; a Sign-in CTA drops the extra Sign in; hidden targets render nothing', () => {
    wrap(<AtelierHeader {...HEADER} header={{ cta: { label: lt('Start learning') } }} />);
    expect(screen.getAllByRole('button', { name: 'Start learning' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Sign in' })).toHaveLength(1);
    cleanup();
    wrap(
      <AtelierHeader {...HEADER} header={{ cta: { label: lt('Log in'), authAction: 'signIn' } }} />
    );
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
    cleanup();
    wrap(
      <AtelierHeader
        {...HEADER}
        header={{ cta: { label: lt('Read FAQs'), pageId: HIDDEN } }}
        linkRenderer={linkRenderer}
      />
    );
    expect(screen.queryByText('Read FAQs')).toBeNull();
  });

  it('a signed-in visitor sees the account menu, never Sign in / Sign up', () => {
    wrap(<AtelierHeader {...HEADER} authState={{ name: 'Mona', onSignOut: () => undefined }} />);
    expect(screen.getByRole('button', { name: 'Account menu for Mona' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Sign up' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
  });

  it('opens a full-screen menu that traps focus, closes on Escape and returns focus', async () => {
    const user = userEvent.setup({ delay: null });
    wrap(<AtelierHeader {...HEADER} />);
    const trigger = screen.getByRole('button', { name: 'Open menu' });
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Horizon Academy menu' });
    expect(dialog.hasAttribute('data-atelier-menu')).toBe(true);
    expect(dialog.contains(document.activeElement)).toBe(true);
    // Display-size links, numbered by CSS.
    expect(within(dialog).getAllByRole('button', { name: 'Courses' })[0].className).toContain(
      'atp-overlay-link'
    );
    for (let i = 0; i < 10; i += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('the close button closes the menu; choosing an entry closes it too', async () => {
    const user = userEvent.setup({ delay: null });
    const onNavigate = vi.fn();
    wrap(<AtelierHeader {...HEADER} onNavigate={onNavigate} />);
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.click(await screen.findByRole('button', { name: 'Close menu' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Home' }));
    expect(onNavigate).toHaveBeenCalledWith('p-home');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Arabic: the menu reads right to left, in Arabic', async () => {
    const user = userEvent.setup({ delay: null });
    wrap(<AtelierHeader {...HEADER} locale="ar" />, 'ar');
    await user.click(screen.getByRole('button', { name: 'فتح القائمة' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.getAttribute('dir')).toBe('rtl');
    expect(within(dialog).getByRole('button', { name: 'إغلاق القائمة' })).toBeTruthy();
    expect(within(dialog).getAllByRole('button', { name: 'الدورات' }).length).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* Footer                                                               */
/* ------------------------------------------------------------------ */

const FOOTER = {
  groups: [
    {
      id: 'g1',
      title: lt('Explore'),
      links: [
        { id: 'l1', label: lt('Courses'), pageId: 'p-courses' },
        { id: 'l2', label: lt('FAQs'), pageId: HIDDEN },
      ],
    },
    { id: 'g2', title: lt('Help'), links: [{ id: 'l3', label: lt('FAQs'), pageId: HIDDEN }] },
  ],
  socialLinks: [],
} as unknown as WebsiteFooterConfig;

describe('AtelierFooter (the colophon)', () => {
  const footer = (extra: Partial<Parameters<typeof AtelierFooter>[0]> = {}) => (
    <AtelierFooter
      academyId="a1"
      academyName="Horizon Academy"
      footer={FOOTER}
      pages={PAGES}
      onNavigate={() => undefined}
      attribution={<p data-testid="attribution">Powered by Atlas</p>}
      {...extra}
    />
  );

  it('renders the platform attribution on the copyright line', () => {
    wrap(footer());
    const legal = screen.getByTestId('website-footer-legal');
    expect(within(legal).getByTestId('attribution')).toBeTruthy();
    expect(legal.textContent).toMatch(/© \d{4} Horizon Academy/);
  });

  it('sets the academy name large, as a link to Home on the public site', () => {
    const { container } = wrap(footer({ linkRenderer }));
    const name = container.querySelector('.atp-colophon-name')!;
    expect(name.textContent).toBe('Horizon Academy');
    expect(
      within(name as HTMLElement)
        .getByRole('link', { name: 'Horizon Academy home' })
        .getAttribute('href')
    ).toBe('/');
  });

  it('public site: links to hidden pages are left out, and a group with none left disappears', () => {
    wrap(footer({ linkRenderer }));
    expect(screen.getByRole('link', { name: 'Courses' })).toBeTruthy();
    expect(screen.queryByText('FAQs')).toBeNull();
    expect(screen.queryByText('Help')).toBeNull();
    expect(screen.getByText('Explore')).toBeTruthy();
  });

  it('shows live categories (two or more) and the academy contact; leaves empty columns out', () => {
    wrap(footer());
    expect(screen.queryByText('Top categories')).toBeNull();
    expect(screen.queryByText('Contact')).toBeNull();
    cleanup();
    categories = [
      { id: 'c1', name: 'Design', courseCount: 2 },
      { id: 'c2', name: 'Business', courseCount: 1 },
    ];
    identity = { contactEmail: 'hello@academy.example', contactPhone: '+971 4 555' };
    wrap(footer({ linkRenderer }));
    expect(screen.getByRole('link', { name: 'Design' }).getAttribute('href')).toBe(
      '/courses?category=c1'
    );
    expect(screen.getByText('+971 4 555').closest('a')?.getAttribute('href')).toBe('tel:+9714555');
  });

  it('Arabic: the shared column titles are translated', () => {
    categories = [
      { id: 'c1', name: 'Design', courseCount: 2 },
      { id: 'c2', name: 'Business', courseCount: 1 },
    ];
    wrap(footer(), 'ar');
    expect(screen.getByText('Horizon Academy').closest('[dir]')?.getAttribute('dir')).toBe('auto');
    expect(document.querySelector('[dir="rtl"] footer')).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/* Auth frame                                                           */
/* ------------------------------------------------------------------ */

describe('AtelierAuthFrame', () => {
  it('renders the form first, with the arch photograph decorative', () => {
    const { container } = wrap(
      <AtelierAuthFrame>
        <form aria-label="Sign in">
          <input aria-label="Email" />
        </form>
      </AtelierAuthFrame>
    );
    const frame = container.querySelector('[data-atelier-auth-frame]')!;
    expect(frame.firstElementChild?.querySelector('form')).toBeTruthy();
    const art = frame.lastElementChild!;
    expect(art.getAttribute('aria-hidden')).toBe('true');
    expect(art.querySelector('.at-frame[data-shape="arch"]')).toBeTruthy();
    expect(screen.getByRole('form', { name: 'Sign in' })).toBeTruthy();
  });
});
