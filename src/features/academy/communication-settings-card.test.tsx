/**
 * Academy communication settings (P66).
 *
 * Owner-only, like the registration policy: the Client Owner can change
 * the emailed-code policy and the chosen value is exactly what is sent;
 * a Manager sees every control disabled and the reason, instead of a
 * change that can only 403. Turning codes OFF is the one choice with a
 * real security cost, so the card says so the moment it is selected.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { ApiError } from '@api';
import type { AcademyCommunicationSettings } from '@types';

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}

let settings: AcademyCommunicationSettings = {
  emailOtpPolicy: 'inherit',
  announcementEmailAllowed: true,
  learnerDigestDefault: 'daily',
};
let failure: Pick<ApiError, 'kind' | 'messageKey'> | null = null;

const mutate = vi.fn(
  (
    payload: Partial<AcademyCommunicationSettings>,
    handlers?: {
      readonly onSuccess?: (data: unknown) => void;
      readonly onError?: (error: unknown) => void;
    }
  ) => {
    if (failure) handlers?.onError?.(failure);
    else handlers?.onSuccess?.({ ...settings, ...payload });
  }
);
const notifySuccess = vi.fn();
const notifyError = vi.fn();

vi.mock('./hooks', () => ({
  useAcademyCommunicationSettings: () => ({
    data: settings,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useUpdateAcademyCommunicationSettings: () => ({
    mutate,
    isPending: false,
    error: failure,
  }),
}));

vi.mock('@app/providers', () => ({
  useToast: () => ({ notifySuccess, notifyError }),
}));

const { CommunicationSettingsCard } =
  await import('./components/CommunicationSettingsCard');

const i18n = createI18nInstance('en');

afterEach(() => {
  cleanup();
  failure = null;
  settings = {
    emailOtpPolicy: 'inherit',
    announcementEmailAllowed: true,
    learnerDigestDefault: 'daily',
  };
  vi.clearAllMocks();
});

function renderCard(canEdit: boolean) {
  return render(
    <I18nextProvider i18n={i18n}>
      <CommunicationSettingsCard academyId="academy-1" canEdit={canEdit} />
    </I18nextProvider>
  );
}

describe('CommunicationSettingsCard', () => {
  it('shows the current policy and lets the owner change it, sending only that field', () => {
    renderCard(true);

    expect(
      screen
        .getByRole('radio', { name: /use the platform default/i })
        .getAttribute('aria-checked')
    ).toBe('true');

    fireEvent.click(screen.getByRole('radio', { name: /every sign-in/i }));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({ emailOtpPolicy: 'always' });
    expect(notifySuccess).toHaveBeenCalledWith('academy:communication.saved');
  });

  it('saves the announcement switch as its own field', () => {
    renderCard(true);
    fireEvent.click(screen.getByRole('switch', { name: /announcements by email/i }));
    expect(mutate.mock.calls[0][0]).toEqual({
      announcementEmailAllowed: false,
    });
  });

  it('warns the moment sign-in codes are off', () => {
    settings = { ...settings, emailOtpPolicy: 'off' };
    renderCard(true);
    expect(screen.getByRole('status').textContent).toMatch(
      /sign-in codes are off/i
    );
  });

  it('shows a manager the restriction with every control disabled', () => {
    renderCard(false);

    expect(
      screen.getByText(/only the account owner can change communication/i)
    ).toBeTruthy();
    expect(
      screen.getByRole('radio', { name: /every sign-in/i }).hasAttribute('disabled')
    ).toBe(true);
    expect(
      screen
        .getByRole('switch', { name: /announcements by email/i })
        .hasAttribute('disabled')
    ).toBe(true);
    expect(
      screen
        .getByRole('combobox', { name: /default digest/i })
        .hasAttribute('disabled')
    ).toBe(true);
    expect(mutate).not.toHaveBeenCalled();
  });

  it('turns the server’s insufficient-role refusal into that explanation', () => {
    failure = {
      kind: 'forbidden',
      messageKey: 'errors.academy.insufficientRole',
    } as Pick<ApiError, 'kind' | 'messageKey'>;
    renderCard(true);

    fireEvent.click(screen.getByRole('radio', { name: /every sign-in/i }));

    expect(notifyError).toHaveBeenCalledWith(
      'academy:students.errors.insufficientRole'
    );
    expect(screen.getByRole('alert').textContent).toMatch(
      /role on this academy does not allow/i
    );
  });
});
