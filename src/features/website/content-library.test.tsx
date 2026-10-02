/**
 * P3 — the FAQ & testimonial content library, on both surfaces.
 *
 * - PUBLIC site (a link renderer is present): the renderers show the
 *   server-resolved `config.libraryEntries` and never call the
 *   authenticated management API (a visitor has no access to it).
 * - PREVIEW (no link renderer): the management read, filtered by the same
 *   rule the server applies — published, visible, in the Owner's order,
 *   each once — so the preview matches what will be public.
 * - The editor picker: reorder, remove, add; a pick that stopped
 *   qualifying stays listed with why, and can be removed.
 * Same behaviour in Theme 1 and the shared (base) renderers, EN and AR.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import { WebsiteThemeScope } from './renderer/WebsiteThemeScope';
import { PublicWebsiteLocaleProvider } from './renderer/PublicWebsiteLocaleContext';
import { getWebsiteTheme } from './themes/website-theme.registry';
import { websiteContentService } from './services/WebsiteContentService';
import { selectPublicEntries } from './hooks';
import { T1Faq } from './modern-education/T1Faq';
import { T1Testimonials } from './modern-education/t1-live-sections';
import { FaqSection } from './sections/FaqSection';
import { TestimonialsSection } from './sections/TestimonialsSection';
import { LibraryEntryPicker } from './components/SectionConfigForm';
import type { WebsiteLinkRenderer } from './renderer/website-link-renderer.types';
import type {
  FaqSectionConfig,
  PublicWebsiteLocale,
  TestimonialsSectionConfig,
  WebsiteContentStatus,
  WebsiteFaqEntry,
  WebsiteTestimonialEntry,
} from '@types';

const lt = (en: string, ar = `${en} (ar)`) => ({ en, ar });
const links: WebsiteLinkRenderer = ({ href, children }) => (
  <a href={href}>{children}</a>
);

function faqRow(
  id: string,
  status: WebsiteContentStatus = 'published',
  visible = true
): WebsiteFaqEntry {
  return {
    id,
    academyId: 'a1',
    question: lt(`Question ${id}`),
    answer: lt(`Answer ${id}`),
    order: 0,
    visible,
    status,
    createdAt: '',
    updatedAt: '',
  };
}
function testimonialRow(
  id: string,
  status: WebsiteContentStatus = 'published',
  visible = true
): WebsiteTestimonialEntry {
  return {
    id,
    academyId: 'a1',
    quote: lt(`Quote ${id}`),
    authorName: `Author ${id}`,
    order: 0,
    visible,
    status,
    createdAt: '',
    updatedAt: '',
  };
}
const page = <T,>(items: T[]) => ({
  items,
  pagination: {
    page: 1,
    pageSize: 100,
    totalItems: items.length,
    totalPages: 1,
  },
});

function wrap(children: ReactNode, locale: PublicWebsiteLocale = 'en') {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <I18nextProvider i18n={createI18nInstance(locale)}>
        <MemoryRouter>
          <WebsiteThemeScope theme={getWebsiteTheme('modern-education')}>
            <PublicWebsiteLocaleProvider locale={locale}>
              {children}
            </PublicWebsiteLocaleProvider>
          </WebsiteThemeScope>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

const spyOnLibrary = () => ({
  faq: vi.spyOn(websiteContentService, 'getFaqEntries'),
  testimonials: vi.spyOn(websiteContentService, 'getTestimonialEntries'),
});
let faqSpy: ReturnType<typeof spyOnLibrary>['faq'];
let testimonialSpy: ReturnType<typeof spyOnLibrary>['testimonials'];
beforeEach(() => {
  ({ faq: faqSpy, testimonials: testimonialSpy } = spyOnLibrary());
  faqSpy.mockResolvedValue(
    page([
      faqRow('f1'),
      faqRow('f2'),
      faqRow('draft', 'draft'),
      faqRow('hidden', 'published', false),
      faqRow('old', 'archived'),
    ])
  );
  testimonialSpy.mockResolvedValue(
    page([testimonialRow('t1'), testimonialRow('t2', 'draft')])
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('selectPublicEntries', () => {
  it('keeps published + visible rows, in id order, each once; drops unknown ids', () => {
    const rows = [
      faqRow('a'),
      faqRow('b'),
      faqRow('d', 'draft'),
      faqRow('h', 'published', false),
      faqRow('x', 'archived'),
    ];
    expect(
      selectPublicEntries(['b', 'gone', 'd', 'a', 'h', 'x', 'b'], rows).map(
        (r) => r.id
      )
    ).toEqual(['b', 'a']);
    expect(selectPublicEntries(['a'], undefined)).toEqual([]);
  });
});

const faqConfig = (
  extra: Partial<FaqSectionConfig> = {}
): FaqSectionConfig => ({
  items: [
    {
      id: 'inline',
      question: lt('Inline question'),
      answer: lt('Inline answer'),
    },
  ],
  libraryEntryIds: ['f2', 'draft', 'hidden', 'f1'],
  ...extra,
});

describe.each([
  [
    'Theme 1',
    (config: FaqSectionConfig, linkRenderer?: WebsiteLinkRenderer) => (
      <T1Faq
        config={config}
        academyId="a1"
        pages={[]}
        linkRenderer={linkRenderer}
      />
    ),
  ],
  [
    'base renderer',
    (config: FaqSectionConfig, linkRenderer?: WebsiteLinkRenderer) => (
      <FaqSection
        config={config}
        academyId="a1"
        pages={[]}
        linkRenderer={linkRenderer}
      />
    ),
  ],
])('FAQ section — %s', (_name, renderFaq) => {
  it('public: renders the server-resolved entries before inline items, and never calls the management API', () => {
    wrap(
      renderFaq(
        faqConfig({
          libraryEntries: [
            { id: 'f2', question: lt('Server question 2'), answer: lt('a') },
            { id: 'f1', question: lt('Server question 1'), answer: lt('a') },
          ],
        }),
        links
      )
    );
    const questions = screen.getAllByRole('button').map((b) => b.textContent);
    expect(questions).toEqual([
      'Server question 2',
      'Server question 1',
      'Inline question',
    ]);
    expect(faqSpy).not.toHaveBeenCalled();
  });

  it('public, payload without resolved entries (stale/older API): shows inline items only, no management call', () => {
    wrap(renderFaq(faqConfig(), links));
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Inline question',
    ]);
    expect(faqSpy).not.toHaveBeenCalled();
  });

  it('preview: published + visible library entries in the Owner’s order (no drafts, no hidden)', async () => {
    wrap(renderFaq(faqConfig()));
    await waitFor(() =>
      expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
        'Question f2',
        'Question f1',
        'Inline question',
      ])
    );
    expect(faqSpy).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({ pagination: { page: 1, pageSize: 100 } })
    );
  });

  it('Arabic: the resolved entries use the Arabic copy', () => {
    wrap(
      renderFaq(
        faqConfig({
          items: [],
          libraryEntries: [
            { id: 'f1', question: lt('Q', 'سؤال'), answer: lt('A', 'جواب') },
          ],
        }),
        links
      ),
      'ar'
    );
    expect(screen.getByRole('button', { name: 'سؤال' })).toBeTruthy();
  });
});

const quotesConfig = (
  extra: Partial<TestimonialsSectionConfig> = {}
): TestimonialsSectionConfig => ({
  items: [],
  libraryEntryIds: ['t2', 't1'],
  ...extra,
});

describe.each([
  [
    'Theme 1',
    (config: TestimonialsSectionConfig, linkRenderer?: WebsiteLinkRenderer) => (
      <T1Testimonials
        config={config}
        academyId="a1"
        pages={[]}
        linkRenderer={linkRenderer}
      />
    ),
  ],
  [
    'base renderer',
    (config: TestimonialsSectionConfig, linkRenderer?: WebsiteLinkRenderer) => (
      <TestimonialsSection
        config={config}
        academyId="a1"
        isPublic={!!linkRenderer}
      />
    ),
  ],
])('Testimonials section — %s', (_name, renderQuotes) => {
  it('public: renders the server-resolved entries and never calls the management API', () => {
    wrap(
      renderQuotes(
        quotesConfig({
          libraryEntries: [
            {
              id: 't1',
              quote: lt('Server quote'),
              authorName: 'Lina',
              authorRole: lt('Student'),
            },
          ],
        }),
        links
      )
    );
    expect(screen.getAllByText(/Server quote/).length).toBeGreaterThan(0);
    expect(testimonialSpy).not.toHaveBeenCalled();
  });

  it('preview: a draft entry is not shown; the published one is', async () => {
    wrap(renderQuotes(quotesConfig()));
    await waitFor(() =>
      expect(screen.getAllByText(/Quote t1/).length).toBeGreaterThan(0)
    );
    expect(screen.queryByText(/Quote t2/)).toBeNull();
  });
});

describe('Library picker', () => {
  const options = [
    { id: 'f1', label: 'First', status: 'published' as const, visible: true },
    { id: 'f2', label: 'Second', status: 'published' as const, visible: true },
    { id: 'f3', label: 'Third', status: 'published' as const, visible: true },
    { id: 'd', label: 'Drafty', status: 'draft' as const, visible: true },
    {
      id: 'h',
      label: 'Hidden one',
      status: 'published' as const,
      visible: false,
    },
  ];

  function renderPicker(
    selectedIds: string[],
    locale: PublicWebsiteLocale = 'en'
  ) {
    const onChange = vi.fn();
    wrap(
      <LibraryEntryPicker
        titleKey="website:editor.libraryEntries"
        helpKey="website:editor.libraryEntriesHelpFaq"
        options={options}
        selectedIds={selectedIds}
        onChange={onChange}
      />,
      locale
    );
    return onChange;
  }

  it('lists picks in order; moves up/down; removes', async () => {
    const onChange = renderPicker(['f1', 'f2', 'f3']);
    const list = screen.getByTestId('library-selected');
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent)
    ).toEqual([
      expect.stringContaining('First'),
      expect.stringContaining('Second'),
      expect.stringContaining('Third'),
    ]);
    expect(
      screen
        .getByRole('button', { name: 'Move “First” up' })
        .hasAttribute('disabled')
    ).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'Move “Third” down' })
        .hasAttribute('disabled')
    ).toBe(true);

    await userEvent.click(
      screen.getByRole('button', { name: 'Move “Second” up' })
    );
    expect(onChange).toHaveBeenLastCalledWith(['f2', 'f1', 'f3']);
    await userEvent.click(
      screen.getByRole('button', { name: 'Move “Second” down' })
    );
    expect(onChange).toHaveBeenLastCalledWith(['f1', 'f3', 'f2']);
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove “First” from this section' })
    );
    expect(onChange).toHaveBeenLastCalledWith(['f2', 'f3']);
  });

  it('offers only published, visible, unpicked entries to add, appending to the end', async () => {
    const onChange = renderPicker(['f2']);
    const available = screen.getByTestId('library-available');
    expect(
      within(available)
        .getAllByRole('listitem')
        .map((li) => li.textContent)
    ).toEqual([
      expect.stringContaining('First'),
      expect.stringContaining('Third'),
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'Add “Third”' }));
    expect(onChange).toHaveBeenLastCalledWith(['f2', 'f3']);
  });

  it('keeps a pick that stopped qualifying listed, says why, and removes all such picks at once', async () => {
    const onChange = renderPicker(['d', 'f1', 'h', 'gone']);
    expect(screen.getByText('Not published — won’t show.')).toBeTruthy();
    expect(screen.getByText('Hidden — won’t show.')).toBeTruthy();
    expect(
      screen.getByText('No longer in your library — won’t show.')
    ).toBeTruthy();
    expect(screen.getByText('Deleted entry')).toBeTruthy();
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Remove the 3 entries that won’t show',
      })
    );
    expect(onChange).toHaveBeenLastCalledWith(['f1']);
  });

  it('Arabic labels', () => {
    renderPicker(['f1', 'd'], 'ar');
    expect(
      screen.getByRole('button', { name: 'نقل «First» للأسفل' })
    ).toBeTruthy();
    expect(screen.getByText('غير منشور — لن يظهر.')).toBeTruthy();
  });
});
