/**
 * The platform holding page (owner decision D6).
 *
 * Pinned here:
 *   - `/` renders English (LTR) and `/ar` Arabic (RTL), from the URL, not
 *     from the visitor's stored language;
 *   - exactly the allowed destinations: sign in, contact (sales topic),
 *     Privacy Policy, Terms, and the other language — no sign-up, no
 *     pricing, no feature page;
 *   - the title is "Atlas" and the page is `noindex, follow` while it is
 *     mounted, restored when it unmounts;
 *   - no "free" / «مجاني», prices, plans, testimonials, metrics or claims,
 *     in the copy or in what renders;
 *   - the old `/#contact` anchor lands on the contact page;
 *   - the language switch is remembered like the app's language menu.
 *
 * Native DOM assertions only (this repo has no jest-dom).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AtlasLocalizationProvider } from '@app/providers/localization/LocalizationProvider';
import { CookieConsentProvider } from '@features/legal';
import { STORAGE_KEYS } from '@constants';
import { writeConsent } from '@utils';
import HoldingPage, {
  HOLDING_PAGE_CONTACT_HREF,
  HOLDING_PAGE_ROBOTS,
  HOLDING_PAGE_TITLE,
} from './HoldingPage';
import { HOLDING_PAGE_COPY } from './holding-page.copy';

function Where(): JSX.Element {
  const location = useLocation();
  return (
    <span data-testid="where">{`${location.pathname}${location.search}`}</span>
  );
}

function renderAt(path: string, storedLanguage: 'en' | 'ar' = 'en') {
  window.localStorage.setItem(
    STORAGE_KEYS.language,
    JSON.stringify(storedLanguage)
  );
  return render(
    <AtlasLocalizationProvider>
      <CookieConsentProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/" element={<HoldingPage locale="en" />} />
            <Route path="/ar" element={<HoldingPage locale="ar" />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </CookieConsentProvider>
    </AtlasLocalizationProvider>
  );
}

function hrefs(): string[] {
  return Array.from(
    screen.getByTestId('holding-page').querySelectorAll('a')
  ).map((link) => link.getAttribute('href') ?? '');
}

function robots(): string | null {
  return (
    document.head
      .querySelector('meta[name="robots"]')
      ?.getAttribute('content') ?? null
  );
}

/** Marketing that must not come back, in either language. */
const BANNED_EN =
  /\bfree\b|pric(e|es|ing)|\bplans?\b|testimonial|customers?\b|trusted|sign[ -]?up|register|get started|start now|features?\b|\d|\$|EGP|USD|%/i;
const BANNED_AR =
  /مجان|الأسعار|سعر|خطة|الخطط|آراء|عملاء|إنشاء حساب|ابدأ|المزايا|ميزات|[0-9٠-٩]|ج\.م|جنيه/;

beforeEach(() => {
  document.title = 'Before';
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('HoldingPage', () => {
  it('renders English at / with only the allowed links', () => {
    renderAt('/', 'ar');
    const page = screen.getByTestId('holding-page');
    expect(page.getAttribute('lang')).toBe('en');
    expect(page.getAttribute('dir')).toBe('ltr');
    expect(page.textContent).toContain(HOLDING_PAGE_COPY.en.sentence);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Atlas');
    expect(hrefs().sort()).toEqual(
      [
        '/ar',
        '/auth/sign-in',
        '/contact?topic=sales',
        '/privacy-policy',
        '/terms',
      ].sort()
    );
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Contact' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'العربية' })).toBeTruthy();
  });

  it('renders Arabic, right to left, at /ar whatever the stored language', () => {
    renderAt('/ar', 'en');
    const page = screen.getByTestId('holding-page');
    expect(page.getAttribute('lang')).toBe('ar');
    expect(page.getAttribute('dir')).toBe('rtl');
    expect(page.textContent).toContain(HOLDING_PAGE_COPY.ar.sentence);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('أطلس');
    expect(hrefs().sort()).toEqual(
      [
        '/',
        '/auth/sign-in',
        '/contact?topic=sales',
        '/privacy-policy',
        '/terms',
      ].sort()
    );
    expect(screen.getByRole('link', { name: 'تسجيل الدخول' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'English' })).toBeTruthy();
  });

  it('is titled "Atlas" and noindex while mounted, and restores the head after', () => {
    const view = renderAt('/');
    expect(document.title).toBe(HOLDING_PAGE_TITLE);
    expect(document.title).toBe('Atlas');
    expect(robots()).toBe(HOLDING_PAGE_ROBOTS);
    expect(robots()).toBe('noindex, follow');
    view.unmount();
    expect(document.title).toBe('Before');
    expect(robots()).toBeNull();
  });

  it('has no sign-up, price, plan, testimonial, metric or "free" copy', () => {
    for (const [locale, banned] of [
      ['en', BANNED_EN],
      ['ar', BANNED_AR],
    ] as const) {
      for (const [key, value] of Object.entries(HOLDING_PAGE_COPY[locale])) {
        if (key === 'otherLanguageName' || key === 'direction') continue;
        expect(value, `${locale}.${key}`).not.toMatch(banned);
      }
      const view = renderAt(locale === 'en' ? '/' : '/ar', locale);
      const text = screen.getByTestId('holding-page').textContent ?? '';
      expect(text).not.toMatch(banned);
      expect(text).not.toMatch(/free|مجان/i);
      view.unmount();
    }
  });

  it('sends the old /#contact anchor to the contact page', () => {
    renderAt('/#contact');
    expect(screen.getByTestId('where').textContent).toBe('/contact');
  });

  it('links the contact form on its sales topic', () => {
    expect(HOLDING_PAGE_CONTACT_HREF).toBe('/contact?topic=sales');
  });

  it('remembers the language chosen with the switch (preferences allowed)', async () => {
    writeConsent(true);
    renderAt('/', 'en');
    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: 'العربية' }));
    });
    expect(screen.getByTestId('holding-page').getAttribute('lang')).toBe('ar');
    expect(window.localStorage.getItem(STORAGE_KEYS.language)).toBe(
      JSON.stringify('ar')
    );
  });
});
