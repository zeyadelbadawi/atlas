/**
 * The management-host verify-email page: three honest states, token from
 * the URL, submitted once.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VerifyEmailPage from './pages/VerifyEmailPage';

const state: { isError: boolean; isSuccess: boolean; error: unknown; mutate: ReturnType<typeof vi.fn> } = {
  isError: false, isSuccess: false, error: null, mutate: vi.fn(),
};
vi.mock('./hooks', () => ({ useVerifyEmail: () => state }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

afterEach(() => { cleanup(); state.isError = false; state.isSuccess = false; state.error = null; state.mutate = vi.fn(); });

function renderAt(url: string) {
  render(<MemoryRouter initialEntries={[url]}><VerifyEmailPage /></MemoryRouter>);
}

describe('VerifyEmailPage (management host)', () => {
  it('submits the token from the URL exactly once and shows the verifying state', () => {
    renderAt('/auth/verify-email?token=abc');
    expect(state.mutate).toHaveBeenCalledTimes(1);
    expect(state.mutate).toHaveBeenCalledWith({ token: 'abc' });
    expect(screen.getByTestId('verify-email-pending')).toBeTruthy();
  });
  it('treats a missing token as a failed link and offers sign in', () => {
    renderAt('/auth/verify-email');
    expect(state.mutate).not.toHaveBeenCalled();
    expect(screen.getByTestId('verify-email-error')).toBeTruthy();
    expect(screen.getByText('auth:verifyEmail.goToSignIn').getAttribute('href')).toBe('/auth/sign-in');
  });
  it('shows the verified state on success', () => {
    state.isSuccess = true;
    renderAt('/auth/verify-email?token=abc');
    expect(screen.getByTestId('verify-email-success')).toBeTruthy();
  });
});
