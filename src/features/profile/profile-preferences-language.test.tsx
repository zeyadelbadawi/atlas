/**
 * B1 (UX audit, V15) — Profile › Preferences, language save.
 *
 * The language used to switch BEFORE the save: a failed save left the page
 * right-to-left with English text, kept the unsaved language after a
 * reload, and reported the failure in a language the page had not switched
 * to. Now nothing changes until the save succeeds, and a failure says so
 * once, in the language actually on screen.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { ApiError } from '@api';

beforeAll(() => {
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      };
  }
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});

const state = vi.hoisted(() => ({
  error: null as unknown,
  succeed: false,
  mutate: vi.fn(),
  setLanguage: vi.fn(),
  setPreference: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock('./hooks', () => ({
  useUpdatePreferences: () => ({
    mutate: state.mutate,
    isPending: false,
    error: state.error,
  }),
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useLanguage: () => ({ language: 'en', setLanguage: state.setLanguage }),
  useTheme: () => ({ preference: 'light', setPreference: state.setPreference }),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useToast: () => ({ notifySuccess: state.notifySuccess }),
}));
vi.mock('@features/notifications', () => ({
  CommunicationPreferencesPanel: () => null,
}));

const { ProfilePreferencesSection } =
  await import('./components/ProfilePreferencesSection');

function renderSection() {
  const i18n = createI18nInstance('en');
  const view = render(
    <I18nextProvider i18n={i18n}>
      <ProfilePreferencesSection />
    </I18nextProvider>
  );
  return { i18n, view };
}

async function chooseArabicAndSave() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: 'Language' }));
  await user.click(await screen.findByRole('option', { name: 'Arabic' }));
  await user.click(screen.getByRole('button', { name: /Save/ }));
}

afterEach(() => {
  cleanup();
  state.error = null;
  vi.clearAllMocks();
});

describe('ProfilePreferencesSection — language', () => {
  it('does not switch the language while the save has not succeeded', async () => {
    const { i18n, view } = renderSection();
    await chooseArabicAndSave();
    expect(state.mutate).toHaveBeenCalledTimes(1);
    expect(state.mutate.mock.calls[0][0]).toEqual({
      language: 'ar',
      theme: 'light',
    });

    // The save fails.
    state.error = new ApiError({
      kind: 'server',
      messageKey: 'errors.internal',
      status: 500,
      retryable: true,
    });
    view.rerender(
      <I18nextProvider i18n={i18n}>
        <ProfilePreferencesSection />
      </I18nextProvider>
    );

    expect(state.setLanguage).not.toHaveBeenCalled();
    expect(state.setPreference).not.toHaveBeenCalled();
    const alert = screen.getByTestId('save-failed');
    // In English — the language still on screen.
    expect(alert.textContent).toContain(
      "Your language and theme weren't saved, so nothing has changed"
    );
    expect(alert.textContent).toContain('Something failed on our side');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.queryByText('Unexpected error')).toBeNull();
  });

  it('switches the language once the save succeeded', async () => {
    state.mutate.mockImplementation(
      (_payload: unknown, handlers?: { onSuccess?: () => Promise<void> }) =>
        void handlers?.onSuccess?.()
    );
    renderSection();
    await chooseArabicAndSave();
    await waitFor(() => expect(state.setLanguage).toHaveBeenCalledWith('ar'));
    expect(state.setPreference).not.toHaveBeenCalled();
    // Confirmed by the app toast, in the language the page now shows.
    await waitFor(() =>
      expect(state.notifySuccess).toHaveBeenCalledWith(
        'profile:success.preferencesUpdated',
        'profile:success.changesApplied',
        { lng: 'ar' }
      )
    );
  });
});
