/**
 * Dashboard header identity and preferences.
 *
 * - The account trigger greets the signed-in person by name (localized),
 *   not with initials, and opens a menu with their identity, Profile,
 *   Appearance (the one theme preference) and Sign out.
 * - Appearance is no longer a separate header control.
 * - The language trigger names the current language in words.
 * - Notifications stay in the header.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import { AtlasThemeProvider } from '@app/providers/theme/ThemeProvider';
import { LocalizationContext } from '@app/providers/localization/localization.context';
import { LANGUAGE_LIST } from '@/localization/languages';
import { STORAGE_KEYS } from '@constants';
import { writeConsent } from '@/shared/utils/cookie-consent.utils';

let user: { id: string; name: string; email: string } | null = {
  id: 'u1',
  name: 'Sara Ali',
  email: 'sara@example.com',
};
const signOut = vi.fn(async () => undefined);

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ user }),
  useSignOut: () => ({ signOut, isLoading: false }),
  useToast: () => ({ toast: vi.fn() }),
}));

import { AccountMenu } from './AccountMenu';
import { LanguageSwitcher } from './LanguageSwitcher';
import { DashboardTopbar } from '@app/layouts/dashboard/DashboardTopbar';

beforeAll(() => {
  // Radix menus need these in jsdom.
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => undefined;
  Element.prototype.scrollIntoView ??= () => undefined;
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.classList.remove('dark');
  signOut.mockClear();
  user = { id: 'u1', name: 'Sara Ali', email: 'sara@example.com' };
});

const setLanguage = vi.fn();

function renderUi(ui: JSX.Element, locale: 'en' | 'ar' = 'en') {
  const i18n = createI18nInstance(locale);
  return render(
    <I18nextProvider i18n={i18n}>
      <LocalizationContext.Provider
        value={
          {
            language: locale,
            direction: locale === 'ar' ? 'rtl' : 'ltr',
            availableLanguages: LANGUAGE_LIST,
            setLanguage,
          } as never
        }
      >
        <AtlasThemeProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route path="/dashboard" element={ui} />
              <Route path="/dashboard/profile" element={<p>Profile page</p>} />
            </Routes>
          </MemoryRouter>
        </AtlasThemeProvider>
      </LocalizationContext.Provider>
    </I18nextProvider>
  );
}

const trigger = () => screen.getByTestId('account-menu-trigger');

describe('account menu', () => {
  it('greets the signed-in person by name, not initials', () => {
    renderUi(<AccountMenu />);
    expect(trigger().textContent).toContain('Welcome, Sara Ali');
    expect(trigger().textContent).not.toMatch(/\bSA\b/);
    // Named for what it is and what it opens.
    expect(
      screen.getByRole('button', { name: /Welcome, Sara Ali.*account menu/ })
    ).toBe(trigger());
  });

  it('uses each person’s own name', () => {
    user = { id: 'u2', name: 'Ahmed Mohamed', email: 'a@example.com' };
    renderUi(<AccountMenu />);
    expect(trigger().textContent).toContain('Welcome, Ahmed Mohamed');
  });

  it('Arabic: a natural Arabic greeting', () => {
    renderUi(<AccountMenu />, 'ar');
    expect(trigger().textContent).toContain('مرحبًا، Sara Ali');
    expect(trigger().textContent).not.toContain('Welcome');
  });

  it('falls back to the email name when the profile has no name', () => {
    user = { id: 'u3', name: '  ', email: 'zed@example.com' };
    renderUi(<AccountMenu />);
    expect(trigger().textContent).toContain('Welcome, zed');
  });

  it('opens with identity, Profile, Notifications, Support, Appearance and Sign out; Escape returns focus', async () => {
    const ue = userEvent.setup();
    renderUi(<AccountMenu />);
    await ue.click(trigger());
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByText('sara@example.com')).toBeTruthy();
    expect(
      within(menu).getByRole('menuitem', { name: 'Profile' })
    ).toBeTruthy();
    expect(
      within(menu).getByRole('menuitem', { name: 'Notifications' })
    ).toBeTruthy();
    expect(within(menu).getByRole('menuitem', { name: 'Support' })).toBeTruthy();
    expect(within(menu).getByText('Appearance')).toBeTruthy();
    // Appearance is collapsed until opened, then lists the three options.
    expect(within(menu).queryAllByRole('menuitemradio')).toHaveLength(0);
    await ue.click(within(menu).getByTestId('appearance-toggle'));
    const radios = within(menu).getAllByRole('menuitemradio');
    expect(radios.map((r) => r.textContent)).toEqual([
      'Light',
      'Dark',
      'System',
    ]);
    expect(
      within(menu).getByRole('menuitem', { name: 'Sign out' })
    ).toBeTruthy();

    await ue.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('is keyboard operable: Enter opens, arrows move, Enter on Profile navigates', async () => {
    const ue = userEvent.setup();
    renderUi(<AccountMenu />);
    trigger().focus();
    await ue.keyboard('{Enter}');
    await screen.findByRole('menu');
    // Radix focuses the first item on keyboard open.
    expect(document.activeElement?.textContent).toBe('Profile');
    await ue.keyboard('{Enter}');
    expect(await screen.findByText('Profile page')).toBeTruthy();
  });

  it('Appearance sets the one theme preference, persisted as before', async () => {
    // Persisted exactly as before: a preference, stored once the person
    // allowed preference storage.
    writeConsent(true);
    const ue = userEvent.setup();
    renderUi(<AccountMenu />);
    await ue.click(trigger());
    // Appearance is a collapsed row; it opens in place.
    await ue.click(await screen.findByTestId('appearance-toggle'));
    await ue.click(await screen.findByTestId('appearance-dark'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toContain('dark');
    // The menu stays open so the change can be compared.
    expect(
      screen.getByTestId('appearance-dark').getAttribute('aria-checked')
    ).toBe('true');

    await ue.click(screen.getByTestId('appearance-light'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toContain('light');
  });

  it('reads the saved preference on a fresh load (refresh)', async () => {
    window.localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify('dark'));
    const ue = userEvent.setup();
    renderUi(<AccountMenu />);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    await ue.click(trigger());
    await ue.click(await screen.findByTestId('appearance-toggle'));
    expect(
      (await screen.findByTestId('appearance-dark')).getAttribute(
        'aria-checked'
      )
    ).toBe('true');
  });

  it('Sign out still signs out', async () => {
    const ue = userEvent.setup();
    renderUi(<AccountMenu />);
    await ue.click(trigger());
    await ue.click(await screen.findByRole('menuitem', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('renders nothing without a signed-in user', () => {
    user = null;
    const { container } = renderUi(<AccountMenu />);
    expect(
      container.querySelector('[data-testid="account-menu-trigger"]')
    ).toBeNull();
  });
});

describe('language switcher', () => {
  it('names the current language in words and says what it does', () => {
    renderUi(<LanguageSwitcher />);
    const button = screen.getByTestId('language-switcher-trigger');
    expect(button.textContent).toContain('English');
    expect(
      screen.getByRole('button', { name: /Change language: .*English/ })
    ).toBe(button);
  });

  it('Arabic: shows العربية; choosing a language uses the one language state', async () => {
    const ue = userEvent.setup();
    renderUi(<LanguageSwitcher />, 'ar');
    const button = screen.getByTestId('language-switcher-trigger');
    expect(button.textContent).toContain('العربية');
    await ue.click(button);
    const options = await screen.findAllByRole('menuitemradio');
    expect(options.map((o) => o.textContent)).toEqual(['English', 'العربية']);
    expect(options[1].getAttribute('aria-checked')).toBe('true');
    await ue.click(options[0]);
    expect(setLanguage).toHaveBeenCalledWith('en');
  });
});

describe('dashboard top bar', () => {
  it('has no separate appearance control; language and the module slots remain', () => {
    renderUi(
      <DashboardTopbar
        onOpenNavigation={() => undefined}
        isMobile={false}
        actions={
          <>
            <button type="button">Notifications</button>
            <AccountMenu />
          </>
        }
      />
    );
    expect(screen.queryByRole('button', { name: 'Change theme' })).toBeNull();
    expect(screen.getByTestId('language-switcher-trigger')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy();
    expect(trigger()).toBeTruthy();
  });
});
