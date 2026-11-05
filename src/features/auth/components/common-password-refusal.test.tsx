/**
 * B0-SEC-11 — when the server refuses a new password as too common, the
 * reset form says so on the password field instead of
 * showing a generic "something went wrong" card.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ResetPasswordForm } from './ResetPasswordForm';

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
  useConfirmPasswordReset: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: state.error,
  }),
}));
vi.mock('@components/feedback', () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));
// A stable `t`, like the real one: `useServerValidation` re-runs when it changes.
// `exists`: only the violation's key is in this fake catalogue (the shared
// hooks fall back for a key it does not hold).
const i18n = vi.hoisted(() => {
  const t = (key: string) => key;
  return {
    t,
    i18n: {
      language: 'en',
      exists: (key: string) => key === 'validation:commonPassword',
      t,
    },
  };
});
vi.mock('react-i18next', () => ({ useTranslation: () => i18n }));

afterEach(() => {
  cleanup();
  state.error = null;
});

describe('ResetPasswordForm', () => {
  const renderForm = () =>
    render(
      <MemoryRouter>
        <ResetPasswordForm token="t" />
      </MemoryRouter>
    );

  it('shows a too-common password on the password field', async () => {
    state.error = commonPasswordError;
    renderForm();
    expect(await screen.findByText('validation:commonPassword')).toBeTruthy();
    expect(screen.queryByTestId('error-state')).toBeNull();
  });

  it("shows other failures as one message with the kind's copy, not a generic card (B1)", () => {
    state.error = otherError;
    renderForm();
    expect(screen.queryByTestId('error-state')).toBeNull();
    expect(screen.getByTestId('auth-form-alert').textContent).toContain(
      'errors:server.description'
    );
  });
});
