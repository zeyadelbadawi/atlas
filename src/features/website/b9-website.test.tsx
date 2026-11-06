/**
 * B9 (UX audit) — the academy website's shared fixes, outside the contact
 * form (`b9-contact-form.test.tsx`):
 *
 *   - V05 legal links: the platform's Terms and Privacy as absolute URLs in
 *     a new tab (Arabic under `/ar`), Cookie Preferences when consent exists;
 *   - V06 the cookie dialog on an academy site names the academy and says
 *     nothing about dashboards; its Privacy link is absolute;
 *   - V07/V08 enrolment: already enrolled says so with Continue; a 403 gives
 *     the real reason only; a learner never reads "upgrade your plan";
 *   - V10 a page's name in the visitor's language for its title;
 *   - V15 a broken uploaded image shows the theme's fallback;
 *   - V07 public reads never raise the app-wide toast.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import {
  CookieConsentProvider,
  CookiePreferencesDialog,
  platformLegalHref,
  useCookieConsent,
} from '@features/legal';
import { createApiError } from '@api';
import { INLINE_ERRORS_META } from '@services/query';
import { publicWebsiteService } from '@services';
import { usePublicCourses } from '@/shared/hooks/usePublicCourses';
import { PublicWebsiteLocaleProvider } from './renderer/PublicWebsiteLocaleContext';
import { WebsiteLegalLinks } from './renderer/WebsiteLegalLinks';
import { CourseEnrollError } from './renderer/CourseEnrollError';
import { classifyEnrollFailure } from './renderer/useCourseDetails';
import { publicPageName } from './utils/page-name.utils';
import { ThemeImage } from './theme-assets';
import { T1CourseThumbnail } from './modern-education/T1CourseCard';
import type { PublicWebsiteLocale, WebsitePage } from '@types';

function wrap(children: ReactNode, locale: PublicWebsiteLocale = 'en') {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={createI18nInstance(locale)}>
        <MemoryRouter>
          <PublicWebsiteLocaleProvider locale={locale}>
            {children}
          </PublicWebsiteLocaleProvider>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('V05 legal links', () => {
  it('builds absolute links to the platform site, Arabic under /ar', () => {
    const site = 'https://platform.example';
    expect(platformLegalHref('terms', 'en', site)).toBe(
      'https://platform.example/terms'
    );
    expect(platformLegalHref('privacy', 'ar', site)).toBe(
      'https://platform.example/ar/privacy-policy'
    );
    // No site configured (development): this origin, still absolute.
    expect(platformLegalHref('privacy', 'en', undefined)).toBe(
      `${window.location.origin}/privacy-policy`
    );
  });

  it('the footer row: Terms and Privacy in a new tab, Cookie Preferences with consent', () => {
    render(
      wrap(
        <CookieConsentProvider>
          <WebsiteLegalLinks />
        </CookieConsentProvider>
      )
    );
    const terms = screen.getByRole('link', { name: /Terms of Service/ });
    const privacy = screen.getByRole('link', { name: /Privacy Policy/ });
    for (const link of [terms, privacy]) {
      expect(link.getAttribute('href')).toMatch(/^https?:\/\//);
      expect(link.getAttribute('target')).toBe('_blank');
    }
    expect(privacy.getAttribute('href')).toMatch(/\/privacy-policy$/);
    expect(
      screen.getByRole('button', { name: 'Cookie Preferences' })
    ).toBeTruthy();
  });

  it('Arabic page: Arabic labels and the Arabic documents; no cookie button without consent', () => {
    render(wrap(<WebsiteLegalLinks />, 'ar'));
    expect(
      screen.getByRole('link', { name: /شروط الخدمة/ }).getAttribute('href')
    ).toMatch(/\/ar\/terms$/);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

function OpenPreferences(): JSX.Element {
  const { openPreferences } = useCookieConsent();
  return (
    <button type="button" onClick={openPreferences}>
      open
    </button>
  );
}

describe('V06 cookie preferences on an academy site', () => {
  it('names the academy, never Atlas or dashboard concepts; Privacy is absolute', () => {
    render(
      wrap(
        <CookieConsentProvider>
          <OpenPreferences />
          <CookiePreferencesDialog academySite academyName="Falcon Academy" />
        </CookieConsentProvider>
      )
    );
    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain("Falcon Academy's website uses no");
    expect(dialog.textContent).not.toMatch(/Atlas|sidebar|organization/);
    const privacy = screen.getByTestId('cookie-privacy-link');
    expect(privacy.getAttribute('href')).toMatch(
      /^https?:\/\/.*\/privacy-policy$/
    );
    expect(privacy.getAttribute('target')).toBe('_blank');
  });

  it('keeps the platform copy on the platform', () => {
    render(
      wrap(
        <CookieConsentProvider>
          <OpenPreferences />
          <CookiePreferencesDialog />
        </CookieConsentProvider>
      )
    );
    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByRole('dialog').textContent).toContain('Atlas uses no');
  });
});

describe('V07/V08 enrolment failures', () => {
  it('classifies the failure', () => {
    expect(
      classifyEnrollFailure(createApiError('conflict', { status: 409 }))
    ).toEqual({ kind: 'alreadyEnrolled' });
    expect(
      classifyEnrollFailure(
        createApiError('forbidden', {
          messageKey: 'errors.enrollment.academyMembershipRequired',
        })
      )
    ).toEqual({
      kind: 'refused',
      messageKey: 'errors.enrollment.academyMembershipRequired',
    });
    expect(classifyEnrollFailure(createApiError('network')).kind).toBe(
      'network'
    );
    expect(classifyEnrollFailure(createApiError('server')).kind).toBe('server');
  });

  it('already enrolled: says so and offers Continue to the course', () => {
    const onContinue = vi.fn();
    render(
      wrap(
        <CourseEnrollError
          error={{ kind: 'alreadyEnrolled' }}
          onContinue={onContinue}
        />
      )
    );
    expect(screen.getByRole('alert').textContent).toContain(
      "You're already enrolled in this course."
    );
    expect(screen.getByRole('alert').textContent).not.toMatch(/try again/i);
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue to the course' })
    );
    expect(onContinue).toHaveBeenCalled();
  });

  it('a 403 gives the real reason only (no "try again")', () => {
    render(
      wrap(
        <CourseEnrollError
          error={{
            kind: 'refused',
            messageKey: 'errors.enrollment.academyMembershipRequired',
          }}
          onContinue={() => undefined}
        />
      )
    );
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain(
      'You need active access to this academy first.'
    );
    expect(alert.textContent).not.toMatch(/try again/i);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it("a learner never reads the owner's 'upgrade your plan'", () => {
    render(
      wrap(
        <CourseEnrollError
          error={{
            kind: 'refused',
            messageKey: 'errors.entitlement.limitReached',
          }}
          onContinue={() => undefined}
        />
      )
    );
    expect(screen.getByRole('alert').textContent).toContain(
      "This academy can't take new enrollments right now."
    );
    expect(screen.getByRole('alert').textContent).not.toMatch(/upgrade/i);
  });

  it('a server failure is the academy’s side; only a network failure mentions the connection', () => {
    const { rerender } = render(
      wrap(
        <CourseEnrollError
          error={{ kind: 'server' }}
          onContinue={() => undefined}
        />
      )
    );
    expect(screen.getByRole('alert').textContent).toContain(
      "the academy's side"
    );
    expect(screen.getByRole('alert').textContent).not.toMatch(/connection/);
    rerender(
      wrap(
        <CourseEnrollError
          error={{ kind: 'network' }}
          onContinue={() => undefined}
        />
      )
    );
    expect(screen.getByRole('alert').textContent).toMatch(/connection/);
  });
});

describe('V10 page names for titles', () => {
  const t = createI18nInstance('ar').t;
  const page = (fields: Partial<WebsitePage>) =>
    ({
      id: 'p1',
      title: 'Courses',
      coreType: 'courses',
      ...fields,
    }) as WebsitePage;

  it('the navigation label in the visitor language first', () => {
    expect(
      publicPageName(
        page({}),
        [
          {
            id: 'n1',
            pageId: 'p1',
            label: { en: 'Programmes', ar: 'البرامج' },
          } as never,
        ],
        'ar',
        t
      )
    ).toBe('البرامج');
  });

  it('a core page with its default title, translated; a custom title as written; Home none', () => {
    expect(publicPageName(page({}), [], 'ar', t)).toBe('الدورات');
    expect(
      publicPageName(
        page({ coreType: undefined, title: 'Summer camp' }),
        [],
        'ar',
        t
      )
    ).toBe('Summer camp');
    expect(publicPageName(page({ coreType: 'home' }), [], 'ar', t)).toBe('');
  });
});

describe('V15 broken images fall back', () => {
  it('a failed upload shows the theme fallback photograph, not a broken image', () => {
    const { container } = render(
      wrap(
        <ThemeImage
          value="https://cdn.example/missing.jpg"
          errorValue="theme-asset:atelier/course-fallback"
          alt=""
          fallback={<span data-testid="placeholder" />}
        />
      )
    );
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('https://cdn.example/missing.jpg');
    act(() => {
      fireEvent.error(img);
    });
    expect(
      container.querySelector('img[src="https://cdn.example/missing.jpg"]')
    ).toBeNull();
  });

  it('without a fallback photograph, the designed placeholder', () => {
    const { container } = render(
      wrap(
        <ThemeImage
          value="https://cdn.example/missing.jpg"
          alt=""
          fallback={<span data-testid="placeholder" />}
        />
      )
    );
    act(() => {
      fireEvent.error(container.querySelector('img')!);
    });
    expect(screen.getByTestId('placeholder')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });

  it('Modern Education: the course pattern replaces a broken thumbnail', () => {
    const { container } = render(
      wrap(
        <T1CourseThumbnail
          src="https://cdn.example/missing.jpg"
          title="React"
        />
      )
    );
    act(() => {
      fireEvent.error(container.querySelector('img')!);
    });
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[aria-hidden] svg')).toBeTruthy();
  });
});

describe('V07 public reads draw their own failure', () => {
  it('marks the catalogue read inline (no app-wide toast)', () => {
    vi.spyOn(publicWebsiteService, 'getPublicCourses').mockResolvedValue(null);
    const client = new QueryClient();
    renderHook(() => usePublicCourses('a1'), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    const [query] = client.getQueryCache().getAll();
    expect(query?.meta?.[INLINE_ERRORS_META]).toBe(true);
  });
});
