/**
 * CMS phase 3 — a section's design: which controls a section offers under
 * a theme, how a chosen ground resolves to the theme's own, and the data
 * attributes a section's root carries (no extra element on the page).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import type { SectionInstance } from '@types';
import {
  SECTION_BACKGROUND_SUPPORT,
  backgroundsFor,
  designControlsFor,
  resolveSectionDesign,
  sectionDesignAttributes,
} from './section-design';
import { SectionRenderer } from './SectionRenderer';
import { ThemePackContext } from '../theme-packs/ThemePackContext';
import { MODERN_EDUCATION_PACK } from '../modern-education/modern-education.pack';
import { type MANARA_PACK } from '../manara/manara.pack';
import { tidyDesign } from '../visual-editor/SectionDesignPanel';

afterEach(cleanup);

describe('section design — what a theme offers', () => {
  it('offers only grounds the theme has, for sections that read on them', () => {
    for (const [theme, types] of Object.entries(SECTION_BACKGROUND_SUPPORT)) {
      for (const type of types ?? []) {
        expect(backgroundsFor(theme as never, type).length).toBeGreaterThan(0);
      }
    }
    // The hero is each theme's opening scene: never a chosen ground.
    expect(backgroundsFor('manara', 'hero')).toEqual([]);
  });

  it('offers grounds to the phase 3d sections that passed the contrast pass', () => {
    // The notice strip keeps its own tone in every theme.
    for (const theme of Object.keys(SECTION_BACKGROUND_SUPPORT)) {
      expect(backgroundsFor(theme as never, 'announcementBar')).toEqual([]);
    }
    // Theme 1 and Atelier draw the countdown as a dark band of their own.
    expect(backgroundsFor('modern-education', 'countdown')).toEqual([]);
    expect(backgroundsFor('atelier', 'countdown')).toEqual([]);
    expect(backgroundsFor('manara', 'countdown').length).toBeGreaterThan(0);
    // Riwaq's light form and comparison cards vanish on its deep ground.
    expect(backgroundsFor('riwaq', 'interestForm')).toEqual([]);
    expect(backgroundsFor('riwaq', 'comparison')).toEqual([]);
    expect(backgroundsFor('riwaq', 'logos').length).toBeGreaterThan(0);
    expect(
      backgroundsFor('modern-education', 'pricing').length
    ).toBeGreaterThan(0);
  });

  it('offers "wide" only where the container is narrower than wide', () => {
    expect(designControlsFor('modern-education', 'features').width).toBe(true);
    expect(designControlsFor('riwaq', 'features').width).toBe(false);
  });

  it('offers the phone order only for two-column sections', () => {
    expect(designControlsFor('atelier', 'featureSplit').reverseOnMobile).toBe(
      true
    );
    expect(designControlsFor('atelier', 'features').reverseOnMobile).toBe(
      false
    );
  });

  it('resolves a chosen ground to the theme’s own name, or not at all', () => {
    const supported = SECTION_BACKGROUND_SUPPORT.manara?.[0];
    if (supported) {
      expect(
        resolveSectionDesign({ background: 'dark' }, 'manara', supported).ground
      ).toBe('night');
    }
    // A ground the theme lacks draws the section on its usual one.
    expect(
      resolveSectionDesign({ background: 'brand' }, 'riwaq', 'features').ground
    ).toBeUndefined();
    expect(resolveSectionDesign(undefined, 'riwaq', 'features')).toEqual({});
  });
});

describe('section design — attributes', () => {
  it('puts only chosen values on the root', () => {
    expect(
      sectionDesignAttributes({
        spacing: 'compact',
        spacingMobile: 'spacious',
        align: 'center',
        width: 'wide',
        reverseOnMobile: true,
      })
    ).toEqual({
      'data-ws-space': 'compact',
      'data-ws-space-mobile': 'spacious',
      'data-ws-align': 'center',
      'data-ws-width': 'wide',
      'data-ws-reverse-mobile': '',
    });
    expect(
      Object.values(
        sectionDesignAttributes({ spacing: 'default', align: 'start' })
      ).every((value) => value === undefined)
    ).toBe(true);
  });

  it('drops empty choices, and an empty design altogether', () => {
    expect(tidyDesign({ spacing: undefined, reverseOnMobile: false })).toBe(
      undefined
    );
    expect(tidyDesign({ align: 'center', width: undefined })).toEqual({
      align: 'center',
    });
  });
});

describe('section design — on the page', () => {
  const statistics = (design?: SectionInstance['design']) =>
    ({
      id: 'stats-1',
      type: 'statistics',
      enabled: true,
      visibility: { desktop: true, tablet: true, mobile: true },
      config: {
        items: [
          {
            id: 'i1',
            value: { en: '120', ar: '' },
            label: { en: 'Graduates', ar: '' },
          },
        ],
      },
      design,
    }) as SectionInstance;

  function renderIn(pack: typeof MANARA_PACK, instance: SectionInstance) {
    return render(
      <QueryClientProvider client={new QueryClient()}>
        <I18nextProvider i18n={createI18nInstance('en')}>
          <ThemePackContext.Provider value={pack}>
            <SectionRenderer instance={instance} academyId="a1" pages={[]} />
          </ThemePackContext.Provider>
        </I18nextProvider>
      </QueryClientProvider>
    );
  }

  it('the section’s own root carries the design — no wrapper', () => {
    const { container } = renderIn(
      MODERN_EDUCATION_PACK,
      statistics({ spacing: 'spacious', spacingMobile: 'compact' })
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe('SECTION');
    expect(root.getAttribute('data-ws-space')).toBe('spacious');
    expect(root.getAttribute('data-ws-space-mobile')).toBe('compact');
  });

  it('a section without a design renders exactly as before', () => {
    const { container } = renderIn(MODERN_EDUCATION_PACK, statistics());
    const root = container.firstElementChild as HTMLElement;
    expect(
      [...root.attributes].filter((a) => a.name.startsWith('data-ws-'))
    ).toEqual([]);
  });
});
