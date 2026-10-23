/**
 * CMS phase 3e — "New page" can start from a page template.
 *
 * Choosing a template suggests a title and a free address (never over the
 * Owner's own), previews the template's sections, and creating the page
 * sends those sections WITH the create request (CMS phase 4: one call, one
 * transaction — no second save, so no half-created empty page), then opens
 * the editor. A blank page is created exactly as before. If the API
 * refuses the template's sections, nothing was created: the dialog says
 * so, offers no retry of the same refused sections, and lets the Owner
 * choose again.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import type { WebsiteConfiguration, WebsitePage } from '@types';
import WebsitePagesPage from './WebsitePagesPage';
import { findPageTemplate } from '../presets/page-templates.registry';

const createMutate = vi.fn();
const createReset = vi.fn();
const updateMutate = vi.fn();
let createError: unknown = null;
let existingPages: WebsitePage[] = [];

vi.mock('../hooks', () => ({
  useCreateWebsitePage: () => ({
    mutate: createMutate,
    reset: createReset,
    isPending: false,
    error: createError,
  }),
  useUpdateWebsitePage: () => ({ mutate: updateMutate, isPending: false }),
  useDeleteWebsitePage: () => ({ mutate: vi.fn(), isPending: false }),
  useWebsitePages: () => ({
    data: { items: existingPages },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useWebsiteConfiguration: () => ({
    data: {
      themeKey: 'manara',
      defaultLocale: 'en',
      brand: {},
      navigation: [],
      header: {},
      footer: {},
    } as unknown as WebsiteConfiguration,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('@features/academy', () => ({
  useAcademy: () => ({ data: { id: 'a1', name: 'Acme Academy' } }),
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  usePermissions: () => ({ hasPermission: () => true }),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useConfirmDialog: () => ({ confirm: vi.fn() }),
}));
// The page itself is drawn by the real renderer in the device frame; here,
// the sections it is given are what matters.
vi.mock('../renderer', () => ({
  WebsiteRenderer: ({ page }: { page: WebsitePage }) => (
    <ol data-testid="rendered-page">
      {page.sections.map((section) => (
        <li key={section.id}>{section.type}</li>
      ))}
    </ol>
  ),
}));
vi.mock('../components/PreviewViewport', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  PreviewViewport: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="preview-viewport">{children}</div>
  ),
}));

const corePage = (coreType: string, slug: string) =>
  ({
    id: `page-${slug}`,
    academyId: 'a1',
    pageType: 'core',
    coreType,
    title: slug,
    slug,
    visible: true,
    seo: {},
    sections: [],
    version: 1,
    createdAt: '',
    updatedAt: '',
  }) as unknown as WebsitePage;

const created = {
  ...corePage('home', 'x'),
  id: 'new-page',
  pageType: 'custom',
  coreType: undefined,
  version: 1,
} as unknown as WebsitePage;

function renderPage() {
  render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <MemoryRouter initialEntries={['/dashboard/academy/a1/website/pages']}>
        <Routes>
          <Route
            path="/dashboard/academy/:academyId/website/pages"
            element={<WebsitePagesPage />}
          />
          <Route
            path="/dashboard/academy/:academyId/website/pages/:pageId"
            element={<p>Editor of the new page</p>}
          />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'New page' }));
  return screen.getByTestId('create-page-dialog');
}

const field = (dialog: HTMLElement, name: string) =>
  within(dialog).getByLabelText(name) as HTMLInputElement;

beforeEach(() => {
  existingPages = [
    corePage('home', 'home'),
    corePage('courses', 'courses'),
    corePage('contact', 'contact'),
  ];
  createMutate.mockReset();
  createReset.mockReset();
  updateMutate.mockReset();
  createError = null;
});
afterEach(cleanup);

describe('new page — start from a template', () => {
  it('offers a blank page and every template, blank first', () => {
    const dialog = renderPage();
    const radios = within(dialog).getAllByRole('radio');
    expect(radios.map((radio) => radio.getAttribute('data-template'))).toEqual([
      'blank',
      'courseLanding',
      'teacherProfile',
      'offers',
      'aboutAcademy',
    ]);
    expect((radios[0] as HTMLInputElement).checked).toBe(true);
    expect(within(dialog).queryByTestId('page-template-preview')).toBeNull();
  });

  it('creates a blank page exactly as before', () => {
    const dialog = renderPage();
    fireEvent.change(field(dialog, 'Page title'), {
      target: { value: 'Summer camp' },
    });
    fireEvent.change(field(dialog, 'URL slug'), {
      target: { value: 'summer-camp' },
    });
    fireEvent.click(within(dialog).getByTestId('create-page-submit'));
    return waitFor(() => {
      expect(createMutate).toHaveBeenCalledWith(
        {
          academyId: 'a1',
          payload: { title: 'Summer camp', slug: 'summer-camp' },
        },
        expect.anything()
      );
    }).then(async () => {
      createMutate.mock.calls[0][1].onSuccess(created);
      expect(updateMutate).not.toHaveBeenCalled();
      expect(await screen.findByText('Editor of the new page')).toBeTruthy();
    });
  });

  it('previews a template, suggests its title and a free address, and creates the page with its sections in one call', async () => {
    existingPages = [
      ...existingPages,
      {
        ...corePage('home', 'course'),
        pageType: 'custom',
        coreType: undefined,
      } as unknown as WebsitePage,
    ];
    const dialog = renderPage();
    fireEvent.click(
      within(dialog).getByRole('radio', { name: 'Course landing page' })
    );
    expect(field(dialog, 'Page title').value).toBe('Course');
    expect(field(dialog, 'URL slug').value).toBe('course-2');

    const template = findPageTemplate('courseLanding')!;
    const preview = within(dialog).getByTestId('page-template-preview');
    const rendered = within(preview)
      .getAllByRole('listitem')
      .map((item) => item.textContent);
    expect(rendered).toEqual(template.sections.map((section) => section.type));

    fireEvent.click(within(dialog).getByTestId('create-page-submit'));
    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    const [variables, callbacks] = createMutate.mock.calls[0];
    expect(variables.academyId).toBe('a1');
    expect(variables.payload.title).toBe('Course');
    expect(variables.payload.slug).toBe('course-2');
    // What was previewed is what is created — in the same request.
    expect(
      variables.payload.sections.map(
        (section: { type: string }) => section.type
      )
    ).toEqual(rendered);
    expect(
      new Set(variables.payload.sections.map((s: { id: string }) => s.id)).size
    ).toBe(template.sections.length);
    callbacks.onSuccess({ ...created, sections: variables.payload.sections });
    // No second save of the sections.
    expect(updateMutate).not.toHaveBeenCalled();
    expect(await screen.findByText('Editor of the new page')).toBeTruthy();
  });

  it('keeps a title the Owner typed when the template changes', () => {
    const dialog = renderPage();
    fireEvent.change(field(dialog, 'Page title'), {
      target: { value: 'Ms. Salma — Physics' },
    });
    fireEvent.click(
      within(dialog).getByRole('radio', { name: 'Teacher profile' })
    );
    expect(field(dialog, 'Page title').value).toBe('Ms. Salma — Physics');
    expect(field(dialog, 'URL slug').value).toBe('teacher');
    fireEvent.click(
      within(dialog).getByRole('radio', { name: 'Offers and registration' })
    );
    expect(field(dialog, 'Page title').value).toBe('Ms. Salma — Physics');
    expect(field(dialog, 'URL slug').value).toBe('offers');
  });

  it('says so, without a retry, when the API refuses the template sections — nothing was created', async () => {
    createError = {
      kind: 'validation',
      messageKey: 'errors.validation.failed',
      status: 400,
      violations: [
        { field: '2.config.items', messageKey: 'validation:tooMany' },
      ],
    };
    const dialog = renderPage();
    fireEvent.click(
      within(dialog).getByRole('radio', { name: 'About the academy' })
    );
    const alert = within(dialog).getByTestId('template-sections-rejected');
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.textContent).toContain('The page was not created');
    // Sending the same refused sections again cannot succeed: no retry.
    expect(within(dialog).queryByRole('button', { name: /try again/i })).toBe(
      null
    );
    // The Owner can choose again; choosing clears the refusal.
    for (const radio of within(dialog).getAllByRole('radio')) {
      expect((radio as HTMLInputElement).disabled).toBe(false);
    }
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Blank page' }));
    expect(createReset).toHaveBeenCalled();
    expect(updateMutate).not.toHaveBeenCalled();
  });

  it('keeps the ordinary retry for a failure that is not about the sections', () => {
    createError = { kind: 'network', messageKey: 'errors.network', status: 0 };
    const dialog = renderPage();
    fireEvent.click(
      within(dialog).getByRole('radio', { name: 'About the academy' })
    );
    expect(within(dialog).queryByTestId('template-sections-rejected')).toBe(
      null
    );
    expect(within(dialog).getByRole('alert')).toBeTruthy();
  });
});
