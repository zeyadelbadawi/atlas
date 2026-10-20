/**
 * The set-password page (an account-setup link, `setup=1`) shares this
 * form with password reset. Its button and its confirmation must say
 * "set", not "Reset Password": the person never had a password.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';

vi.mock('../hooks', () => ({
  useConfirmPasswordReset: () => ({
    isPending: false,
    error: null,
    mutate: vi.fn(),
  }),
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useToast: () => ({ toast: vi.fn() }),
}));

const { ResetPasswordForm } = await import('./ResetPasswordForm');

afterEach(cleanup);

function renderForm(language: 'en' | 'ar', variant?: 'reset' | 'setup') {
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter>
        <ResetPasswordForm token="t" variant={variant} />
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe('ResetPasswordForm button label', () => {
  it('says "Set password" on a setup link', () => {
    renderForm('en', 'setup');
    expect(screen.getByRole('button', { name: 'Set password' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /reset/i })).toBeNull();
  });

  it('says «تعيين كلمة المرور» on a setup link in Arabic', () => {
    renderForm('ar', 'setup');
    expect(
      screen.getByRole('button', { name: 'تعيين كلمة المرور' })
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /إعادة تعيين/ })).toBeNull();
  });

  it('keeps "Reset Password" for an ordinary reset', () => {
    renderForm('en');
    expect(screen.getByRole('button', { name: 'Reset Password' })).toBeTruthy();
  });
});
