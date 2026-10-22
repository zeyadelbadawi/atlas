/**
 * CMS phase 3d — every theme (and the base renderer) draws the logos, map,
 * schedule and results sections:
 * - logos: each logo named by its alt text; a linked one opens in a new
 *   tab and says so; no marquee;
 * - map: the address with its line breaks, a directions link to Google
 *   Maps, and NO frame until "Show map" is pressed — then the embed, in the
 *   box that was already reserved;
 * - schedule: a real table with headers grouped by day (Saturday first)
 *   and the same rows as cards; times in the visitor's locale, Arabic
 *   digits in Arabic;
 * - results: the result, the name, initials without a photo, a labelled
 *   "Top student" badge;
 * - sample rows and results never reach the public site, and are labelled
 *   "Sample" in previews; an empty section is left out publicly and
 *   explained in previews.
 */
import { formatScheduleTime } from './sections/bodies/section-bodies.logic';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import { PublicWebsiteLocaleProvider } from './renderer/PublicWebsiteLocaleContext';
import { WebsiteIdentityProvider } from './renderer/WebsiteIdentityContext';
import { WebsiteThemeScope } from './renderer/WebsiteThemeScope';
import { getWebsiteTheme } from './themes/website-theme.registry';
import { MODERN_EDUCATION_PACK } from './modern-education/modern-education.pack';
import { ATELIER_PACK } from './atelier/atelier.pack';
import { MANARA_PACK } from './manara/manara.pack';
import { RIWAQ_PACK } from './riwaq/riwaq.pack';
import { BASE_RENDERERS } from './theme-packs/base-renderers';
import type { WebsiteLinkRenderer } from './renderer/website-link-renderer.types';
import type {
  SectionRenderProps,
  SectionRenderers,
} from './theme-packs/theme-pack.types';
import type {
  PublicWebsiteLocale,
  SectionConfigMap,
  SectionType,
  WebsiteThemeKey,
} from '@types';

vi.mock('@/shared/hooks/usePublicWebsiteStatistics', () => ({
  usePublicWebsiteStatistics: () => ({
    data: { courses: 0, students: 0, instructors: 0 },
    isLoading: false,
  }),
}));

const lt = (en: string, ar = '') => ({ en, ar });
const linkRenderer: WebsiteLinkRenderer = ({
  href,
  external,
  className,
  children,
}) => (
  <a
    href={href}
    className={className}
    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
  >
    {children}
  </a>
);

const THEMES: readonly [WebsiteThemeKey, Partial<SectionRenderers>][] = [
  ['modern-education', MODERN_EDUCATION_PACK.renderers],
  ['atelier', ATELIER_PACK.renderers],
  ['manara', MANARA_PACK.renderers],
  ['riwaq', RIWAQ_PACK.renderers],
  // A retired theme draws the shared base renderers.
  ['premium-academy', BASE_RENDERERS],
];

const LOGOS: SectionConfigMap['logos'] = {
  title: lt('Accredited by'),
  items: [
    {
      id: 'l1',
      image: '/api/v1/public/media/a1/moe.png',
      alt: lt('Ministry of Education'),
      url: 'https://moe.gov.eg',
    },
    {
      id: 'l2',
      image: '/api/v1/public/media/a1/uni.png',
      alt: lt('Cairo University'),
    },
  ],
};

const MAP: SectionConfigMap['map'] = {
  title: lt('Visit us'),
  address: lt('12 Tahrir St.\nDokki, Giza'),
  note: lt('Next to Dokki metro'),
  query: '30.0384,31.2122',
};

const SCHEDULE: SectionConfigMap['schedule'] = {
  title: lt('Weekly schedule', 'جدول الحصص'),
  items: [
    {
      id: 'r-mon',
      day: 'mon',
      start: '18:00',
      end: '19:30',
      title: lt('Physics', 'فيزياء'),
      location: lt('Hall 2'),
    },
    {
      id: 'r-sat-late',
      day: 'sat',
      start: '16:00',
      end: '17:30',
      title: lt('Math', 'رياضيات'),
      teacher: lt('Mr. Hany'),
    },
    {
      id: 'r-sat-early',
      day: 'sat',
      start: '09:00',
      end: '10:00',
      title: lt('Arabic', 'لغة عربية'),
    },
    {
      id: 'r-sample',
      day: 'fri',
      start: '10:00',
      end: '11:00',
      title: lt('Sample class'),
      sample: true,
    },
  ],
};

const RESULTS: SectionConfigMap['results'] = {
  title: lt('Our top students'),
  items: [
    {
      id: 'x1',
      studentName: 'Mariam Adel',
      result: lt('98%'),
      detail: lt('Secondary 3'),
      top: true,
    },
    {
      id: 'x2',
      studentName: 'Sample Student',
      result: lt('First in Egypt'),
      sample: true,
    },
  ],
};

function renderSection<TType extends SectionType>(
  themeKey: WebsiteThemeKey,
  renderers: Partial<SectionRenderers>,
  type: TType,
  config: SectionConfigMap[TType],
  { isPublic = true, locale = 'en' as PublicWebsiteLocale } = {}
) {
  const Renderer = (renderers[type] ?? BASE_RENDERERS[type]) as ComponentType<
    SectionRenderProps<TType>
  >;
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={createI18nInstance(locale)}>
        <MemoryRouter>
          <WebsiteIdentityProvider value={{ name: 'Horizon Academy' }}>
            <PublicWebsiteLocaleProvider locale={locale}>
              <WebsiteThemeScope
                theme={getWebsiteTheme(themeKey)}
                brand={{
                  primaryColor: '',
                  secondaryColor: '',
                  accentColor: '',
                }}
              >
                <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
                  <Renderer
                    config={config}
                    academyId="a1"
                    pages={[]}
                    linkRenderer={isPublic ? linkRenderer : undefined}
                  />
                </div>
              </WebsiteThemeScope>
            </PublicWebsiteLocaleProvider>
          </WebsiteIdentityProvider>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

afterEach(cleanup);

describe('schedule times', () => {
  it('are shown in the visitor’s locale, with Arabic digits in Arabic', () => {
    expect(formatScheduleTime('16:00', 'en')).toMatch(/^4:00\sPM$/);
    expect(formatScheduleTime('09:05', 'en')).toMatch(/^9:05\sAM$/);
    const arabic = formatScheduleTime('16:00', 'ar');
    expect(arabic).toContain('٤:٠٠');
    expect(arabic).not.toMatch(/[0-9]/);
  });
});

describe.each(THEMES)('%s — CMS phase 3d sections', (themeKey, renderers) => {
  it('logos: equal tiles named by their alt text; a linked logo opens in a new tab', () => {
    const { container } = renderSection(themeKey, renderers, 'logos', LOGOS);
    expect(screen.getByRole('heading', { name: 'Accredited by' })).toBeTruthy();
    const link = screen.getByRole('link', { name: /Ministry of Education/ });
    expect(link.getAttribute('href')).toBe('https://moe.gov.eg');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.textContent).toContain('(opens in a new tab)');
    const unlinked = screen.getByRole('img', { name: 'Cairo University' });
    expect(unlinked.closest('a')).toBeNull();
    expect(unlinked.getAttribute('loading')).toBe('lazy');
    // A calm grid: no marquee, no animation driving it.
    expect(container.querySelector('marquee')).toBeNull();
    expect(container.querySelectorAll('[data-logo-grid] > li')).toHaveLength(2);
  });

  it('map: address, directions, and no frame until "Show map"', () => {
    const { container } = renderSection(themeKey, renderers, 'map', MAP);
    const address = container.querySelector('address')!;
    expect(address.textContent).toContain('12 Tahrir St.');
    expect(address.textContent).toContain('Dokki, Giza');
    expect(screen.getByText('Next to Dokki metro')).toBeTruthy();
    const directions = screen.getByRole('link', { name: /Get directions/ });
    expect(directions.getAttribute('href')).toBe(
      'https://www.google.com/maps/search/?api=1&query=30.0384%2C31.2122'
    );
    expect(directions.getAttribute('target')).toBe('_blank');

    // Nothing from Google is on the page yet; the box is reserved.
    expect(container.querySelector('iframe')).toBeNull();
    const box = container.querySelector('[data-map-embed]')!;
    expect(box.getAttribute('data-map-embed')).toBe('closed');
    fireEvent.click(screen.getByRole('button', { name: 'Show map' }));
    const frame = container.querySelector('iframe')!;
    expect(frame.getAttribute('src')).toBe(
      'https://www.google.com/maps?q=30.0384%2C31.2122&output=embed'
    );
    expect(frame.getAttribute('title')).toBe('Map: 12 Tahrir St.');
    expect(frame.parentElement).toBe(box);
    expect(document.activeElement).toBe(frame);
  });

  it('schedule: a table grouped by day (Saturday first) and the same rows as cards, samples left out', () => {
    const { container } = renderSection(
      themeKey,
      renderers,
      'schedule',
      SCHEDULE
    );
    const table = screen.getByRole('table', { name: 'Weekly schedule' });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((th) => th.textContent);
    expect(headers).toEqual([
      'Day',
      'Time',
      'Course or group',
      'Teacher',
      'Place',
    ]);
    const days = within(table)
      .getAllByRole('rowheader')
      .map((th) => th.textContent);
    expect(days).toEqual(['Saturday', 'Monday']);
    const bodies = table.querySelectorAll('tbody');
    expect(bodies).toHaveLength(2);
    // Sorted by start time within the day.
    expect(bodies[0].textContent!.indexOf('Arabic')).toBeLessThan(
      bodies[0].textContent!.indexOf('Math')
    );
    expect(table.querySelector('time')!.getAttribute('dateTime')).toBe('09:00');
    // Phones: the same rows as cards under a heading per day.
    expect(
      screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    ).toEqual(['Saturday', 'Monday']);
    // §D.4: a sample row never reaches the public site.
    expect(container.textContent).not.toContain('Sample class');
  });

  it('schedule: Arabic labels and Arabic digits in Arabic', () => {
    renderSection(themeKey, renderers, 'schedule', SCHEDULE, {
      locale: 'ar',
    });
    const table = screen.getByRole('table', { name: 'جدول الحصص' });
    expect(within(table).getAllByRole('rowheader')[0].textContent).toBe(
      'السبت'
    );
    expect(table.textContent).toContain('٩:٠٠');
    expect(table.textContent).toContain('رياضيات');
  });

  it('results: result, name, initials without a photo, a labelled top badge; samples left out', () => {
    const { container } = renderSection(
      themeKey,
      renderers,
      'results',
      RESULTS
    );
    expect(screen.getByText('98%')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Mariam Adel' })).toBeTruthy();
    expect(container.textContent).toContain('MA');
    const badge = container.querySelector('[data-top-badge]')!;
    expect(badge.textContent).toBe('Top student');
    expect(container.textContent).not.toContain('Sample Student');
  });

  it('previews label samples, and explain an empty section that visitors never see', () => {
    renderSection(themeKey, renderers, 'results', RESULTS, { isPublic: false });
    expect(screen.getByText('Sample Student')).toBeTruthy();
    expect(screen.getAllByText('Sample').length).toBeGreaterThan(0);
    cleanup();

    renderSection(themeKey, renderers, 'schedule', SCHEDULE, {
      isPublic: false,
    });
    expect(screen.getAllByText('Sample class').length).toBeGreaterThan(0);
    cleanup();

    const empty = renderSection(
      themeKey,
      renderers,
      'logos',
      { ...LOGOS, items: [] },
      { isPublic: false }
    );
    expect(
      empty.container.querySelector('[data-preview-note]')?.textContent
    ).toMatch(/Add logos/);
    cleanup();

    const hidden = renderSection(themeKey, renderers, 'map', {
      ...MAP,
      address: lt(''),
      query: '',
    });
    expect(hidden.container.querySelector('section')).toBeNull();
  });
});
