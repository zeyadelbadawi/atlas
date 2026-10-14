/**
 * B0-CPY-04 — the sign-in form has no "Remember me": the server ignored
 * it, so the checkbox promised a longer session that never came. The form
 * submits only the email and password.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { SignInForm } from './components/SignInForm';

afterEach(cleanup);

function renderForm(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <MemoryRouter>
        <SignInForm onSubmit={onSubmit} isLoading={false} error={null} />
      </MemoryRouter>
    </I18nextProvider>
  );
  return onSubmit;
}

describe('sign-in form — no remember-me control', () => {
  it('renders no checkbox and no "Remember me" text', () => {
    renderForm();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByText(/remember me/i)).toBeNull();
    expect(screen.getByText('Forgot password?')).toBeTruthy();
  });

  it('submits only the email and password', async () => {
    const onSubmit = renderForm();
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret-pass' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]).toEqual([
      'owner@example.com',
      'secret-pass',
    ]);
  });
});
