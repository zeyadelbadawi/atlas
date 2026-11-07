/**
 * The change-password form's failures, one message each, in the person's
 * language.
 *
 * B0-SEC-11 — when the server refuses a new password as too common, the
 * form says so on the password field instead of a generic card.
 *
 * B1 (UX audit, V09) — a wrong current password (401
 * `errors.auth.invalidCurrentPassword`) is shown on the current-password
 * field: no "Unexpected error" card and no "Your session has expired". Any
 * other failure is one inline message with the real reason. V23: the
 * three fields are marked required.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { ApiError } from '@api';
import { ProfileSecuritySection } from './ProfileSecuritySection';

const state = vi.hoisted(() => ({
  error: null as unknown,
  mutate: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock('../hooks', () => ({
  useChangePassword: () => ({
    mutate: state.mutate,
    mutateAsync: vi.fn(),
    isPending: false,
    error: state.error,
  }),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useToast: () => ({ notifySuccess: state.notifySuccess }),
}));
vi.mock('./ProfileSessionsCard', () => ({
  ProfileSessionsCard: () => null,
}));
vi.mock('./TrustedDevicesCard', () => ({
  TrustedDevicesCard: () => null,
}));
vi.mock('./TwoFactorCard', () => ({
  TwoFactorCard: () => null,
}));
vi.mock('./SignInMethodsCard', () => ({
  SignInMethodsCard: () => null,
}));

function renderSection(language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <ProfileSecuritySection />
    </I18nextProvider>
  );
}

const fieldMessage = (id: string): Promise<HTMLElement> =>
  waitFor(() => {
    const node = document.getElementById(`${id}-error`);
    if (!node) throw new Error(`no message on ${id}`);
    return node;
  });

const WRONG_CURRENT = () =>
  new ApiError({
    kind: 'unauthorized',
    messageKey: 'errors.auth.invalidCurrentPassword',
    status: 401,
    retryable: false,
  });

afterEach(() => {
  cleanup();
  state.error = null;
  vi.clearAllMocks();
});

describe('ProfileSecuritySection change password', () => {
  it('confirms a changed password with the app toast and clears the form', async () => {
    state.mutate.mockImplementation(
      (_payload: unknown, handlers?: { onSuccess?: () => void }) =>
        handlers?.onSuccess?.()
    );
    renderSection();
    fireEvent.change(document.getElementById('currentPassword')!, {
      target: { value: 'OldPassword1!' },
    });
    fireEvent.change(document.getElementById('newPassword')!, {
      target: { value: 'NewPassword1!' },
    });
    fireEvent.change(document.getElementById('confirmPassword')!, {
      target: { value: 'NewPassword1!' },
    });
    fireEvent.submit(
      (document.getElementById('currentPassword') as HTMLInputElement).form!
    );
    await waitFor(() =>
      expect(state.notifySuccess).toHaveBeenCalledWith(
        'profile:success.passwordChanged',
        'profile:success.passwordUpdated'
      )
    );
    await waitFor(() =>
      expect(
        (document.getElementById('newPassword') as HTMLInputElement).value
      ).toBe('')
    );
  });

  it('asks before leaving with a typed password', async () => {
    renderSection();
    const probe = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(probe()).toBe(false);
    fireEvent.change(document.getElementById('newPassword')!, {
      target: { value: 'Typed1!' },
    });
    await waitFor(() => expect(probe()).toBe(true));
  });

  it('marks the three password fields as required', () => {
    renderSection();
    for (const id of ['currentPassword', 'newPassword', 'confirmPassword']) {
      expect(document.getElementById(id)?.getAttribute('aria-required')).toBe(
        'true'
      );
      expect(
        document.querySelector(`label[for="${id}"]`)?.textContent
      ).toContain('*');
    }
  });

  it('shows a too-common password on the new-password field', async () => {
    state.error = new ApiError({
      kind: 'validation',
      messageKey: 'errors.validation.failed',
      status: 400,
      retryable: false,
      violations: [
        { field: 'newPassword', messageKey: 'validation:commonPassword' },
      ],
    });
    renderSection();
    expect((await fieldMessage('newPassword')).textContent).toContain(
      'too common'
    );
    expect(screen.queryByTestId('save-failed')).toBeNull();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('shows a wrong current password on that field — one message, no session-expired text', async () => {
    state.error = WRONG_CURRENT();
    renderSection();
    const message = await fieldMessage('currentPassword');
    expect(message.textContent).toBe('Your current password is incorrect.');
    expect(
      document.getElementById('currentPassword')?.getAttribute('aria-invalid')
    ).toBe('true');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.queryByTestId('save-failed')).toBeNull();
    expect(screen.queryByText(/Unexpected error/)).toBeNull();
    expect(screen.queryByText(/session has expired/i)).toBeNull();
  });

  it('shows a wrong current password in Arabic', async () => {
    state.error = WRONG_CURRENT();
    renderSection('ar');
    const message = await fieldMessage('currentPassword');
    expect(message.textContent).toBe(
      createI18nInstance('ar').t('errors:auth.invalidCurrentPassword')
    );
    expect(message.textContent).not.toMatch(/[A-Za-z]{4,}/);
  });

  it('says once, with the real reason, that the password was not changed after a server error', () => {
    state.error = new ApiError({
      kind: 'server',
      messageKey: 'errors.internal',
      status: 500,
      retryable: true,
    });
    renderSection();
    const alert = screen.getByTestId('save-failed');
    expect(alert.textContent).toContain("Your password wasn't changed");
    expect(alert.textContent).toContain('Something failed on our side');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.queryByText(/Unexpected error/)).toBeNull();
  });
});
