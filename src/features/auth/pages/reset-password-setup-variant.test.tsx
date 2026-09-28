/**
 * The reset page has two voices, and `setup=1` chooses between them.
 *
 * An account-setup link goes to the same page, with the same token and
 * the same endpoint — deliberately, so there is one password flow rather
 * than two. But "Reset your password" is the wrong sentence for somebody
 * whose academy just created their account: they never had a password
 * and did not ask for anything. The only difference is the words.
 *
 * THE EXPIRED BRANCH IS HALF THE POINT, and the first version of this
 * file missed it: the mock always reported a valid token, so the page's
 * OTHER exit — the one that says the link is no longer good — was never
 * rendered and quietly kept saying "reset link" to someone who never had
 * a reset. A production browser check found it, which is the whole
 * argument for looking at the real page and not only at the tests.
 *
 * It is not a rare path, either. A setup link lasts 72 hours and goes to
 * someone who did not ask for it and may not open their mail today, so
 * expiry is a NORMAL way to arrive here — more likely than it ever is
 * for a reset link somebody requested seconds ago.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResetPasswordPage from './ResetPasswordPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Google Identity — the page asks `/auth/options` whether to show the
// Google button; with no answer here the button simply stays hidden.
function testQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}


// The page reads `validation.data === true` and `validation.isPending`,
// and treats anything else as an invalid token — so the mock has to
// match that shape exactly or every case renders the error branch.
// Hoisted so each block can choose which of the page's two exits it is
// actually testing.
const tokenState = vi.hoisted(() => ({ valid: true as boolean }));
vi.mock('../hooks', () => ({
  useValidatePasswordResetToken: () => ({
    data: tokenState.valid,
    isPending: false,
  }),
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

afterEach(() => {
  cleanup();
  tokenState.valid = true;
});

function renderAt(search: string) {
  return render(
    <QueryClientProvider client={testQueryClient()}>
      <MemoryRouter initialEntries={[`/auth/reset-password${search}`]}>
        <ResetPasswordPage />
      </MemoryRouter>
    </QueryClientProvider>,
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

  describe('when the link is no longer valid', () => {
    it('says the SETUP link expired, not that a reset link did', () => {
      tokenState.valid = false;
      const { container } = renderAt('?token=stale&setup=1');
      expect(container.textContent).toContain(
        'auth:setPassword.errors.invalidToken',
      );
      expect(container.textContent).toContain('auth:setPassword.requestNewLink');
      // Telling someone their "reset link" expired, when they never had
      // one, is the same wrong sentence this whole variant exists to fix.
      expect(container.textContent).not.toContain('auth:resetPassword.');
    });

    it('still says "reset link" for an ordinary recovery link', () => {
      tokenState.valid = false;
      const { container } = renderAt('?token=stale');
      expect(container.textContent).toContain(
        'auth:resetPassword.errors.invalidToken',
      );
      expect(container.textContent).toContain(
        'auth:resetPassword.requestNewLink',
      );
      expect(container.textContent).not.toContain('auth:setPassword.');
    });
  });
});
