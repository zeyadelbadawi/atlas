/**
 * D5-3 — on the academy profile the currency follows the country until it
 * is changed by hand: a country change moves a currency that was not
 * overridden, keeps one that was (offering the new country's default as a
 * one-click hint instead), and a country whose currency is not supported
 * yet changes nothing. Codes are what is saved, never names.
 *
 * Only EGP is supported today, so the first scenarios use a legacy stored
 * currency (USD) to make a change observable. The last block widens the
 * allow-list to EGP + SAR — simulating the day SAR opens, NOT today's
 * configuration — to exercise a manual override between two supported
 * currencies.
 *
 * Native DOM assertions only — this repo does not ship jest-dom.
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
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import type { Academy } from '@types';

let academy: Academy;

function makeAcademy(country: string, currency: string): Academy {
  return {
    id: 'aca-1',
    organizationId: 'org-1',
    name: 'Horizon Academy',
    slug: 'horizon',
    description: 'Learn things',
    status: 'active',
    language: 'en',
    timezone: 'Africa/Cairo',
    currency,
    contactEmail: null,
    contactPhone: null,
    website: null,
    address: { country },
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  } as unknown as Academy;
}

const updateAcademy = vi.fn(async () => academy);

// The allow-list the pickers and the country rule read; ['EGP'] is today's.
const allowList = vi.hoisted(() => ({ value: ['EGP'] as readonly string[] }));
vi.mock('@/shared/utils/currency.utils', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  get SUPPORTED_CURRENCIES() {
    return allowList.value;
  },
  currencyOptions: (current?: string | null) =>
    current && !allowList.value.includes(current)
      ? [...allowList.value, current]
      : allowList.value,
}));

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ organization: { id: 'org-1', role: 'owner' } }),
  useUnsavedChanges: () => ({ markSaved: () => undefined }),
}));
vi.mock('@forms', () => ({
  useServerValidation: () => undefined,
  useNameConflictError: () => null,
  nameConflictFromError: () => null,
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn(), useToast: () => ({}) }));
vi.mock('./hooks', () => ({
  useAcademy: () => ({
    data: academy,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useUpdateAcademy: () => ({
    mutateAsync: updateAcademy,
    isPending: false,
    error: null,
  }),
}));

const { default: AcademyProfilePage } =
  await import('./pages/AcademyProfilePage');

beforeAll(() => {
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      };
  }
  // Radix Select and cmdk need these in jsdom.
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => undefined;
  Element.prototype.scrollIntoView ??= () => undefined;
});

afterEach(() => {
  cleanup();
  updateAcademy.mockClear();
});

function renderPage(
  country: string,
  currency: string,
  language: 'en' | 'ar' = 'en'
) {
  academy = makeAcademy(country, currency);
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
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
  return userEvent.setup();
}

async function pickCountry(
  user: ReturnType<typeof userEvent.setup>,
  code: string
) {
  await user.click(screen.getByTestId('country-select-trigger'));
  await user.click(await screen.findByTestId(`country-option-${code}`));
}

async function pickCurrency(
  user: ReturnType<typeof userEvent.setup>,
  code: string
) {
  await user.click(screen.getByRole('combobox', { name: 'Currency' }));
  await user.click(await screen.findByRole('option', { name: code }));
}

function currencyShown(): string {
  return screen.getByRole('combobox', { name: 'Currency' }).textContent ?? '';
}

async function savedPayload(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /save changes/i }));
  await waitFor(() => expect(updateAcademy).toHaveBeenCalledTimes(1));
  const call = updateAcademy.mock.calls[0] as unknown as [
    { payload: { currency: string; address: { country: string } } },
  ];
  return call[0].payload;
}

describe(
  'academy profile — country → currency (D5-3)',
  { timeout: 20_000 },
  () => {
    it('choosing Egypt sets EGP when the currency was not overridden, and saves codes', async () => {
      // No country yet: nothing to have overridden.
      const user = renderPage('', 'USD');
      expect(currencyShown()).toContain('USD');

      await pickCountry(user, 'EG');
      expect(
        screen.getByTestId('country-select-trigger').textContent
      ).toContain('Egypt');
      expect(currencyShown()).toContain('EGP');
      expect(screen.queryByTestId('currency-country-hint')).toBeNull();

      const payload = await savedPayload(user);
      expect(payload.address.country).toBe('EG');
      expect(payload.currency).toBe('EGP');
    });

    it("a saved currency that differs from its country's default loads as an override", async () => {
      const user = renderPage('EG', 'USD');
      expect(screen.getByTestId('currency-country-hint').textContent).toContain(
        'Default for Egypt is EGP.'
      );

      await pickCountry(user, 'SA');
      await pickCountry(user, 'EG');
      expect(currencyShown()).toContain('USD');

      const payload = await savedPayload(user);
      expect(payload.currency).toBe('USD');
      expect(payload.address.country).toBe('EG');
    });

    it('a country whose currency is not supported yet leaves the currency alone', async () => {
      const user = renderPage('EG', 'EGP');
      await pickCountry(user, 'SA');
      expect(currencyShown()).toContain('EGP');
      expect(screen.queryByTestId('currency-country-hint')).toBeNull();

      const payload = await savedPayload(user);
      expect(payload.address.country).toBe('SA');
      expect(payload.currency).toBe('EGP');
    });

    it('says what the currency drives, and never claims a conversion', () => {
      renderPage('EG', 'EGP');
      const help = screen.getByText(/default currency for new course prices/i);
      expect(help.textContent).toMatch(/nothing is converted/i);
    });

    it('names countries in Arabic and still saves the code', async () => {
      const user = renderPage('', 'USD', 'ar');
      await pickCountry(user, 'EG');
      const trigger = screen.getByTestId('country-select-trigger');
      expect(trigger.textContent).not.toContain('Egypt');
      expect(trigger.textContent).toContain('مصر');

      await user.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));
      await waitFor(() => expect(updateAcademy).toHaveBeenCalledTimes(1));
      const call = updateAcademy.mock.calls[0] as unknown as [
        { payload: { currency: string; address: { country: string } } },
      ];
      expect(call[0].payload.address.country).toBe('EG');
      expect(call[0].payload.currency).toBe('EGP');
    });
  }
);

describe(
  'academy profile — with SAR also allowed (simulated future allow-list)',
  { timeout: 20_000 },
  () => {
    beforeEach(() => {
      allowList.value = ['EGP', 'SAR'];
    });
    afterEach(() => {
      allowList.value = ['EGP'];
    });

    it('a currency that was not overridden follows the country', async () => {
      const user = renderPage('EG', 'EGP');
      await pickCountry(user, 'SA');
      expect(currencyShown()).toContain('SAR');
      await pickCountry(user, 'EG');
      expect(currencyShown()).toContain('EGP');
    });

    it('a manual pick is kept on a country change, with a one-click hint', async () => {
      const user = renderPage('EG', 'EGP');
      await pickCurrency(user, 'SAR');
      await pickCountry(user, 'SA');
      await pickCountry(user, 'EG');
      expect(currencyShown()).toContain('SAR');
      expect(screen.getByTestId('currency-country-hint').textContent).toContain(
        'Default for Egypt is EGP.'
      );

      // Taking the hint makes the currency follow the country again.
      await user.click(screen.getByRole('button', { name: 'Use EGP' }));
      expect(currencyShown()).toContain('EGP');
      expect(screen.queryByTestId('currency-country-hint')).toBeNull();
      await pickCountry(user, 'SA');
      expect(currencyShown()).toContain('SAR');

      const payload = await savedPayload(user);
      expect(payload).toMatchObject({
        currency: 'SAR',
        address: { country: 'SA' },
      });
    });
  }
);
