/**
 * B2 (UX audit) — the FAQ entry dialog, EN and AR:
 * - V09: a failure no field explains is ONE alert in the dialog with the
 *   real reason (no "Unexpected error", no toast under the overlay);
 * - V10: `question.en` + `validation:maxLength` without a number lands on
 *   the field with its translated label and the form's limit — never
 *   "En must be {{count}} characters or fewer";
 * - V19: all four fields are marked required, and the dialog says why
 *   (the library keeps entries in both languages — the API requires it);
 * - V11: Escape with typed input asks before discarding it.
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
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import { createApiError } from '@services';
import { WebsiteFaqContentTab } from './WebsiteFaqContentTab';

const confirm = vi.fn();
let createError: unknown = null;
const { idle } = vi.hoisted(() => ({
  idle: () => ({
    mutate: () => undefined,
    reset: () => undefined,
    isPending: false,
    error: null,
  }),
}));

vi.mock('../hooks', () => ({
  useWebsiteFaqEntries: () => ({
    data: { items: [] },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateWebsiteFaqEntry: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    error: createError,
  }),
  useUpdateWebsiteFaqEntry: idle,
  usePublishWebsiteFaqEntry: idle,
  useArchiveWebsiteFaqEntry: idle,
  useSwapWebsiteFaqEntryOrder: idle,
}));
vi.mock('../hooks/useEditWebsiteFaqEntry', () => ({
  useEditWebsiteFaqEntry: idle,
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  usePermissions: () => ({ hasPermission: () => true }),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useConfirmDialog: () => ({ confirm }),
}));

function openDialog(language: 'en' | 'ar' = 'en') {
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter>
        <WebsiteFaqContentTab academyId="a1" />
      </MemoryRouter>
    </I18nextProvider>
  );
  fireEvent.click(
    screen.getByRole('button', {
      name: language === 'en' ? 'New FAQ entry' : 'سؤال شائع جديد',
    })
  );
  return screen.getByRole('dialog');
}
const inputs = (dialog: HTMLElement) =>
  within(dialog).getAllByRole('textbox') as HTMLInputElement[];
/** The refusal arrives while the dialog is open: any edit re-renders it. */
function refuse(dialog: HTMLElement, error: unknown) {
  createError = error;
  fireEvent.change(inputs(dialog)[0], { target: { value: 'How long?' } });
}

beforeEach(() => {
  confirm.mockReset().mockResolvedValue(false);
  createError = null;
});
afterEach(cleanup);

describe('B2 V10 — a server length refusal on its field, as a sentence', () => {
  it('EN: the label and the limit, no {{count}}', async () => {
    const dialog = openDialog();
    refuse(
      dialog,
      createApiError('validation', {
        messageKey: 'errors.validation.failed',
        violations: [
          { field: 'question.en', messageKey: 'validation:maxLength' },
        ],
      })
    );
    await waitFor(() =>
      expect(dialog.textContent).toContain(
        'Question (English) must be 200 characters or fewer'
      )
    );
    expect(dialog.textContent).not.toContain('{{count}}');
    expect(dialog.textContent).not.toContain('Unexpected error');
    expect(within(dialog).queryByTestId('save-failed')).toBeNull();
  });

  it('AR: the Arabic label and the number', async () => {
    const dialog = openDialog('ar');
    refuse(
      dialog,
      createApiError('validation', {
        messageKey: 'errors.validation.failed',
        violations: [
          { field: 'question.en', messageKey: 'validation:maxLength' },
        ],
      })
    );
    await waitFor(() =>
      expect(dialog.textContent).toContain('السؤال (بالإنجليزية)')
    );
    expect(dialog.textContent).not.toContain('{{count}}');
    expect(dialog.textContent).not.toMatch(/\bEn\b/);
  });
});

describe('B2 V09 — any other failure: one alert with the reason', () => {
  it('a server error says the entry was not created, with Try again', () => {
    const dialog = openDialog();
    refuse(dialog, createApiError('server', { messageKey: 'errors.internal' }));
    const alert = within(dialog).getByTestId('save-failed');
    expect(alert.textContent).toContain('The FAQ entry wasn’t created');
    expect(alert.textContent).not.toContain('Unexpected error');
    expect(
      within(alert).getByRole('button', { name: 'Try again' })
    ).toBeTruthy();
  });

  it('in Arabic', () => {
    const dialog = openDialog('ar');
    refuse(dialog, createApiError('network', { messageKey: 'errors.network' }));
    expect(within(dialog).getByTestId('save-failed').textContent).toContain(
      'لم يُنشأ السؤال الشائع'
    );
  });
});

describe('B2 V19 — what is required, and why', () => {
  it('marks all four fields and says the library keeps both languages', () => {
    const dialog = openDialog();
    expect(dialog.querySelectorAll('label .text-destructive')).toHaveLength(4);
    expect(dialog.textContent).toContain(
      'Library entries are kept in both languages'
    );
  });
});

describe('B2 V11 — closing with typed input asks first', () => {
  it('Escape asks; staying keeps what was typed', async () => {
    const dialog = openDialog();
    fireEvent.change(inputs(dialog)[0], { target: { value: 'How long?' } });
    await act(async () => {
      fireEvent.keyDown(dialog, { key: 'Escape' });
    });
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(inputs(screen.getByRole('dialog'))[0].value).toBe('How long?');
  });

  it('a clean dialog closes without asking', async () => {
    const dialog = openDialog();
    await act(async () => {
      fireEvent.keyDown(dialog, { key: 'Escape' });
    });
    expect(confirm).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
