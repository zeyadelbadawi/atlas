/**
 * Theme 1 header (plan Phase 4 tests): keyboard and focus behaviour of the
 * mobile sheet, RTL placement, the current-page marker, and the same
 * signed-in / configured-CTA rules as the shared header.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { WebsiteThemeScope } from '../renderer/WebsiteThemeScope';
import { PublicWebsiteLocaleProvider } from '../renderer/PublicWebsiteLocaleContext';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { ModernEducationHeader } from './ModernEducationHeader';
import type { WebsiteHeaderProps } from '../renderer/WebsiteHeader';
import type { PublicWebsiteLocale, WebsitePage } from '@types';

const lt = (en: string, ar = '') => ({ en, ar });
const PAGES = [
  { id: 'p-home', coreType: 'home', slug: 'home', title: 'Home' },
  { id: 'p-courses', coreType: 'courses', slug: 'courses', title: 'Courses' },
] as unknown as WebsitePage[];

const BASE: WebsiteHeaderProps = {
  academyName: 'Horizon Academy',
  navigation: [
    { id: 'n1', label: lt('Home', 'الرئيسية'), pageId: 'p-home', order: 0 },
    {
      id: 'n2',
      label: lt('Courses', 'الدورات'),
      pageId: 'p-courses',
      order: 1,
    },
  ] as WebsiteHeaderProps['navigation'],
  pages: PAGES,
  header: {},
  activePageId: 'p-courses',
  onNavigate: () => undefined,
};

function renderHeader(
  props: Partial<WebsiteHeaderProps> = {},
  locale: PublicWebsiteLocale = 'en'
) {
  const i18n = createI18nInstance(locale);
  return render(
    <I18nextProvider i18n={i18n}>
      <WebsiteThemeScope theme={getWebsiteTheme('modern-education')}>
        <PublicWebsiteLocaleProvider locale={locale}>
          <ModernEducationHeader {...BASE} locale={locale} {...props} />
        </PublicWebsiteLocaleProvider>
      </WebsiteThemeScope>
    </I18nextProvider>
  );
}

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView ??= () => undefined;
});
afterEach(cleanup);

describe('Theme 1 header', () => {
  it('marks the current page for assistive tech', () => {
    renderHeader();
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0];
    expect(
      within(nav)
        .getByRole('button', { name: 'Courses' })
        .getAttribute('aria-current')
    ).toBe('page');
    expect(
      within(nav)
        .getByRole('button', { name: 'Home' })
        .getAttribute('aria-current')
    ).toBeNull();
  });

  it('opens the menu as a labelled dialog that traps focus and closes on Escape', async () => {
    const user = userEvent.setup({ delay: null });
    renderHeader();
    const trigger = screen.getByRole('button', { name: 'Open menu' });
    await user.click(trigger);

    const dialog = await screen.findByRole('dialog', {
      name: 'Horizon Academy menu',
    });
    expect(dialog.contains(document.activeElement)).toBe(true);
    // Tabbing never leaves the dialog.
    for (let i = 0; i < 8; i += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('opens the menu from the logical end: the right in English, the left in Arabic', async () => {
    const user = userEvent.setup({ delay: null });
    renderHeader({}, 'ar');
    await user.click(screen.getByRole('button', { name: 'فتح القائمة' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.getAttribute('dir')).toBe('rtl');
    expect(dialog.className).toContain('left-0');
    cleanup();
    renderHeader();
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect((await screen.findByRole('dialog')).className).toContain('right-0');
  });

  it('keeps the primary action in the bar on small screens (one tap away)', () => {
    renderHeader();
    // Two "Sign up" actions: the desktop group and the always-visible
    // small-screen one next to the menu button.
    expect(screen.getAllByRole('button', { name: 'Sign up' }).length).toBe(2);
  });

  it('a signed-in visitor sees their greeting, never Sign in / Sign up', () => {
    renderHeader({ authState: { name: 'Mona', onSignOut: () => undefined } });
    expect(screen.getAllByText('Welcome, Mona').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Sign up' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
  });

  it('a configured header CTA takes the CTA slot; Sign in stays beside it', () => {
    renderHeader({ header: { cta: { label: lt('Start learning') } } });
    expect(
      screen.getAllByRole('button', { name: 'Start learning' }).length
    ).toBe(2);
    expect(screen.getAllByRole('button', { name: 'Sign in' }).length).toBe(1);
    cleanup();
    renderHeader({
      header: { cta: { label: lt('Log in'), authAction: 'signIn' } },
    });
    expect(screen.getAllByRole('button', { name: 'Log in' }).length).toBe(2);
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
  });
});
