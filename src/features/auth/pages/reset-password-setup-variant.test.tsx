/**
 * The reset page has two voices, and `setup=1` chooses between them.
 *
 * An account-setup link goes to the same page, with the same token and
 * the same endpoint — deliberately, so there is one password flow rather
 * than two. But "Reset your password" is the wrong sentence for somebody
 * whose academy just created their account: they never had a password
 * and did not ask for anything. The only difference is the words.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResetPasswordPage from './ResetPasswordPage';

// The page reads `validation.data === true` and `validation.isPending`,
// and treats anything else as an invalid token — so the mock has to
// match that shape exactly or every case renders the error branch.
vi.mock('../hooks', () => ({
  useValidatePasswordResetToken: () => ({ data: true, isPending: false }),
}));
vi.mock('../components/ResetPasswordForm', () => ({
  ResetPasswordForm: ({ token }: { token: string }) => (
    <div data-testid="form">{token}</div>
  ),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

afterEach(cleanup);

function renderAt(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/auth/reset-password${search}`]}>
      <ResetPasswordPage />
    </MemoryRouter>,
  );
}

describe('ResetPasswordPage', () => {
  it('says "reset" for an ordinary recovery link', () => {
    const { container } = renderAt('?token=abc');
    expect(container.textContent).toContain('auth:resetPassword.title');
    expect(container.textContent).not.toContain('auth:setPassword.title');
  });

  it('says "set" for an account-setup link', () => {
    const { container } = renderAt('?token=abc&setup=1');
    expect(container.textContent).toContain('auth:setPassword.title');
    expect(container.textContent).not.toContain('auth:resetPassword.title');
  });

  it('uses the same token either way — one flow, not two', () => {
    renderAt('?token=the-token&setup=1');
    expect(screen.getByTestId('form').textContent).toBe('the-token');
  });

  it('treats any other value of `setup` as an ordinary reset', () => {
    // Only `1` opts in; a stray `?setup=true` must not change the copy
    // into a claim about an account that was not just created.
    const { container } = renderAt('?token=abc&setup=true');
    expect(container.textContent).toContain('auth:resetPassword.title');
  });
});
