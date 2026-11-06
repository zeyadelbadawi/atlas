/**
 * B4 (UX audit) — Academy Profile and Settings › Details:
 *   V04 contact phone and address are checked before sending;
 *   V10 a field refusal marks the field only (incl. `address.postalCode`),
 *       anything else is ONE inline message with the real reason;
 *   V21 a changed web address asks first, saying it moves the site and
 *       locks the address for 60 days;
 *   V25 free-text fields follow their content's direction.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import { createApiError } from '@api';
import type { ApiError } from '@api';
import type { Academy } from '@types';
import { isValidContactPhone } from './schemas/academy.schemas';

const state = vi.hoisted(() => ({
  error: null as ApiError | null,
  update: vi.fn(),
  confirm: vi.fn(),
  toast: vi.fn(),
}));

const ACADEMY = {
  id: 'aca-1',
  organizationId: 'org-1',
  name: 'Horizon Academy',
  slug: 'horizon',
  description: 'Learn things',
  status: 'active',
  language: 'en',
  timezone: 'Africa/Cairo',
  currency: 'EGP',
  contactEmail: null,
  contactPhone: null,
  website: null,
  address: { country: 'EG' },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
} as unknown as Academy;

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ organization: { id: 'org-1', role: 'owner' } }),
  useUnsavedChanges: () => ({ markSaved: () => undefined }),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@app/providers')>()),
  useConfirmDialog: () => ({ confirm: state.confirm }),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: state.toast, useToast: () => ({}) }));
vi.mock('./hooks', () => ({
  useAcademy: () => ({
    data: ACADEMY,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useUpdateAcademy: () => ({
    mutateAsync: state.update,
    isPending: false,
    error: state.error,
  }),
}));

const { default: AcademyProfilePage } = await import(
  './pages/AcademyProfilePage'
);

beforeAll(() => {
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      };
  }
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.scrollIntoView ??= () => undefined;
});

afterEach(() => {
  cleanup();
  state.error = null;
  state.update.mockReset();
  state.confirm.mockReset();
  state.toast.mockReset();
});

const I18N = { en: createI18nInstance('en'), ar: createI18nInstance('ar') };

function page(language: 'en' | 'ar' = 'en') {
  return (
    <I18nextProvider i18n={I18N[language]}>
      <MemoryRouter initialEntries={['/dashboard/academy/aca-1/profile']}>
        <Routes>
          <Route
            path="/dashboard/academy/:academyId/profile"
            element={<AcademyProfilePage />}
          />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>
  );
}

function input(name: string): HTMLInputElement {
  return document.querySelector(`[name="${name}"]`) as HTMLInputElement;
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
}

describe('contact phone rule (V04)', () => {
  it.each([
    ['+20 100 123 4567', true],
    ['(02) 2345-6789', true],
    ['', true],
    ['٠١٠٠١٢٣٤٥٦٧', true],
    ['abc-phone', false],
    ['12', false],
    ['+1 234 567 890 123 456 78', false],
    ['020.123.4567', false],
  ])('%s → %s', (value, ok) => {
    expect(isValidContactPhone(value)).toBe(ok);
  });
});

describe('Academy Profile — checks before sending (V04)', () => {
  it('refuses a bad phone, a long street and a bad postal code, each with its message', async () => {
    render(page());
    fireEvent.change(input('contactPhone'), { target: { value: 'abc-phone' } });
    fireEvent.change(input('street'), { target: { value: 'x'.repeat(600) } });
    fireEvent.change(input('postalCode'), {
      target: { value: 'ABC-!!-999999999' },
    });
    submit();
    expect(
      await screen.findByText(/Enter a phone number with 7 to 15 digits/)
    ).toBeTruthy();
    expect(screen.getByText(/must be 200 characters or fewer/)).toBeTruthy();
    expect(
      screen.getByText(
        'Use 2 to 20 letters, digits, spaces or hyphens, like 11511.'
      )
    ).toBeTruthy();
    expect(state.update).not.toHaveBeenCalled();
  });

  it('says it in Arabic too', async () => {
    render(page('ar'));
    fireEvent.change(input('contactPhone'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: /حفظ/ }));
    expect(await screen.findByText(/أدخل رقم هاتف من 7 إلى 15 رقمًا/)).toBeTruthy();
  });

  it('description and names follow their content’s direction (V25)', () => {
    render(page('ar'));
    expect(input('description').getAttribute('dir')).toBe('auto');
    expect(input('name').getAttribute('dir')).toBe('auto');
    expect(input('contactEmail').getAttribute('dir')).toBe('ltr');
  });
});

describe('Academy Profile — failed saves (V10)', () => {
  it('a server address.postalCode violation lands on Postal Code only', async () => {
    const error = createApiError('validation', {
      violations: [
        { field: 'address.postalCode', messageKey: 'validation:invalid' },
      ],
    });
    state.update.mockRejectedValue(error);
    const view = render(page());
    fireEvent.change(input('postalCode'), { target: { value: '11511' } });
    submit();
    await waitFor(() => expect(state.update).toHaveBeenCalled());
    state.error = error;
    view.rerender(page());
    expect(await screen.findByText('Postal Code is not valid')).toBeTruthy();
    expect(screen.queryByTestId('save-failed')).toBeNull();
    expect(state.toast).toHaveBeenCalledTimes(0);
  });

  it.each([
    ['conflict', 'Reload the page to see the latest version'],
    ['network', 'Check your connection'],
    ['server', 'Something failed on our side'],
  ] as const)('a %s is one inline message with the real reason', async (kind, text) => {
    state.update.mockRejectedValue(createApiError(kind));
    render(page());
    fireEvent.change(input('city'), { target: { value: 'Cairo' } });
    submit();
    const alert = await screen.findByTestId('save-failed');
    expect(alert.textContent).toContain("Your changes weren't saved");
    expect(alert.textContent).toContain(text);
    expect(state.toast).not.toHaveBeenCalled();
  });
});

describe('changing the web address (V21)', () => {
  it('asks first, naming the move and the 60-day lock; Cancel sends nothing', async () => {
    state.confirm.mockResolvedValue(false);
    render(page());
    fireEvent.change(input('slug'), { target: { value: 'horizon-new' } });
    submit();
    await waitFor(() => expect(state.confirm).toHaveBeenCalled());
    const request = state.confirm.mock.calls[0][0];
    expect(request.titleKey).toBe('academy:settings.slugConfirm.title');
    expect(request.values).toEqual({ from: 'horizon', to: 'horizon-new' });
    expect(I18N.en.t(request.descriptionKey, request.values)).toMatch(
      /moves from horizon to horizon-new.*60 days/
    );
    expect(state.update).not.toHaveBeenCalled();
  });

  it('saves after the owner confirms; an unchanged address never asks', async () => {
    state.confirm.mockResolvedValue(true);
    state.update.mockResolvedValue(ACADEMY);
    render(page());
    fireEvent.change(input('city'), { target: { value: 'Cairo' } });
    submit();
    await waitFor(() => expect(state.update).toHaveBeenCalled());
    expect(state.confirm).not.toHaveBeenCalled();
  });
});
