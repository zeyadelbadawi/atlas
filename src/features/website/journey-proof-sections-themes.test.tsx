/**
 * CMS phase 3d (batch D) — every theme (and the base renderer) draws the
 * timeline, video reviews, downloads and certificates sections:
 * - timeline: an ordered list (`<ol>`), each milestone a heading with its
 *   period and description, an icon or the number as decoration;
 * - video reviews: nothing from YouTube's player until play is pressed, a
 *   reserved 16:9 frame, only one video playing at a time; sample reviews
 *   and reviews without a video never reach the public site;
 * - downloads: whole-row links with the type in their name; a media-library
 *   file downloads in place (`download`), anything else opens in a new tab
 *   with `rel="noopener noreferrer"`; an unsafe link is never drawn;
 * - certificates: lazy images in a reserved frame, the full size as a plain
 *   new-tab link, issuer and year (Arabic digits in Arabic);
 * - previews draw everything inert, label samples, and explain an empty
 *   section that visitors never see.
 */
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
import {
  resolveDownloads,
  resolveVideoReviews,
} from './sections/bodies/journey-proof.logic';
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

const TIMELINE: SectionConfigMap['timeline'] = {
  title: lt('Your path to the final exam', 'طريقك إلى الامتحان النهائي'),
  description: lt('One year, three stages.'),
  items: [
    {
      id: 'm1',
      title: lt('Term 1', 'الترم الأول'),
      period: lt('Sept – Dec', 'سبتمبر – ديسمبر'),
      description: lt('The foundations.'),
      icon: 'BookOpen',
    },
    { id: 'm2', title: lt('Term 2', 'الترم الثاني'), icon: '' },
    { id: 'm3', title: lt('Final revision', 'المراجعة النهائية') },
    // Left out: no title.
    { id: 'm4', title: lt('') },
  ],
};

const REVIEWS: SectionConfigMap['videoTestimonials'] = {
  title: lt('Hear it from our families'),
  items: [
    {
      id: 'v1',
      videoId: 'dQw4w9WgXcQ',
      name: 'Mona Hassan',
      role: lt('Parent of a Grade 12 student'),
      quote: lt('He finally enjoys physics.'),
    },
    {
      id: 'v2',
      videoId: 'aqz-KE-bpKQ',
      name: 'Karim Saad',
      role: lt('Grade 12 student'),
      poster: '/api/v1/public/media/academies/a1/karim.webp',
    },
    {
      id: 'v3',
      videoId: '',
      name: 'Sample Parent',
      role: lt('Parent'),
      sample: true,
    },
    // A real review whose video is not chosen yet: never public.
    { id: 'v4', videoId: '', name: 'No Video Yet', role: lt('Parent') },
  ],
};

const DOWNLOADS: SectionConfigMap['downloads'] = {
  title: lt('Notes and revision sheets'),
  items: [
    {
      id: 'd1',
      title: lt('Term 1 revision sheet'),
      description: lt('Units 1 to 3'),
      url: '/api/v1/public/media/academies/a1/term-1.pdf',
      fileSize: '2.4 MB',
    },
    {
      id: 'd2',
      title: lt('Past papers'),
      url: 'https://drive.google.com/file/d/abc123/view',
      fileType: 'PDF',
    },
    // Never drawn as a link.
    { id: 'd3', title: lt('Bad link'), url: 'javascript:alert(1)' },
    { id: 'd4', title: lt('Not yet'), url: '' },
  ],
};

const CERTIFICATES: SectionConfigMap['certificates'] = {
  title: lt('Certificates and accreditations', 'الشهادات والاعتمادات'),
  items: [
    {
      id: 'c1',
      image: '/api/v1/public/media/academies/a1/iso.png',
      title: lt('ISO 9001 quality certificate', 'شهادة الجودة ISO 9001'),
      issuer: lt('Bureau Veritas', 'بيورو فيريتاس'),
      year: '2025',
    },
    {
      id: 'c2',
      image: 'https://cdn.example/award.jpg',
      title: lt('Best academy award'),
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

describe('batch D section data', () => {
  it('a download reads its type from the link, and only same-origin media downloads in place', () => {
    const [sheet, papers, bad] = resolveDownloads(DOWNLOADS, 'en', false);
    expect(sheet).toMatchObject({
      typeLabel: 'PDF',
      kind: 'pdf',
      sameOrigin: true,
      size: '2.4 MB',
    });
    expect(papers).toMatchObject({ typeLabel: 'PDF', sameOrigin: false });
    expect(bad.href).toBe('');
    // Publicly, items without a usable link are left out.
    expect(resolveDownloads(DOWNLOADS, 'en', true).map((d) => d.id)).toEqual([
      'd1',
      'd2',
    ]);
  });

  it('the public site never gets a sample review or one without a video', () => {
    expect(resolveVideoReviews(REVIEWS, 'en', true).map((r) => r.id)).toEqual([
      'v1',
      'v2',
    ]);
    expect(resolveVideoReviews(REVIEWS, 'en', false).map((r) => r.id)).toEqual([
      'v1',
      'v2',
      'v3',
      'v4',
    ]);
  });
});

describe.each(THEMES)(
  '%s — CMS phase 3d batch D sections',
  (themeKey, renderers) => {
    it('timeline: an ordered list of milestones with their periods; icons and numbers are decoration', () => {
      const { container } = renderSection(
        themeKey,
        renderers,
        'timeline',
        TIMELINE
      );
      expect(
        screen.getByRole('heading', { name: 'Your path to the final exam' })
      ).toBeTruthy();
      const list = container.querySelector('ol[data-timeline]')!;
      expect(list).toBeTruthy();
      const items = within(list as HTMLElement).getAllByRole('listitem');
      expect(items).toHaveLength(3);
      expect(
        within(list as HTMLElement)
          .getAllByRole('heading', { level: 3 })
          .map((h) => h.textContent)
      ).toEqual(['Term 1', 'Term 2', 'Final revision']);
      // The period is shown with its milestone, read after the title.
      const first = items[0];
      expect(first.textContent).toContain('Sept – Dec');
      expect(first.textContent).toContain('The foundations.');
      const heading = within(first).getByRole('heading');
      const period = within(first).getByText('Sept – Dec');
      expect(
        heading.compareDocumentPosition(period) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      // Markers: an icon for the first, the number for the others, hidden from AT.
      const markers = list.querySelectorAll('[data-timeline-marker]');
      expect(markers).toHaveLength(3);
      markers.forEach((marker) =>
        expect(marker.getAttribute('aria-hidden')).toBe('true')
      );
      expect(markers[0].querySelector('svg')).toBeTruthy();
      expect(markers[1].textContent).toMatch(/2/);
      // One spine segment between each pair of milestones.
      expect(list.querySelectorAll('[data-timeline-line]')).toHaveLength(2);
    });

    it('timeline: Arabic copy and Arabic digits in Arabic', () => {
      const { container } = renderSection(
        themeKey,
        renderers,
        'timeline',
        TIMELINE,
        { locale: 'ar' }
      );
      expect(screen.getByText('الترم الأول')).toBeTruthy();
      expect(screen.getByText('سبتمبر – ديسمبر')).toBeTruthy();
      const markers = container.querySelectorAll('[data-timeline-marker]');
      expect(markers[1].textContent).toMatch(/٢/);
      expect(markers[1].textContent).not.toMatch(/[0-9]/);
    });

    it('video reviews: posters only until play; one video plays at a time', () => {
      const { container } = renderSection(
        themeKey,
        renderers,
        'videoTestimonials',
        REVIEWS
      );
      // Samples and reviews without a video never reach the public site.
      expect(container.textContent).not.toContain('Sample Parent');
      expect(container.textContent).not.toContain('No Video Yet');
      expect(screen.getByText('Mona Hassan')).toBeTruthy();
      expect(screen.getByText('Parent of a Grade 12 student')).toBeTruthy();
      expect(screen.getByText('He finally enjoys physics.')).toBeTruthy();

      // Nothing from the player yet; frames are reserved at 16:9.
      expect(container.querySelector('iframe')).toBeNull();
      const frames = container.querySelectorAll('[data-video-frame]');
      expect(frames).toHaveLength(2);
      frames.forEach((frame) =>
        expect(frame.className).toContain('aspect-[16/9]')
      );
      // The uploaded poster is used (lazy) instead of YouTube's thumbnail.
      const karimPoster = frames[1].querySelector('img')!;
      expect(karimPoster.getAttribute('src')).toBe(
        '/api/v1/public/media/academies/a1/karim.webp'
      );
      expect(karimPoster.getAttribute('loading')).toBe('lazy');

      fireEvent.click(
        screen.getByRole('button', { name: 'Play video: Mona Hassan’s review' })
      );
      let players = container.querySelectorAll('iframe');
      expect(players).toHaveLength(1);
      expect(players[0].getAttribute('src')).toContain(
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
      );
      expect(document.activeElement).toBe(players[0]);

      // Starting the second returns the first to its poster.
      fireEvent.click(
        screen.getByRole('button', { name: 'Play video: Karim Saad’s review' })
      );
      players = container.querySelectorAll('iframe');
      expect(players).toHaveLength(1);
      expect(players[0].getAttribute('src')).toContain('aqz-KE-bpKQ');
      expect(
        screen.getByRole('button', { name: 'Play video: Mona Hassan’s review' })
      ).toBeTruthy();
    });

    it('downloads: whole-row links named with their type; same-origin files download, others open safely', () => {
      const { container } = renderSection(
        themeKey,
        renderers,
        'downloads',
        DOWNLOADS
      );
      const sheet = screen.getByRole('link', {
        name: 'Term 1 revision sheet — PDF, 2.4 MB (download)',
      });
      expect(sheet.getAttribute('href')).toBe(
        '/api/v1/public/media/academies/a1/term-1.pdf'
      );
      expect(sheet.hasAttribute('download')).toBe(true);
      expect(sheet.getAttribute('target')).toBeNull();
      // The description describes the link.
      const describedBy = sheet.getAttribute('aria-describedby')!;
      expect(document.getElementById(describedBy)?.textContent).toBe(
        'Units 1 to 3'
      );
      // A 44px+ target: the row itself is the link.
      expect(sheet.className).toContain('min-h-[4rem]');

      const papers = screen.getByRole('link', {
        name: 'Past papers — PDF (opens in a new tab)',
      });
      expect(papers.getAttribute('target')).toBe('_blank');
      expect(papers.getAttribute('rel')).toBe('noopener noreferrer');
      expect(papers.hasAttribute('download')).toBe(false);

      // An unsafe or missing link never reaches the page.
      expect(container.textContent).not.toContain('Bad link');
      expect(container.textContent).not.toContain('Not yet');
      expect(container.querySelector('a[href^="javascript"]')).toBeNull();
      expect(container.querySelectorAll('[data-downloads] > li')).toHaveLength(
        2
      );
    });

    it('certificates: lazy images in a reserved frame, full size in a new tab, issuer and year', () => {
      const { container } = renderSection(
        themeKey,
        renderers,
        'certificates',
        CERTIFICATES
      );
      expect(
        screen.getByRole('heading', { name: 'ISO 9001 quality certificate' })
      ).toBeTruthy();
      expect(screen.getByText(/Bureau Veritas/)).toBeTruthy();
      expect(container.querySelector('time')?.getAttribute('dateTime')).toBe(
        '2025'
      );
      const full = screen.getByRole('link', {
        name: 'View ISO 9001 quality certificate full size (opens in a new tab)',
      });
      expect(full.getAttribute('href')).toBe(
        '/api/v1/public/media/academies/a1/iso.png'
      );
      expect(full.getAttribute('target')).toBe('_blank');
      expect(full.getAttribute('rel')).toBe('noopener noreferrer');
      const frames = container.querySelectorAll('[data-certificate-frame]');
      expect(frames).toHaveLength(2);
      frames.forEach((frame) => {
        expect(frame.className).toContain('aspect-[4/3]');
        const image = frame.querySelector('img')!;
        expect(image.getAttribute('loading')).toBe('lazy');
        expect(image.className).toContain('object-contain');
      });
      // No script-driven viewer: nothing to press but the links.
      expect(container.querySelector('button')).toBeNull();
    });

    it('certificates: the year in Arabic digits in Arabic', () => {
      const { container } = renderSection(
        themeKey,
        renderers,
        'certificates',
        CERTIFICATES,
        { locale: 'ar' }
      );
      expect(screen.getByText('الشهادات والاعتمادات')).toBeTruthy();
      expect(container.querySelector('time')?.textContent).toBe('٢٠٢٥');
    });

    it('previews are inert, label sample reviews and explain an empty section visitors never see', () => {
      const reviews = renderSection(
        themeKey,
        renderers,
        'videoTestimonials',
        REVIEWS,
        { isPublic: false }
      );
      expect(screen.getByText('Sample Parent')).toBeTruthy();
      expect(screen.getAllByText('Sample').length).toBeGreaterThan(0);
      // A review without its video yet keeps its place, same size.
      expect(
        reviews.container.querySelectorAll('[data-video-placeholder]')
      ).toHaveLength(2);
      expect(reviews.container.querySelector('button')).toBeNull();
      cleanup();

      const downloads = renderSection(
        themeKey,
        renderers,
        'downloads',
        DOWNLOADS,
        { isPublic: false }
      );
      expect(downloads.container.querySelector('a')).toBeNull();
      expect(screen.getByText('Not yet')).toBeTruthy();
      expect(screen.getAllByText(/No link yet/).length).toBeGreaterThan(0);
      cleanup();

      const certificates = renderSection(
        themeKey,
        renderers,
        'certificates',
        { ...CERTIFICATES, items: [] },
        { isPublic: false }
      );
      expect(
        certificates.container.querySelector('[data-preview-note]')?.textContent
      ).toMatch(/Add certificate images/);
      cleanup();

      const hidden = renderSection(themeKey, renderers, 'timeline', {
        ...TIMELINE,
        items: [],
      });
      expect(hidden.container.querySelector('section')).toBeNull();
    });
  }
);
