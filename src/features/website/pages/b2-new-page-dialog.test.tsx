/**
 * B2 (UX audit) — the "New page" dialog, EN and AR:
 * - V09: a taken or reserved address shows on the address field; any other
 *   failure is ONE alert inside the dialog with the real reason (the hook
 *   is `inlineErrors`: no toast under the overlay), never "Unexpected error";
 * - V10: a server length refusal without its number reads as a sentence,
 *   with the field's label and the form's own limit;
 * - V19: both fields are marked required; an empty address says
 *   "required" once, not also "at least 2 characters";
 * - V11: Escape with typed input asks before discarding it;
 * - V34: core pages keep their Arabic names in the list.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
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
import { createApiError } from '@services';
import type { WebsiteConfiguration, WebsitePage } from '@types';
import WebsitePagesPage from './WebsitePagesPage';

const createMutate = vi.fn();
const confirm = vi.fn();
let createError: unknown = null;

const corePage = (coreType: string, slug: string, title: string) =>
  ({
    id: `page-${slug}`,
    academyId: 'a1',
    pageType: 'core',
    coreType,
    title,
    slug,
    visible: true,
    seo: {},
    sections: [],
    version: 1,
    createdAt: '',
    updatedAt: '',
  }) as unknown as WebsitePage;

vi.mock('../hooks', () => ({
  useCreateWebsitePage: () => ({
    mutate: createMutate,
    reset: vi.fn(),
    isPending: false,
    error: createError,
  }),
  useUpdateWebsitePage: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteWebsitePage: () => ({ mutate: vi.fn(), isPending: false }),
  useWebsitePages: () => ({
    data: {
      items: [
        corePage('home', 'home', 'Home'),
        corePage('about', 'about', 'About'),
      ],
    },
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
  useConfirmDialog: () => ({ confirm }),
}));
vi.mock('../renderer', () => ({ WebsiteRenderer: () => null }));

function renderPage(language: 'en' | 'ar' = 'en') {
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter initialEntries={['/a1/pages']}>
        <Routes>
          <Route path="/:academyId/pages" element={<WebsitePagesPage />} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>
  );
}
function openDialog(language: 'en' | 'ar' = 'en') {
  renderPage(language);
  fireEvent.click(
    screen.getByRole('button', {
      name: language === 'en' ? 'New page' : /صفحة جديدة/,
    })
  );
  return screen.getByTestId('create-page-dialog');
}
/** The refusal arrives while the dialog is open (after a submit). */
function refuse(dialog: HTMLElement, error: unknown) {
  createError = error;
  // Any edit re-renders the dialog, which reads the mutation's error.
  fireEvent.change(field(dialog, 'Page title'), {
    target: { value: 'Summer camp' },
  });
}
const field = (dialog: HTMLElement, name: string | RegExp) =>
  within(dialog).getByLabelText(
    typeof name === 'string' ? new RegExp(`^${name}`) : name
  ) as HTMLInputElement;

beforeEach(() => {
  createMutate.mockReset();
  confirm.mockReset().mockResolvedValue(false);
  createError = null;
});
afterEach(cleanup);

describe('B2 V09 — every failure inside the dialog, once', () => {
  it('a taken address is on the address field, with focus', async () => {
    const dialog = openDialog();
    refuse(
      dialog,
      createApiError('conflict', { messageKey: 'errors.website.slugTaken' })
    );
    const slug = field(dialog, 'URL slug');
    await waitFor(() => expect(slug.getAttribute('aria-invalid')).toBe('true'));
    expect(dialog.textContent).toContain(
      'Another page already uses that address.'
    );
    expect(dialog.textContent).not.toContain('Unexpected error');
    expect(within(dialog).queryByTestId('save-failed')).toBeNull();
    expect(document.activeElement).toBe(slug);
  });

  it('a reserved address, in Arabic', async () => {
    const dialog = openDialog('ar');
    createError = createApiError('conflict', {
      messageKey: 'errors.website.slugReserved',
    });
    fireEvent.change(within(dialog).getAllByRole('textbox')[0], {
      target: { value: 'Summer camp' },
    });
    await waitFor(() =>
      expect(dialog.textContent).toContain(
        'هذا العنوان محجوز. اختر عنوانًا آخر.'
      )
    );
  });

  it('a server error is one alert in the dialog with the reason and Try again', () => {
    createError = createApiError('server', { messageKey: 'errors.internal' });
    const dialog = openDialog();
    const alert = within(dialog).getByTestId('save-failed');
    expect(alert.textContent).toContain('The page wasn’t created');
    expect(alert.textContent).not.toContain('Unexpected error');
    expect(
      within(alert).getByRole('button', { name: 'Try again' })
    ).toBeTruthy();
  });

  it('offline says so', () => {
    createError = createApiError('network', { messageKey: 'errors.network' });
    const dialog = openDialog();
    expect(within(dialog).getByTestId('save-failed').textContent).toContain(
      'Check your connection'
    );
  });
});

describe('B2 V10 — a server length refusal reads as a sentence', () => {
  it('names the field and the limit the API left out', async () => {
    const dialog = openDialog();
    refuse(
      dialog,
      createApiError('validation', {
        messageKey: 'errors.validation.failed',
        violations: [{ field: 'title', messageKey: 'validation:maxLength' }],
      })
    );
    await waitFor(() =>
      expect(dialog.textContent).toContain(
        'Page title must be 100 characters or fewer'
      )
    );
    expect(dialog.textContent).not.toContain('{{count}}');
    expect(within(dialog).queryByTestId('save-failed')).toBeNull();
  });
});

describe('B2 V19 — required fields, one message each', () => {
  it('both fields carry the required mark', () => {
    const dialog = openDialog();
    expect(field(dialog, 'Page title').getAttribute('aria-required')).toBe(
      'true'
    );
    expect(field(dialog, 'URL slug').getAttribute('aria-required')).toBe(
      'true'
    );
    expect(
      dialog.querySelectorAll('label .text-destructive').length
    ).toBeGreaterThanOrEqual(2);
  });

  it('an empty address says "required", only', async () => {
    const dialog = openDialog();
    fireEvent.change(field(dialog, 'Page title'), {
      target: { value: 'Summer camp' },
    });
    await act(async () => {
      fireEvent.click(within(dialog).getByTestId('create-page-submit'));
    });
    await waitFor(() =>
      expect(dialog.textContent).toContain('This field is required')
    );
    expect(dialog.textContent).not.toContain('at least 2 characters');
    expect(createMutate).not.toHaveBeenCalled();
  });
});

describe('B2 V11 — closing with typed input asks first', () => {
  it('Escape asks; staying keeps the dialog and what was typed', async () => {
    const dialog = openDialog();
    fireEvent.change(field(dialog, 'Page title'), {
      target: { value: 'Summer camp' },
    });
    await act(async () => {
      fireEvent.keyDown(dialog, { key: 'Escape' });
    });
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(screen.getByTestId('create-page-dialog')).toBeTruthy();
    expect(field(dialog, 'Page title').value).toBe('Summer camp');
  });

  it('a clean dialog closes without asking', async () => {
    const dialog = openDialog();
    await act(async () => {
      fireEvent.keyDown(dialog, { key: 'Escape' });
    });
    expect(confirm).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByTestId('create-page-dialog')).toBeNull()
    );
  });
});

describe('B2 V34 — core pages keep their Arabic names', () => {
  it('Home and About read الرئيسية and من نحن on the Arabic dashboard', () => {
    renderPage('ar');
    expect(document.body.textContent).toContain('الرئيسية');
    expect(document.body.textContent).toContain('من نحن');
  });
});

describe('J47 — page addresses are LTR values on the Arabic dashboard', () => {
  it('each address in the list, and the sign-in/sign-up targets, carry the LTR-value marker', () => {
    renderPage('ar');
    for (const address of ['/home', '/about', '/sign-in', '/sign-up']) {
      const value = Array.from(document.querySelectorAll('bdi')).find(
        (element) => element.textContent === address
      );
      expect(value, address).toBeTruthy();
      expect(value!.getAttribute('dir')).toBe('ltr');
      expect(value!.hasAttribute('data-ltr-content')).toBe(true);
    }
    // No element is forced LTR without saying it holds an LTR value.
    expect(
      document.querySelectorAll('[dir="ltr"]:not([data-ltr-content])')
    ).toHaveLength(0);
  });

  it('the new page dialog’s address field is marked too', () => {
    const dialog = openDialog('ar');
    const slug = field(dialog, 'الرابط المختصر');
    expect(slug.getAttribute('dir')).toBe('ltr');
    expect(slug.hasAttribute('data-ltr-content')).toBe(true);
  });
});
