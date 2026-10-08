/**
 * The shared footer information architecture, drawn by all four theme
 * footers (Task 2) — with the social platform icons (Task B).
 *
 * For each theme: the academy's description shows when configured; the
 * links sit in a "Footer" navigation landmark in more than one group
 * (the Owner's, Learning, Help); a destination the Owner already links to
 * is not repeated; contact details and social marks appear only when they
 * exist; social links are icon-only, named by their platform, and a legacy
 * free-text link still renders; nothing is invented when data is missing.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import { PublicWebsiteLocaleProvider } from './PublicWebsiteLocaleContext';
import type { WebsiteLinkRenderer } from './website-link-renderer.types';
import type { ThemeFooterProps } from '../theme-packs/theme-pack.types';
import type {
  PublicWebsiteLocale,
  WebsiteFooterConfig,
  WebsitePage,
} from '@types';
import { ModernEducationFooter } from '../modern-education/ModernEducationFooter';
import { AtelierFooter } from '../atelier/chrome/AtelierFooter';
import { ManaraFooter } from '../manara/chrome/ManaraFooter';
import { RiwaqFooter } from '../riwaq/chrome/RiwaqFooter';

let identity: Record<string, unknown> = {};
let categories: unknown[] = [];

vi.mock('@/shared/hooks/useAcademyIdentity', () => ({
  useAcademyIdentity: () => ({ data: identity }),
}));
vi.mock('@/shared/hooks/usePublicCourseCategories', () => ({
  usePublicCourseCategories: () => ({ data: categories }),
}));

const lt = (en: string, ar = '') => ({ en, ar });
const page = (id: string, coreType: string): WebsitePage =>
  ({
    id,
    coreType,
    slug: coreType,
    title: coreType,
    sections: [],
  }) as unknown as WebsitePage;
const PAGES = [
  page('p-home', 'home'),
  page('p-about', 'about'),
  page('p-courses', 'courses'),
  page('p-faqs', 'faqs'),
  page('p-contact', 'contact'),
];

const links: WebsiteLinkRenderer = ({
  href,
  className,
  ariaLabel,
  children,
}) => (
  <a href={href} className={className} aria-label={ariaLabel}>
    {children}
  </a>
);

/** The starter "Quick Links" group every new Academy has. */
const QUICK_LINKS: WebsiteFooterConfig['groups'][number] = {
  id: 'g1',
  title: lt('Quick Links', 'روابط سريعة'),
  links: [
    { id: 'l1', label: lt('About'), pageId: 'p-about' },
    { id: 'l2', label: lt('Courses'), pageId: 'p-courses' },
    { id: 'l3', label: lt('FAQs'), pageId: 'p-faqs' },
    { id: 'l4', label: lt('Contact'), pageId: 'p-contact' },
  ],
};

const THEMES: ReadonlyArray<
  readonly [string, ComponentType<ThemeFooterProps>]
> = [
  ['Theme 1', ModernEducationFooter],
  ['Atelier', AtelierFooter],
  ['Manara', ManaraFooter],
  ['Riwaq', RiwaqFooter],
];

function renderFooter(
  Footer: ComponentType<ThemeFooterProps>,
  props: Partial<ThemeFooterProps> = {},
  locale: PublicWebsiteLocale = 'en'
) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={createI18nInstance(locale)}>
        <MemoryRouter>
          <PublicWebsiteLocaleProvider locale={locale}>
            <Footer
              academyId="a1"
              academyName="Horizon Academy"
              attribution={<span>Powered by Atlas</span>}
              footer={{ groups: [QUICK_LINKS], socialLinks: [] }}
              pages={PAGES}
              onNavigate={() => undefined}
              linkRenderer={links}
              {...props}
            />
          </PublicWebsiteLocaleProvider>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

const footerNav = () => screen.getByRole('navigation', { name: 'Footer' });
const hrefs = (root: HTMLElement) =>
  within(root)
    .queryAllByRole('link')
    .map((a) => a.getAttribute('href'));

afterEach(() => {
  cleanup();
  identity = {};
  categories = [];
});

describe.each(THEMES)('%s footer', (_name, Footer) => {
  it('a starter Academy: identity, the Owner group and a Learning group — nothing invented', () => {
    renderFooter(Footer);
    expect(screen.getByText('Horizon Academy')).toBeTruthy();
    const nav = footerNav();
    expect(within(nav).getAllByText('Quick Links').length).toBeGreaterThan(0);
    expect(within(nav).getAllByText('Learning').length).toBeGreaterThan(0);
    // Learning: My Learn (sign-in first for a visitor) and a way in; the
    // catalogue is not repeated — Quick Links already has Courses.
    expect(
      within(nav)
        .getAllByRole('link', { name: 'My Learn' })[0]
        .getAttribute('href')
    ).toBe('/sign-in?returnTo=%2Fmy');
    expect(
      within(nav)
        .getAllByRole('link', { name: 'Create an account' })[0]
        .getAttribute('href')
    ).toBe('/sign-up');
    expect(within(nav).queryByText('Browse courses')).toBeNull();
    // Help would only repeat FAQs and Contact: left out.
    expect(within(nav).queryByText('Help')).toBeNull();
    // One Courses link per rendered column (Theme 1 draws each column twice:
    // a phone disclosure and the wide column — CSS shows one).
    const columnCopies = within(nav).getAllByText('Quick Links').length;
    expect(hrefs(nav).filter((href) => href === '/courses')).toHaveLength(
      columnCopies
    );
    // No contact data, no social links, no description: none of them shown.
    expect(screen.queryByRole('list', { name: 'Social links' })).toBeNull();
    expect(screen.queryByText(/@/)).toBeNull();
    // Never a private dashboard link.
    expect(
      hrefs(document.body).some((href) => href?.startsWith('/dashboard'))
    ).toBe(false);
  });

  it('shows the description and the contact details when the Academy has them', () => {
    identity = {
      description: 'Evening courses in applied statistics.',
      contactEmail: 'hello@horizon.example',
      contactPhone: '+971 4 555 0142',
      address: { city: 'Dubai', country: 'AE' },
    };
    renderFooter(Footer);
    expect(
      screen.getByText('Evening courses in applied statistics.')
    ).toBeTruthy();
    expect(
      screen.getAllByRole('link', { name: /hello@/ })[0].getAttribute('href')
    ).toBe('mailto:hello@horizon.example');
    expect(
      screen
        .getAllByRole('link', { name: '+971 4 555 0142' })[0]
        .getAttribute('href')
    ).toBe('tel:+97145550142');
    expect(screen.getAllByText('Dubai, AE').length).toBeGreaterThan(0);
  });

  it("prefers the site's own (localized) description over the Academy's", () => {
    identity = { description: 'Academy settings text' };
    renderFooter(
      Footer,
      { siteDescription: lt('Site description', 'وصف الموقع') },
      'ar'
    );
    expect(screen.getByText('وصف الموقع')).toBeTruthy();
    expect(screen.queryByText('Academy settings text')).toBeNull();
  });

  it('derives Browse courses and Help when the Owner links to none of them', () => {
    renderFooter(Footer, { footer: { groups: [], socialLinks: [] } });
    const nav = footerNav();
    expect(
      within(nav)
        .getAllByRole('link', { name: 'Browse courses' })[0]
        .getAttribute('href')
    ).toBe('/courses');
    expect(
      within(nav).getAllByRole('link', { name: 'FAQs' })[0].getAttribute('href')
    ).toBe('/faqs');
    expect(
      within(nav)
        .getAllByRole('link', { name: 'Contact us' })[0]
        .getAttribute('href')
    ).toBe('/contact');
  });

  it('a signed-in learner: My Learn and certificates instead of a sign-up link', () => {
    renderFooter(Footer, {
      authState: { name: 'Sara', myLearningHref: '/my' },
    });
    const nav = footerNav();
    expect(
      within(nav)
        .getAllByRole('link', { name: 'My Learn' })[0]
        .getAttribute('href')
    ).toBe('/my');
    expect(
      within(nav)
        .getAllByRole('link', { name: 'My certificates' })[0]
        .getAttribute('href')
    ).toBe('/my/certificates');
    expect(within(nav).queryByText('Create an account')).toBeNull();
  });

  it('social links are icons named by their platform — legacy links included', () => {
    renderFooter(Footer, {
      footer: {
        groups: [QUICK_LINKS],
        socialLinks: [
          {
            id: 's1',
            label: lt('Instagram'),
            url: 'https://instagram.com/horizon',
            platform: 'instagram',
          },
          // Saved before the picker: free-text label only.
          {
            id: 's2',
            label: lt('facebook'),
            url: 'https://facebook.com/horizon',
          },
          // A label that names nothing; the address does.
          {
            id: 's3',
            label: lt('Our channel'),
            url: 'https://www.youtube.com/@horizon',
          },
          // Neither identifies a platform: still shown, generic, by its label.
          {
            id: 's4',
            label: lt('Newsletter'),
            url: 'https://news.horizon.example',
          },
          // No usable address on the public site: left out.
          { id: 's5', label: lt('TikTok'), url: '', platform: 'tiktok' },
        ],
      },
    });
    const list = screen.getByRole('list', { name: 'Social links' });
    const items = within(list).getAllByRole('link');
    expect(items.map((a) => a.getAttribute('aria-label'))).toEqual([
      'Instagram',
      'Facebook',
      'YouTube',
      'Newsletter',
    ]);
    expect(
      items.map(
        (a) => a.querySelector('svg')?.getAttribute('data-social-icon') ?? null
      )
    ).toEqual(['instagram', 'facebook', 'youtube', null]);
    // Icons, not words.
    for (const item of items) expect(item.textContent).toBe('');
  });
});
