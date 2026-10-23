/**
 * CMS phase 3e — the presets' previews are honest: every preset is drawn
 * by each theme's own section renderer (`PresetSectionsCanvas`, the canvas
 * the miniatures put in their device frame), in English and in Arabic
 * (right to left), showing its own copy, its samples labelled and its
 * design on the theme's shell.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import type { SectionType, WebsiteConfiguration, WebsitePage } from '@types';
import { WebsitePreviewProvider } from '../renderer/WebsitePreviewContext';
import { PresetSectionsCanvas } from './PresetPreview';
import {
  SECTION_PRESETS,
  presetId,
  presetsFor,
  sectionFromPreset,
} from './section-presets.registry';
import type { SectionPreset } from './section-presets.types';
import { THEMES } from './test-support/preset-assertions';

vi.mock('@/shared/hooks/usePublicWebsiteStatistics', () => ({
  usePublicWebsiteStatistics: () => ({
    data: { courses: 4, students: 120, instructors: 3 },
    isLoading: false,
  }),
}));

const ALL_PRESETS = (Object.keys(SECTION_PRESETS) as SectionType[]).flatMap(
  (type) => presetsFor(type) as readonly SectionPreset[]
);

const pages = [
  {
    id: 'page-courses',
    coreType: 'courses',
    slug: 'courses',
    title: 'Courses',
    visible: true,
    pageType: 'core',
    sections: [],
  },
] as unknown as WebsitePage[];

/** The copy a preset's preview must show: its title, its notice, or its first item. */
function headlineOf(
  config: Record<string, unknown>,
  locale: 'en' | 'ar'
): string {
  const pick = (value: unknown) =>
    value && typeof value === 'object'
      ? (value as Record<string, string>)[locale]
      : '';
  if (config.title) return pick(config.title);
  if (config.text) return pick(config.text);
  const items = config.items as { title: unknown }[];
  return pick(items[0].title);
}

afterEach(cleanup);

describe.each(THEMES)('%s draws every preset', (themeKey) => {
  it.each(ALL_PRESETS.map((preset) => [presetId(preset), preset] as const))(
    '%s',
    (_id, preset) => {
      for (const locale of ['en', 'ar'] as const) {
        const section = sectionFromPreset(preset, { themeKey, pages });
        const { container, unmount } = render(
          <QueryClientProvider client={new QueryClient()}>
            <I18nextProvider i18n={createI18nInstance(locale)}>
              <MemoryRouter>
                <WebsitePreviewProvider value>
                  <PresetSectionsCanvas
                    source={{
                      academyId: 'a1',
                      academyName: 'Acme Academy',
                      configuration: {
                        themeKey,
                        brand: {},
                        navigation: [],
                        header: {},
                        footer: {},
                      } as unknown as WebsiteConfiguration,
                      pages,
                      locale,
                    }}
                    sections={[section]}
                  />
                </WebsitePreviewProvider>
              </MemoryRouter>
            </I18nextProvider>
          </QueryClientProvider>
        );
        // Drawn by the theme's own pack, in the previewed direction.
        expect(
          container.querySelector(`[data-theme-pack="${themeKey}"]`)
        ).not.toBeNull();
        expect(
          container.querySelector(`[dir="${locale === 'ar' ? 'rtl' : 'ltr'}"]`)
        ).not.toBeNull();
        // Its own copy, not a picture of it.
        const headline = headlineOf(
          section.config as unknown as Record<string, unknown>,
          locale
        );
        expect(container.textContent).toContain(
          headline.replace(/[[\]]/g, '').slice(0, 12)
        );
        unmount();
      }
    }
  );
});
