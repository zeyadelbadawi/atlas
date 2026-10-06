/**
 * Manara chrome: the brand-block header's navigation, current-page marker,
 * full-screen night menu (focus trap, Escape, focus return, direction), the
 * shared Join / Sign in / signed-in rules and hidden-page links; the night
 * footer's attribution, Home link, live columns and hidden-page links; the
 * auth frame's night panel and form column.
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
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
import type {
  PublicWebsiteLocale,
  WebsiteFooterConfig,
  WebsitePage,
} from '@types';
import { MANARA_CHROME, ManaraAuthFrame, ManaraFooter, ManaraHeader } from '.';

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

function wrap(children: ReactNode, locale: PublicWebsiteLocale = 'en') {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={createI18nInstance(locale)}>
        <WebsiteThemeScope theme={getWebsiteTheme('manara')}>
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
  <a
    href={href}
    className={className}
    aria-current={ariaCurrent}
    aria-label={ariaLabel}
  >
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
    {
      id: 'n2',
      label: lt('Courses', 'الدورات'),
      pageId: 'p-courses',
      order: 1,
    },
    { id: 'n3', label: lt('FAQs', 'الأسئلة'), pageId: HIDDEN, order: 2 },
  ] as WebsiteHeaderProps['navigation'],
  pages: PAGES,
  header: {},
  activePageId: 'p-courses',
  onNavigate: () => undefined,
};

/** The Join controls: the accent buttons, never the quiet Sign in or outline. */
const JOIN_SELECTOR =
  '[data-manara-header] .mn-btn:not(.mn-btn-quiet):not(.mn-btn-outline)';

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

describe('ManaraHeader', () => {
  it('is the pack chrome: a brand-block bar inside the Manara scope, with the scroll beam', () => {
    expect(MANARA_CHROME).toEqual({
      Header: ManaraHeader,
      Footer: ManaraFooter,
      AuthFrame: ManaraAuthFrame,
    });
    const { container } = wrap(<ManaraHeader {...HEADER} />);
    const header = container.querySelector(
      '[data-theme-pack="manara"] header[data-manara-header]'
    )!;
    expect(header.className).toContain('mnp-header');
    const beam = header.querySelector('.mn-header-beam')!;
    expect(beam.getAttribute('aria-hidden')).toBe('true');
    // The name is set in the display face when there is no logo.
    expect(header.querySelector('.mnp-wordmark')?.textContent).toBe(
      'Horizon Academy'
    );
  });

  it('shows the logo when there is one, named after the academy', () => {
    wrap(<ManaraHeader {...HEADER} logo="https://cdn.example/logo.png" />);
    expect(
      screen.getAllByRole('img', { name: 'Horizon Academy' }).length
    ).toBeGreaterThan(0);
  });

  it('marks the current page; previews keep every item as an inert button', () => {
    const onNavigate = vi.fn();
    wrap(<ManaraHeader {...HEADER} onNavigate={onNavigate} />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    const courses = within(nav).getByRole('button', { name: 'Courses' });
    expect(courses.getAttribute('aria-current')).toBe('page');
    expect(courses.className).toContain('mnp-nav-link');
    expect(
      within(nav)
        .getByRole('button', { name: 'Home' })
        .getAttribute('aria-current')
    ).toBeNull();
    expect(within(nav).getByRole('button', { name: 'FAQs' })).toBeTruthy();
    expect(within(nav).getByRole('button', { name: 'My Learn' })).toBeTruthy();
    courses.click();
    expect(onNavigate).toHaveBeenCalledWith('p-courses');
  });

  it('public site: a hidden page has no entry, every entry is a link, the name links Home', () => {
    wrap(<ManaraHeader {...HEADER} linkRenderer={linkRenderer} />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).queryByText('FAQs')).toBeNull();
    expect(
      within(nav).getByRole('link', { name: 'Courses' }).getAttribute('href')
    ).toBe('/courses');
    expect(within(nav).queryAllByRole('button')).toHaveLength(0);
    expect(
      screen
        .getByRole('link', { name: 'Horizon Academy home' })
        .getAttribute('href')
    ).toBe('/');
  });

  it('the accent Join (sign-up by default) with a quiet Sign in beside it', () => {
    const { container } = wrap(
      <ManaraHeader {...HEADER} linkRenderer={linkRenderer} />
    );
    // The desktop group and the small-screen bar each hold the one Join.
    const joins = container.querySelectorAll(JOIN_SELECTOR);
    expect(joins).toHaveLength(2);
    expect([...joins].every((cta) => cta.textContent === 'Join')).toBe(true);
    expect(
      [...joins].every((cta) => cta.getAttribute('href') === '/sign-up')
    ).toBe(true);
    const signIn = screen.getByRole('link', { name: 'Sign in' });
    expect(signIn.getAttribute('href')).toBe('/sign-in');
    expect(signIn.className).toContain('mn-btn-quiet');
  });

  it('a configured CTA takes the Join slot; a Sign-in CTA drops the extra Sign in; hidden targets render nothing', () => {
    wrap(
      <ManaraHeader
        {...HEADER}
        header={{ cta: { label: lt('Start learning') } }}
      />
    );
    expect(
      screen.getAllByRole('button', { name: 'Start learning' })
    ).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Sign in' })).toHaveLength(1);
    cleanup();
    wrap(
      <ManaraHeader
        {...HEADER}
        header={{ cta: { label: lt('Log in'), authAction: 'signIn' } }}
      />
    );
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
    cleanup();
    wrap(
      <ManaraHeader
        {...HEADER}
        header={{ cta: { label: lt('Read FAQs'), pageId: HIDDEN } }}
        linkRenderer={linkRenderer}
      />
    );
    expect(screen.queryByText('Read FAQs')).toBeNull();
  });

  it('a signed-in visitor sees the account menu, never Sign in / Join', () => {
    wrap(
      <ManaraHeader
        {...HEADER}
        authState={{ name: 'Mona', onSignOut: () => undefined }}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Account menu for Mona' })
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Join' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
  });

  it('the locale switch renders only when the runtime can switch, and offers the other language', () => {
    const onLocaleChange = vi.fn();
    wrap(<ManaraHeader {...HEADER} />);
    expect(
      screen.queryByRole('button', { name: 'English / العربية' })
    ).toBeNull();
    cleanup();
    wrap(<ManaraHeader {...HEADER} onLocaleChange={onLocaleChange} />);
    const [toggle] = screen.getAllByRole('button', {
      name: 'English / العربية',
    });
    expect(toggle.textContent).toBe('العربية');
    toggle.click();
    expect(onLocaleChange).toHaveBeenCalledWith('ar');
  });

  it('opens a full-screen night menu that traps focus, closes on Escape and returns focus', async () => {
    const user = userEvent.setup({ delay: null });
    wrap(<ManaraHeader {...HEADER} />);
    const trigger = screen.getByRole('button', { name: 'Open menu' });
    expect(trigger.className).toContain('mnp-icon-btn');
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', {
      name: 'Horizon Academy menu',
    });
    expect(dialog.hasAttribute('data-manara-menu')).toBe(true);
    expect(dialog.getAttribute('data-env')).toBe('night');
    expect(dialog.contains(document.activeElement)).toBe(true);
    // Display-size links.
    expect(
      within(dialog).getAllByRole('button', { name: 'Courses' })[0].className
    ).toContain('mnp-menu-link');
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
    wrap(<ManaraHeader {...HEADER} onNavigate={onNavigate} />);
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
    wrap(<ManaraHeader {...HEADER} locale="ar" />, 'ar');
    await user.click(screen.getByRole('button', { name: 'فتح القائمة' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.getAttribute('dir')).toBe('rtl');
    expect(
      within(dialog).getByRole('button', { name: 'إغلاق القائمة' })
    ).toBeTruthy();
    expect(
      within(dialog).getAllByRole('button', { name: 'الدورات' }).length
    ).toBe(1);
    expect(
      within(dialog).getAllByRole('button', { name: 'انضم الآن' }).length
    ).toBe(1);
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
    {
      id: 'g2',
      title: lt('Help'),
      links: [{ id: 'l3', label: lt('FAQs'), pageId: HIDDEN }],
    },
  ],
  socialLinks: [],
} as unknown as WebsiteFooterConfig;

describe('ManaraFooter', () => {
  const footer = (extra: Partial<Parameters<typeof ManaraFooter>[0]> = {}) => (
    <ManaraFooter
      academyId="a1"
      academyName="Horizon Academy"
      footer={FOOTER}
      pages={PAGES}
      onNavigate={() => undefined}
      attribution={<p data-testid="attribution">Powered by Atlas</p>}
      {...extra}
    />
  );

  it('is a seamed night block that renders the platform attribution on the copyright line', () => {
    const { container } = wrap(footer());
    const block = container.querySelector('footer.mn-block')!;
    expect(block.getAttribute('data-env')).toBe('night');
    expect(block.hasAttribute('data-seam-top')).toBe(true);
    const legal = screen.getByTestId('website-footer-legal');
    expect(within(legal).getByTestId('attribution')).toBeTruthy();
    expect(legal.textContent).toMatch(/© \d{4} Horizon Academy/);
  });

  it('sets the academy name large, as a link to Home on the public site; a long name steps down', () => {
    const { container } = wrap(footer({ linkRenderer }));
    const name = container.querySelector('.mnp-footer-name')!;
    expect(name.textContent).toBe('Horizon Academy');
    expect(name.hasAttribute('data-length')).toBe(false);
    expect(
      within(name as HTMLElement)
        .getByRole('link', { name: 'Horizon Academy home' })
        .getAttribute('href')
    ).toBe('/');
    cleanup();
    const long = wrap(
      footer({ academyName: 'The Alexandria Institute of Sciences' })
    );
    expect(
      long.container
        .querySelector('.mnp-footer-name')
        ?.getAttribute('data-length')
    ).toBe('long');
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
    expect(screen.queryByText('Reach us')).toBeNull();
    cleanup();
    categories = [
      { id: 'c1', name: 'Physics', courseCount: 2 },
      { id: 'c2', name: 'Chemistry', courseCount: 1 },
    ];
    identity = {
      contactEmail: 'hello@academy.example',
      contactPhone: '+20 2 555',
    };
    wrap(footer({ linkRenderer }));
    expect(
      screen.getByRole('link', { name: 'Physics' }).getAttribute('href')
    ).toBe('/courses?category=c1');
    expect(
      screen.getByText('+20 2 555').closest('a')?.getAttribute('href')
    ).toBe('tel:+202555');
    expect(screen.getByText('Reach us')).toBeTruthy();
  });

  it('Arabic: right to left, with the translated column titles', () => {
    categories = [
      { id: 'c1', name: 'Physics', courseCount: 2 },
      { id: 'c2', name: 'Chemistry', courseCount: 1 },
    ];
    wrap(footer(), 'ar');
    expect(
      screen.getByText('Horizon Academy').closest('[dir]')?.getAttribute('dir')
    ).toBe('auto');
    expect(document.querySelector('[dir="rtl"] footer')).toBeTruthy();
    expect(screen.getByText('أبرز الفئات')).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/* Auth frame                                                           */
/* ------------------------------------------------------------------ */

describe('ManaraAuthFrame', () => {
  it('a decorative night panel hidden on phones, and the form column', () => {
    const { container } = wrap(
      <ManaraAuthFrame>
        <form aria-label="Sign in">
          <input aria-label="Email" />
        </form>
      </ManaraAuthFrame>
    );
    const frame = container.querySelector('[data-manara-auth-frame]')!;
    const side = frame.querySelector('.mnp-auth-side')!;
    expect(side.getAttribute('aria-hidden')).toBe('true');
    expect(side.getAttribute('data-env')).toBe('night');
    // Hidden below 1024px by class, shown as a flex column from there.
    expect(side.className).toContain('hidden');
    expect(side.className).toContain('lg:flex');
    expect(side.querySelector('.mn-beam')).toBeTruthy();
    expect(side.querySelector('.mn-frame[data-shape="slant"]')).toBeTruthy();
    expect(
      frame.querySelector('.mnp-auth-form')?.querySelector('form')
    ).toBeTruthy();
    expect(screen.getByRole('form', { name: 'Sign in' })).toBeTruthy();
  });
});
