/**
 * CMS phase 3c — every theme (and the base renderer) draws the custom
 * section natively, in English and Arabic:
 * - its columns in one grid marked `data-ws-columns` (the design's
 *   "reverse order on phones" applies), one column per configured column;
 * - every element kind: headings at the level chosen (the section title is
 *   the h2 above), plain multi-line text as paragraphs (never markup), the
 *   section buttons with their real destinations and the theme's looks, a
 *   lazy image in a reserved frame, the click-to-play video (no player
 *   before play), a ✓ checklist, an icon with text, a spacer and a divider;
 * - publicly, what has nothing to show is left out (an image or video not
 *   chosen yet, a column left empty), and a section with nothing at all is
 *   not drawn; previews keep everything inert and explain the gaps.
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
  SectionDesignContext,
  resolveSectionDesign,
} from './sections/section-design';
import {
  resolveCustomSection,
  toCustomParagraphs,
} from './sections/bodies/custom-section.logic';
import { getDefaultSectionConfig } from './sections/section-metadata.registry';
import { getSectionConfigSchema } from './schemas/website-section.schemas';
import type { WebsiteLinkRenderer } from './renderer/website-link-renderer.types';
import type {
  SectionRenderProps,
  SectionRenderers,
} from './theme-packs/theme-pack.types';
import type {
  CustomSectionConfig,
  PublicWebsiteLocale,
  SectionDesign,
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

/** Each theme's renderers and the classes of its bold button and its text link. */
const THEMES: readonly [
  WebsiteThemeKey,
  Partial<SectionRenderers>,
  string | null,
][] = [
  ['modern-education', MODERN_EDUCATION_PACK.renderers, 't1-cta'],
  ['atelier', ATELIER_PACK.renderers, 'at-btn'],
  ['manara', MANARA_PACK.renderers, 'mn-btn'],
  ['riwaq', RIWAQ_PACK.renderers, 'rw-btn'],
  // A retired theme draws the shared base renderer.
  ['premium-academy', BASE_RENDERERS, null],
];

const EVERYTHING: CustomSectionConfig = {
  title: lt('Why families choose us', 'لماذا تختارنا الأسر'),
  description: lt('Everything in one place.'),
  layout: 'three',
  verticalAlign: 'center',
  columns: [
    {
      id: 'c1',
      elements: [
        {
          id: 'h1',
          kind: 'heading',
          level: 'h3',
          text: lt('Small groups', 'مجموعات صغيرة'),
        },
        {
          id: 't1',
          kind: 'text',
          text: lt(
            'Ten students at most.\nEvery week.\n\n<b>Not bold</b>',
            'عشرة طلاب على الأكثر.\n\nكل أسبوع.'
          ),
        },
        {
          id: 'b1',
          kind: 'button',
          cta: { label: lt('Chat on WhatsApp'), whatsapp: '+201001234567' },
          secondaryCta: {
            label: lt('Create an account'),
            authAction: 'signUp',
          },
          // Goes nowhere yet: left out publicly.
          tertiaryCta: { label: lt('Call us'), phone: '' },
        },
      ],
    },
    {
      id: 'c2',
      elements: [
        {
          id: 'i1',
          kind: 'image',
          image: '/api/v1/public/media/academies/a1/class.webp',
          imageAlt: lt('A class in progress'),
          ratio: 'portrait',
        },
        { id: 's1', kind: 'spacer', size: 'large' },
        { id: 'd1', kind: 'divider' },
        {
          id: 'l1',
          kind: 'checklist',
          items: [
            { id: 'x1', text: lt('Weekly tests', 'اختبارات أسبوعية') },
            { id: 'x2', text: lt('Monthly reports') },
          ],
        },
      ],
    },
    {
      id: 'c3',
      elements: [
        {
          id: 'v1',
          kind: 'video',
          videoId: 'dQw4w9WgXcQ',
          title: lt('A lesson'),
        },
        {
          id: 'n1',
          kind: 'iconText',
          icon: 'Award',
          title: lt('Certified teachers'),
          text: lt('Every one of them.'),
        },
      ],
    },
  ],
};

function renderSection(
  themeKey: WebsiteThemeKey,
  renderers: Partial<SectionRenderers>,
  config: CustomSectionConfig,
  {
    isPublic = true,
    locale = 'en' as PublicWebsiteLocale,
    design,
  }: {
    isPublic?: boolean;
    locale?: PublicWebsiteLocale;
    design?: SectionDesign;
  } = {}
) {
  const Renderer = (renderers.custom ?? BASE_RENDERERS.custom) as ComponentType<
    SectionRenderProps<'custom'>
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
                  <SectionDesignContext.Provider
                    value={resolveSectionDesign(design, themeKey, 'custom')}
                  >
                    <Renderer
                      config={config}
                      academyId="a1"
                      pages={[]}
                      linkRenderer={isPublic ? linkRenderer : undefined}
                    />
                  </SectionDesignContext.Provider>
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

describe('custom section data', () => {
  it('splits plain text into paragraphs at blank lines and keeps single line breaks', () => {
    expect(toCustomParagraphs('One\nline two\n\n\n Two \r\n\r\nThree')).toEqual(
      ['One\nline two', 'Two', 'Three']
    );
    expect(toCustomParagraphs('   \n\n ')).toEqual([]);
  });

  it('publicly leaves out what has nothing to show, and a column left empty', () => {
    const config: CustomSectionConfig = {
      layout: 'two',
      ratio: 'wideNarrow',
      columns: [
        {
          id: 'a',
          elements: [{ id: 'h', kind: 'heading', level: 'h2', text: lt('Hi') }],
        },
        {
          id: 'b',
          elements: [
            { id: 'i', kind: 'image', imageAlt: lt('Not chosen yet') },
            { id: 'v', kind: 'video', videoId: '' },
            { id: 's', kind: 'spacer', size: 'small' },
          ],
        },
      ],
    };
    const publicView = resolveCustomSection(config, 'en', [], true);
    expect(publicView.columns.map((column) => column.id)).toEqual(['a']);
    // One column remains, so it is drawn as one.
    expect(publicView.layout).toBe('one');
    const preview = resolveCustomSection(config, 'en', [], false);
    expect(preview.layout).toBe('two');
    expect(preview.ratio).toBe('wideNarrow');
    expect(preview.columns[1].elements.map((e) => e.kind)).toEqual([
      'image',
      'video',
      'spacer',
    ]);
  });

  it('arrives as a valid bilingual two-column example', () => {
    const starter = getDefaultSectionConfig('custom');
    expect(getSectionConfigSchema('custom').safeParse(starter).success).toBe(
      true
    );
    expect(starter.layout).toBe('two');
    expect(starter.columns).toHaveLength(2);
    expect(starter.columns[0].elements.map((e) => e.kind)).toEqual([
      'heading',
      'text',
      'button',
    ]);
    expect(starter.columns[1].elements.map((e) => e.kind)).toEqual(['image']);
    for (const element of starter.columns[0].elements) {
      if (element.kind === 'heading' || element.kind === 'text') {
        expect(element.text.en).not.toBe('');
        expect(element.text.ar).not.toBe('');
      }
    }
  });
});

describe.each(THEMES)(
  '%s — custom section',
  (themeKey, renderers, boldClass) => {
    it('draws its columns in one grid, every element kind, at the levels chosen', () => {
      const { container } = renderSection(themeKey, renderers, EVERYTHING);
      const grid = container.querySelector('[data-ws-columns]')!;
      expect(grid).toBeTruthy();
      expect(grid.querySelectorAll('[data-custom-column]')).toHaveLength(3);
      // The section's title is its h2; the element heading is the h3 chosen.
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: 'Why families choose us',
        })
      ).toBeTruthy();
      expect(
        screen.getByRole('heading', { level: 3, name: 'Small groups' })
      ).toBeTruthy();
      expect(
        screen.getByRole('region', { name: 'Why families choose us' })
      ).toBeTruthy();
      // Plain text: paragraphs, line breaks kept, markup shown as typed.
      const text = container.querySelector('[data-custom-element="text"]')!;
      const paragraphs = text.querySelectorAll('p');
      expect(paragraphs).toHaveLength(2);
      expect(paragraphs[0].textContent).toBe(
        'Ten students at most.\nEvery week.'
      );
      expect(paragraphs[1].textContent).toBe('<b>Not bold</b>');
      expect(text.querySelector('b')).toBeNull();
      // Buttons: real destinations; one going nowhere yet is left out.
      const whatsapp = screen.getByRole('link', { name: /Chat on WhatsApp/ });
      expect(whatsapp.getAttribute('href')).toMatch(
        /^https:\/\/wa\.me\/201001234567/
      );
      expect(
        screen
          .getByRole('link', { name: /Create an account/ })
          .getAttribute('href')
      ).toMatch(/sign-?up/i);
      expect(screen.queryByText('Call us')).toBeNull();
      if (boldClass) expect(whatsapp.className).toContain(boldClass);
      // The image: lazy, described, in a reserved frame.
      const image = screen.getByRole('img', { name: 'A class in progress' });
      expect(image.getAttribute('loading')).toBe('lazy');
      expect(image.closest('.aspect-\\[4\\/5\\]')).toBeTruthy();
      // Spacer and divider.
      expect(
        container
          .querySelector('[data-custom-spacer="large"]')
          ?.getAttribute('aria-hidden')
      ).toBe('true');
      expect(container.querySelector('hr')).toBeTruthy();
      // The checklist: a list, its ✓ marks decorative.
      const list = container.querySelector(
        '[data-custom-element="checklist"] ul'
      )!;
      const items = within(list as HTMLElement).getAllByRole('listitem');
      expect(items.map((item) => item.textContent)).toEqual([
        'Weekly tests',
        'Monthly reports',
      ]);
      items.forEach((item) =>
        expect(item.querySelector('[aria-hidden="true"] svg')).toBeTruthy()
      );
      // Icon with text: the icon decorative beside its words.
      const iconText = container.querySelector(
        '[data-custom-element="iconText"]'
      )!;
      expect(iconText.textContent).toContain('Certified teachers');
      expect(iconText.querySelector('[aria-hidden="true"] svg')).toBeTruthy();
      // Shorter columns centred, as chosen.
      expect(grid.className).toContain('md:items-center');
    });

    it('loads nothing from YouTube’s player until play is pressed', () => {
      const { container } = renderSection(themeKey, renderers, EVERYTHING);
      const frame = container.querySelector('[data-video-frame]')!;
      expect(frame.className).toContain('aspect-[16/9]');
      expect(container.querySelector('iframe')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: /A lesson/ }));
      const player = container.querySelector('iframe')!;
      expect(player.getAttribute('src')).toMatch(
        /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/
      );
    });

    it('applies the design’s phone order to its columns', () => {
      const { container } = renderSection(themeKey, renderers, EVERYTHING, {
        design: { reverseOnMobile: true },
      });
      const grid = container.querySelector('[data-ws-columns]')!;
      expect(grid.closest('[data-ws-reverse-mobile]')).toBeTruthy();
    });

    it('draws two columns at the chosen widths, and Arabic copy in Arabic', () => {
      const { container } = renderSection(
        themeKey,
        renderers,
        {
          layout: 'two',
          ratio: 'narrowWide',
          columns: [
            {
              id: 'a',
              elements: [
                {
                  id: 'h',
                  kind: 'heading',
                  level: 'h2',
                  text: lt('Hi', 'مرحبًا'),
                },
              ],
            },
            {
              id: 'b',
              elements: [
                {
                  id: 'l',
                  kind: 'checklist',
                  items: [{ id: 'x', text: lt('Tests', 'اختبارات') }],
                },
              ],
            },
          ],
        },
        { locale: 'ar' }
      );
      const grid = container.querySelector('[data-ws-columns]')!;
      expect(grid.className).toContain(
        'md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]'
      );
      // Without a title, the first heading names the section.
      expect(
        screen.getByRole('heading', { level: 2, name: 'مرحبًا' })
      ).toBeTruthy();
      expect(screen.getByRole('region', { name: 'مرحبًا' })).toBeTruthy();
      expect(screen.getByText('اختبارات')).toBeTruthy();
    });

    it('publicly leaves out an image or video not chosen yet, and draws nothing with nothing to show', () => {
      const config: CustomSectionConfig = {
        layout: 'two',
        columns: [
          {
            id: 'a',
            elements: [{ id: 't', kind: 'text', text: lt('Only this') }],
          },
          {
            id: 'b',
            elements: [
              { id: 'i', kind: 'image' },
              { id: 'v', kind: 'video', videoId: '' },
            ],
          },
        ],
      };
      const { container } = renderSection(themeKey, renderers, config);
      expect(container.querySelectorAll('[data-custom-column]')).toHaveLength(
        1
      );
      expect(container.querySelector('[data-preview-note]')).toBeNull();
      expect(container.querySelector('[data-video-frame]')).toBeNull();
      cleanup();
      const empty = renderSection(themeKey, renderers, {
        layout: 'one',
        columns: [{ id: 'a', elements: [{ id: 'd', kind: 'divider' }] }],
      });
      expect(empty.container.querySelector('section')).toBeNull();
    });

    it('previews keep every column inert and say what visitors will not see', () => {
      const { container } = renderSection(
        themeKey,
        renderers,
        {
          layout: 'three',
          columns: [
            {
              id: 'a',
              elements: [
                {
                  id: 'b',
                  kind: 'button',
                  cta: { label: lt('Book'), pageId: 'missing' },
                },
              ],
            },
            { id: 'b', elements: [{ id: 'v', kind: 'video', videoId: '' }] },
            { id: 'c', elements: [] },
          ],
        },
        { isPublic: false }
      );
      expect(container.querySelectorAll('[data-custom-column]')).toHaveLength(
        3
      );
      expect(container.querySelector('a')).toBeNull();
      expect(screen.getByRole('button', { name: /Book/ })).toBeTruthy();
      const notes = [...container.querySelectorAll('[data-preview-note]')].map(
        (note) => note.textContent
      );
      expect(notes).toEqual([
        expect.stringMatching(/YouTube link/),
        expect.stringMatching(/Column 3 is empty/),
      ]);
    });
  }
);
