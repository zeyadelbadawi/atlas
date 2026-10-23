/**
 * B0-LRN-05 / B0-COM-05 — an academy saved in a currency that predates the
 * EGP-only rule (the seeded academies are USD) keeps it on Settings and on
 * the profile: the picker shows it and Save sends it.
 *
 * Regression: both pages built the currency options from the field's own
 * value. The form mounts when the academy arrives, one render BEFORE
 * react-hook-form applies `values`, so that render offered EGP alone; the
 * value then became USD, Radix's hidden native <select> had no USD option,
 * reported "" and the form took it as a change. The field was left empty,
 * failed validation, and Save sent nothing (journey J38d). The options now
 * come from the academy as saved, so the saved currency is offered from the
 * first render.
 *
 * Native DOM assertions only — this repo does not ship jest-dom.
 */
import { AtlasDialogProvider } from '@app/providers/dialog/DialogProvider';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import type { Academy } from '@types';

const academy = {
  id: 'aca-1',
  organizationId: 'org-1',
  name: 'Horizon Academy',
  slug: 'horizon',
  description: 'Learn things',
  status: 'active',
  language: 'en',
  timezone: 'UTC',
  currency: 'USD',
  contactEmail: null,
  contactPhone: null,
  website: null,
  address: { country: 'US' },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
} as unknown as Academy;

// The academy query: loading first, then the academy — as in the browser.
const query = vi.hoisted(() => ({ loaded: false }));
const updateAcademy = vi.fn(async () => academy);

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({
    organization: { id: 'org-1', role: 'owner' },
    user: { id: 'u-1', name: 'Owner' },
  }),
  useUnsavedChanges: () => ({ markSaved: () => undefined }),
  usePermissions: () => ({ hasPermission: () => true }),
  usePlatform: () => ({ setActiveAcademy: vi.fn() }),
}));
vi.mock('@features/domain', () => ({
  useAcademyDomain: () => ({ data: undefined }),
}));
vi.mock('@forms', () => ({
  useServerValidation: () => undefined,
  useNameConflictError: () => null,
  nameConflictFromError: () => null,
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn(), useToast: () => ({}) }));
vi.mock('./hooks', () => ({
  useAcademy: () =>
    query.loaded
      ? { data: academy, isLoading: false, error: null, refetch: vi.fn() }
      : { data: undefined, isLoading: true, error: null, refetch: vi.fn() },
  useUpdateAcademy: () => ({
    mutateAsync: updateAcademy,
    isPending: false,
    error: null,
  }),
}));
for (const card of [
  'DeleteAcademyCard',
  'RegistrationPolicyCard',
  'CommunicationSettingsCard',
  'AcademyInvitesCard',
  'ContentProtectionCard',
  'VideoTierCard',
  'DevicePolicyCard',
]) {
  vi.doMock(`./components/${card}`, () => ({ [card]: () => null }));
}

const { default: AcademySettingsPage } =
  await import('./pages/AcademySettingsPage');
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
  query.loaded = false;
});

function renderLoadingThenLoaded(path: string, element: JSX.Element) {
  const tree = () => (
    <I18nextProvider i18n={createI18nInstance('en')}>
      <AtlasDialogProvider>
        <MemoryRouter initialEntries={[`/dashboard/academy/aca-1/${path}`]}>
          <Routes>
            <Route
              path={`/dashboard/academy/:academyId/${path}`}
              element={element}
            />
          </Routes>
        </MemoryRouter>
      </AtlasDialogProvider>
    </I18nextProvider>
  );
  const view = render(tree());
  query.loaded = true;
  view.rerender(tree());
  return userEvent.setup();
}

async function savedCurrency(
  user: ReturnType<typeof userEvent.setup>,
  button: RegExp
): Promise<string> {
  await user.click(screen.getByRole('button', { name: button }));
  await waitFor(() => expect(updateAcademy).toHaveBeenCalledTimes(1));
  const call = updateAcademy.mock.calls[0] as unknown as [
    { payload: { currency: string } },
  ];
  return call[0].payload.currency;
}

describe('a legacy academy currency survives the page load', () => {
  it('Settings shows USD and Save sends it', async () => {
    const user = renderLoadingThenLoaded('settings', <AcademySettingsPage />);
    const currency = await screen.findByRole('combobox', { name: 'Currency' });
    await waitFor(() => expect(currency.textContent).toContain('USD'));
    // The save bar appears once something changes: edit an unrelated field.
    await user.type(screen.getByLabelText('Academy Name'), ' 2');
    expect(await savedCurrency(user, /^save settings$/i)).toBe('USD');
  });

  it('the profile shows USD and Save sends it', async () => {
    const user = renderLoadingThenLoaded('profile', <AcademyProfilePage />);
    const currency = await screen.findByRole('combobox', { name: 'Currency' });
    await waitFor(() => expect(currency.textContent).toContain('USD'));
    expect(await savedCurrency(user, /save changes/i)).toBe('USD');
  });
});
