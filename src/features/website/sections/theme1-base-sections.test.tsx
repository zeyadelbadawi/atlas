/**
 * Theme 1 plan Phase 2 — the base renderers for the new section types and
 * the base support for the extended fields. These are what every theme
 * without its own renderer draws, so the contracts here are the floor:
 *
 *   - `courseCategories` is live data, hidden publicly with < 2 categories
 *     (the preview explains why), and each tile opens the filtered catalog;
 *   - sample testimonials never render on the public site, and are labelled
 *     "Sample" in previews (§D.4);
 *   - `faq.maxItems`/`faq.cta`, `cta.secondaryCta` and testimonial ratings
 *     render only when set, so existing pages are unchanged.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import type { ReactNode } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import { WebsiteThemeScope } from '../renderer/WebsiteThemeScope';
import { PublicWebsiteLocaleProvider } from '../renderer/PublicWebsiteLocaleContext';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { BASE_RENDERERS } from '../theme-packs/base-renderers';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';
import type { PublicCourseCategory, WebsitePage } from '@types';

let categories: PublicCourseCategory[] | null = [];

vi.mock('@/shared/hooks/usePublicCourseCategories', () => ({
  usePublicCourseCategories: () => ({ data: categories, isLoading: false }),
}));

const i18n = createI18nInstance('en');
const theme = getWebsiteTheme('modern-education');
const lt = (en: string) => ({ en, ar: '' });

const linkRenderer: WebsiteLinkRenderer = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

const PAGES = [
  { id: 'p-courses', coreType: 'courses', slug: 'courses', title: 'Courses' },
  { id: 'p-faqs', coreType: 'faqs', slug: 'faqs', title: 'FAQs' },
] as unknown as WebsitePage[];

function wrap(children: ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={i18n}>
        <WebsiteThemeScope theme={theme}>
          <PublicWebsiteLocaleProvider locale="en">
            {children}
          </PublicWebsiteLocaleProvider>
        </WebsiteThemeScope>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  categories = [];
});

const Categories = BASE_RENDERERS.courseCategories;
const Testimonials = BASE_RENDERERS.testimonials;
const Faq = BASE_RENDERERS.faq;
const Cta = BASE_RENDERERS.cta;
const Steps = BASE_RENDERERS.steps;

describe('courseCategories (base)', () => {
  const config = { title: lt('Explore'), maxItems: 8, showCounts: true };

  it('renders nothing publicly with fewer than two categories', () => {
    categories = [{ id: 'c1', name: 'Design', slug: 'design', courseCount: 3 }];
    const { container } = wrap(
      <Categories
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(container.querySelector('section')).toBeNull();
  });

  it('explains the hidden state in the preview instead', () => {
    categories = [];
    wrap(<Categories config={config} academyId="a1" pages={PAGES} />);
    expect(screen.getByText(/Hidden on your website/)).toBeTruthy();
  });

  it('links each tile to the catalog filtered by it, with counts and maxItems', () => {
    categories = [
      { id: 'c1', name: 'Design', slug: 'design', courseCount: 1 },
      { id: 'c2', name: 'Code', slug: 'code', courseCount: 4 },
      { id: 'c3', name: 'Music', slug: 'music', courseCount: 2 },
    ];
    wrap(
      <Categories
        config={{ ...config, maxItems: 2 }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/courses?category=c1',
      '/courses?category=c2',
    ]);
    expect(within(links[0]).getByText('1 course')).toBeTruthy();
    expect(within(links[1]).getByText('4 courses')).toBeTruthy();
  });
});

describe('testimonials (base) — sample rule and rating', () => {
  const config = {
    title: lt('Said'),
    items: [
      {
        id: 'r',
        quote: lt('Real words'),
        authorName: 'Real Person',
        rating: 4,
      },
      {
        id: 's',
        quote: lt('Sample words'),
        authorName: 'Sample Person',
        sample: true,
      },
    ],
  };

  it('never renders a sample testimonial on the public site', () => {
    wrap(
      <Testimonials
        config={config}
        academyId="a1"
        pages={[]}
        linkRenderer={linkRenderer}
      />
    );
    expect(screen.getByText('Real Person')).toBeTruthy();
    expect(screen.queryByText('Sample Person')).toBeNull();
    expect(screen.queryByText('Sample')).toBeNull();
  });

  it('labels it "Sample" in the preview, and shows ratings', () => {
    wrap(<Testimonials config={config} academyId="a1" pages={[]} />);
    expect(screen.getByText('Sample Person')).toBeTruthy();
    expect(screen.getAllByText('Sample')).toHaveLength(1);
    expect(screen.getByLabelText('Rated 4 out of 5')).toBeTruthy();
  });
});

describe('faq and cta (base) — extended fields', () => {
  const items = ['One', 'Two', 'Three'].map((q, i) => ({
    id: String(i),
    question: lt(q),
    answer: lt('A'),
  }));

  it('faq: maxItems makes a teaser and cta links to the rest', () => {
    wrap(
      <Faq
        config={{
          items,
          maxItems: 2,
          cta: { label: lt('All questions'), pageId: 'p-faqs' },
        }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(screen.getByText('Two')).toBeTruthy();
    expect(screen.queryByText('Three')).toBeNull();
    expect(
      screen.getByRole('link', { name: 'All questions' }).getAttribute('href')
    ).toBe('/faqs');
  });

  it('faq without the new fields renders every item and no link', () => {
    wrap(<Faq config={{ items }} academyId="a1" pages={PAGES} />);
    expect(screen.getByText('Three')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('cta: the secondary action renders beside the primary', () => {
    wrap(
      <Cta
        config={{
          title: lt('Ready?'),
          cta: { label: lt('Start'), pageId: 'p-courses' },
          secondaryCta: { label: lt('Ask us'), pageId: 'p-faqs' },
        }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(
      screen.getByRole('link', { name: 'Start' }).getAttribute('href')
    ).toBe('/courses');
    expect(
      screen.getByRole('link', { name: 'Ask us' }).getAttribute('href')
    ).toBe('/faqs');
  });
});

describe('steps (base)', () => {
  it('is an ordered list in authored order', () => {
    wrap(
      <Steps
        config={{
          title: lt('How it works'),
          items: [
            { id: 'a', title: lt('Sign up') },
            { id: 'b', title: lt('Learn') },
          ],
        }}
        academyId="a1"
        pages={[]}
      />
    );
    const list = screen.getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(
      within(list)
        .getAllByRole('heading')
        .map((h) => h.textContent)
    ).toEqual(['Sign up', 'Learn']);
  });
});
