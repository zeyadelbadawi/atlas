/**
 * "My Learn" and the learner account menu, in every theme's header
 * (Task B).
 *
 * Before: no theme had a "My Learn" item — a signed-in learner's only way
 * to their courses was the greeting happening to be a link, and a
 * signed-out visitor had none — and Themes 2–5's phone menu was labelled
 * "Menu" in every language and stayed open after a link was followed.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { isSafeReturnPath } from '@features/auth';
import { WebsiteThemeScope } from './WebsiteThemeScope';
import { PublicWebsiteLocaleProvider } from './PublicWebsiteLocaleContext';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { ModernEducationHeader } from '../modern-education/ModernEducationHeader';
import { WebsiteHeader, type WebsiteHeaderProps } from './WebsiteHeader';
import { MY_LEARN_SIGN_IN_HREF } from './WebsiteAccountMenu';
import type { WebsiteLinkRenderer } from './website-link-renderer.types';
import type { PublicWebsiteLocale, WebsitePage, WebsiteThemeKey } from '@types';

const PAGES = [
  { id: 'p-home', coreType: 'home', slug: 'home', title: 'Home' },
] as unknown as WebsitePage[];

/** A real-looking link renderer: plain anchors, locale-prefixed like the public one. */
const linkRendererFor =
  (locale: PublicWebsiteLocale): WebsiteLinkRenderer =>
  ({ href, className, ariaLabel, children, ariaCurrent }) => (
    <a
      href={locale === 'ar' ? `/ar${href}` : href}
      className={className}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      onClick={(event) => event.preventDefault()}
    >
      {children}
    </a>
  );

const BASE: WebsiteHeaderProps = {
  academyName: 'Horizon Academy',
  navigation: [],
  pages: PAGES,
  header: {},
  onNavigate: () => undefined,
};

const HEADERS = [
  ['Theme 1', 'modern-education', ModernEducationHeader],
  ['standard header', 'corporate-learning', WebsiteHeader],
  ['centered header', 'premium-academy', WebsiteHeader],
  ['minimal header', 'minimal-editorial', WebsiteHeader],
] as const;

function renderHeader(
  themeKey: WebsiteThemeKey,
  Header: (props: WebsiteHeaderProps) => JSX.Element,
  props: Partial<WebsiteHeaderProps> = {},
  locale: PublicWebsiteLocale = 'en'
) {
  return render(
    <I18nextProvider i18n={createI18nInstance(locale)}>
      <WebsiteThemeScope theme={getWebsiteTheme(themeKey)}>
        <PublicWebsiteLocaleProvider locale={locale}>
          <Header
            {...BASE}
            locale={locale}
            linkRenderer={linkRendererFor(locale)}
            {...props}
          />
        </PublicWebsiteLocaleProvider>
      </WebsiteThemeScope>
    </I18nextProvider>
  );
}

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView ??= () => undefined;
});
afterEach(cleanup);

describe('My Learn is always in the navigation', () => {
  it.each(HEADERS)(
    '%s: signed out, it asks to sign in and comes back to My Learn',
    (_label, themeKey, Header) => {
      renderHeader(themeKey, Header);
      const links = screen.getAllByRole('link', { name: 'My Learn' });
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(link.getAttribute('href')).toBe('/sign-in?returnTo=%2Fmy');
      }
    }
  );

  it.each(HEADERS)(
    '%s: signed in, it opens My Learn',
    (_label, themeKey, Header) => {
      renderHeader(themeKey, Header, {
        authState: { name: 'Mona', myLearningHref: '/my' },
      });
      for (const link of screen.getAllByRole('link', { name: 'My Learn' })) {
        expect(link.getAttribute('href')).toBe('/my');
      }
    }
  );

  it.each(HEADERS)(
    '%s: Arabic labels and the locale prefix',
    (_label, themeKey, Header) => {
      renderHeader(themeKey, Header, {}, 'ar');
      const link = screen.getAllByRole('link', { name: 'تعلّمي' })[0];
      expect(link.getAttribute('href')).toBe('/ar/sign-in?returnTo=%2Fmy');
    }
  );

  it('the sign-in return path it sends is one the sign-in page accepts', () => {
    const returnTo = new URL(
      MY_LEARN_SIGN_IN_HREF,
      'https://x.test'
    ).searchParams.get('returnTo');
    expect(returnTo).toBe('/my');
    expect(isSafeReturnPath(returnTo)).toBe(true);
  });
});

describe('the signed-in account menu', () => {
  it.each(HEADERS)(
    '%s: the name opens My Learn, My Courses, Profile & settings and Sign out; Escape closes it',
    async (_label, themeKey, Header) => {
      const user = userEvent.setup();
      const onSignOut = vi.fn();
      renderHeader(themeKey, Header, {
        authState: { name: 'Mona Saleh', myLearningHref: '/my', onSignOut },
      });
      // Never the sign-in pair for a signed-in visitor.
      expect(screen.queryByRole('link', { name: 'Sign up' })).toBeNull();

      const trigger = screen.getByRole('button', {
        name: 'Account menu for Mona Saleh',
      });
      await user.click(trigger);
      const menu = await screen.findByRole('menu');
      const items = within(menu).getAllByRole('menuitem');
      expect(items.map((item) => item.textContent)).toEqual([
        'My Learn',
        'My Courses',
        'Profile & settings',
        'Sign out',
      ]);
      expect(items[1].getAttribute('href')).toBe('/my/courses');
      expect(items[2].getAttribute('href')).toBe('/my/profile');

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).toBeNull();
      expect(document.activeElement).toBe(trigger);

      // Keyboard: open, move to Sign out, choose it.
      trigger.focus();
      await user.keyboard('{Enter}');
      await screen.findByRole('menu');
      await user.keyboard('{End}{Enter}');
      expect(onSignOut).toHaveBeenCalledTimes(1);
    }
  );
});

describe('phones and tablets', () => {
  it('Theme 1 side sheet: My Learn and the account entries; following a link closes it', async () => {
    const user = userEvent.setup();
    renderHeader('modern-education', ModernEducationHeader, {
      authState: { name: 'Mona', myLearningHref: '/my', onSignOut: vi.fn() },
    });
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const sheet = await screen.findByRole('dialog');
    expect(within(sheet).getByRole('link', { name: 'My Learn' })).toBeTruthy();
    const account = within(sheet).getByTestId('website-account-sheet');
    expect(
      within(account).getByRole('link', { name: 'My Courses' })
    ).toBeTruthy();
    expect(
      within(account).getByRole('button', { name: 'Sign out' })
    ).toBeTruthy();
    await act(async () => {
      fireEvent.click(
        within(account).getByRole('link', { name: 'My Courses' })
      );
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Themes 2–5 menu: named in the visitor’s language, and closes when a link is followed', async () => {
    const user = userEvent.setup();
    renderHeader(
      'corporate-learning',
      WebsiteHeader,
      { authState: { name: 'Mona', myLearningHref: '/my' } },
      'ar'
    );
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'فتح القائمة' }));
    const sheet = await screen.findByRole('dialog');
    await act(async () => {
      fireEvent.click(within(sheet).getByRole('link', { name: 'تعلّمي' }));
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
