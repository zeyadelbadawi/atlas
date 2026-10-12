/**
 * B0-SEC-11 — when the server refuses a new password as too common, the
 * change-password form says so on the password field instead of
 * showing a generic "something went wrong" card.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ProfileSecuritySection } from './ProfileSecuritySection';

const commonPasswordError = {
  kind: 'validation',
  messageKey: 'errors.validation.failed',
  violations: [
    { field: 'newPassword', messageKey: 'validation:commonPassword' },
  ],
};
const otherError = { kind: 'server', messageKey: 'errors.unexpected' };
const state = vi.hoisted(() => ({ error: null as unknown }));

vi.mock('../hooks', () => ({
  useChangePassword: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: state.error,
  }),
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
vi.mock('@components/feedback', () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));
// A stable `t`, like the real one: `useServerValidation` re-runs when it changes.
const i18n = vi.hoisted(() => ({
  t: (key: string) => key,
  i18n: { language: 'en' },
}));
vi.mock('react-i18next', () => ({ useTranslation: () => i18n }));

afterEach(() => {
  cleanup();
  state.error = null;
});

describe('ProfileSecuritySection change password', () => {
  it('shows a too-common password on the new-password field', async () => {
    state.error = commonPasswordError;
    render(<ProfileSecuritySection />);
    expect(await screen.findByText('validation:commonPassword')).toBeTruthy();
    expect(screen.queryByTestId('error-state')).toBeNull();
  });

  it('keeps the generic error card for other failures', () => {
    state.error = otherError;
    render(<ProfileSecuritySection />);
    expect(screen.getByTestId('error-state')).toBeTruthy();
  });
});
