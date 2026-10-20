/**
 * The academy website's `/reset-password` page also opens the setup link
 * a learner gets when the academy created their account
 * (`/reset-password?token=…&setup=1`). That link must say "set your
 * password" everywhere — title, checking state, expired state and the
 * form's button — never "reset".
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

const tokenState = vi.hoisted(() => ({ valid: true as boolean }));
vi.mock('@features/auth', () => ({
  useUrlCredentialToken: () => 'tok',
  useValidatePasswordResetToken: () => ({
    data: tokenState.valid,
    isPending: false,
  }),
  ResetPasswordForm: ({ variant }: { variant?: string }) => (
    <div data-testid="form" data-variant={variant ?? 'reset'} />
  ),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('./components/PublicWebsiteAuthShell', () => ({
  PublicWebsiteAuthShell: ({
    title,
    children,
  }: {
    title: ReactNode;
    children: () => ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {children()}
    </div>
  ),
}));
vi.mock('./utils/public-website-link-renderer', () => ({
  usePublicWebsiteHrefBuilder: () => (path: string) => path,
  usePublicWebsiteLinkRenderer:
    () =>
    ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

const { PublicWebsiteResetPasswordPage } = await import(
  './components/PublicWebsiteResetPasswordPage'
);

afterEach(() => {
  cleanup();
  tokenState.valid = true;
});

function renderAt(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/reset-password${search}`]}>
      <PublicWebsiteResetPasswordPage lookupKey="falcon" locale="en" />
    </MemoryRouter>
  );
}

describe('academy website set-password link', () => {
  it('says "set" and asks the form for the set-password button', () => {
    const { container } = renderAt('?token=tok&setup=1');
    expect(container.textContent).toContain('publicWebsite:auth.setPassword.title');
    expect(container.textContent).not.toContain('auth.resetPassword.');
    expect(screen.getByTestId('form').dataset.variant).toBe('setup');
  });

  it('says the SETUP link expired, not a reset link', () => {
    tokenState.valid = false;
    const { container } = renderAt('?token=tok&setup=1');
    expect(container.textContent).not.toContain('auth.resetPassword.');
  });

  it('keeps the reset wording for an ordinary reset link', () => {
    const { container } = renderAt('?token=tok');
    expect(container.textContent).toContain('publicWebsite:auth.resetPassword.title');
    expect(screen.getByTestId('form').dataset.variant).toBe('reset');
  });
});
