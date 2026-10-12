/**
 * B0-SEC-02 — the platform Security tab must not offer controls that are
 * enforced nowhere. "Require two-factor authentication" and "Session
 * timeout" were saved but never read, so they are gone; the tab only says
 * what is true today and links to the per-account setup.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import { SecuritySettings } from './components/SecuritySettings';

function renderSettings(language: 'en' | 'ar') {
  const i18n = createI18nInstance(language);
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <SecuritySettings />
      </MemoryRouter>
    </I18nextProvider>
  );
}

afterEach(() => {
  cleanup();
});

describe('SecuritySettings', () => {
  it('offers no switch or select that implies a platform-wide rule', () => {
    renderSettings('en');
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByText(/Require two-factor authentication/i)).toBeNull();
    expect(screen.queryByText(/Session timeout/i)).toBeNull();
  });

  it('points to the per-account setup and says the platform-wide rules are not available yet', () => {
    renderSettings('en');
    const link = screen.getByRole('link', { name: 'Open your profile' });
    expect(link.getAttribute('href')).toBe('/dashboard/profile');
    expect(screen.getByText(/aren't available yet/)).toBeTruthy();
  });

  it('renders the same honest copy in Arabic', () => {
    renderSettings('ar');
    expect(screen.getByRole('link', { name: 'افتح ملفك الشخصي' })).toBeTruthy();
    expect(screen.getByText(/لا تتوفر بعدُ/)).toBeTruthy();
  });
});
