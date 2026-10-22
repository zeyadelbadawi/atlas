/**
 * CMS phase 3 — every theme draws a section's three buttons (hero, About,
 * feature split, CTA band), sends each where it goes (WhatsApp, a call, the
 * sign-up page), and draws a look the Owner chose instead of the one for
 * the button's position. A button without a look draws as it always did.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType, ReactNode } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import { PublicWebsiteLocaleProvider } from './renderer/PublicWebsiteLocaleContext';
import { WebsiteIdentityProvider } from './renderer/WebsiteIdentityContext';
import { WebsiteThemeScope } from './renderer/WebsiteThemeScope';
import { getWebsiteTheme } from './themes/website-theme.registry';
import { MODERN_EDUCATION_PACK } from './modern-education/modern-education.pack';
import { ATELIER_PACK } from './atelier/atelier.pack';
import { MANARA_PACK } from './manara/manara.pack';
import { RIWAQ_PACK } from './riwaq/riwaq.pack';
import type { WebsiteLinkRenderer } from './renderer/website-link-renderer.types';
import type { SectionRenderProps } from './theme-packs/theme-pack.types';
import type { SectionType, WebsiteCta, WebsiteThemeKey } from '@types';

vi.mock('@/shared/hooks/usePublicWebsiteStatistics', () => ({
  usePublicWebsiteStatistics: () => ({
    data: { courses: 0, students: 0, instructors: 0 },
    isLoading: false,
  }),
}));

const lt = (en: string) => ({ en, ar: '' });
const linkRenderer: WebsiteLinkRenderer = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

/** Each theme's class for a text link and for a bold button. */
const THEMES = [
  ['modern-education', MODERN_EDUCATION_PACK, 't1-link', 't1-cta'],
  ['atelier', ATELIER_PACK, 'at-link', 'at-btn'],
  ['manara', MANARA_PACK, 'mn-link', 'mn-btn'],
  ['riwaq', RIWAQ_PACK, 'rw-link', 'rw-btn'],
] as const;

const BUTTONS: Record<'cta' | 'secondaryCta' | 'tertiaryCta', WebsiteCta> = {
  cta: { label: lt('Chat on WhatsApp'), whatsapp: '+201001234567' },
  secondaryCta: { label: lt('Call the hotline'), phone: '19999' },
  tertiaryCta: { label: lt('Create an account'), authAction: 'signUp' },
};

const CONFIGS = {
  hero: { title: lt('Learn with us'), ...BUTTONS },
  about: { title: lt('About us'), body: lt('We teach.'), ...BUTTONS },
  featureSplit: {
    title: lt('Why us'),
    imagePosition: 'start',
    items: [],
    ...BUTTONS,
  },
  cta: { title: lt('Join now'), ...BUTTONS },
} as const;

function renderSection(
  themeKey: WebsiteThemeKey,
  Renderer: ComponentType<SectionRenderProps<SectionType>>,
  config: unknown
) {
  const node: ReactNode = (
    <Renderer
      config={config as never}
      academyId="a1"
      pages={[]}
      linkRenderer={linkRenderer}
    />
  );
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={createI18nInstance('en')}>
        <MemoryRouter>
          <WebsiteIdentityProvider value={{ name: 'Horizon Academy' }}>
            <PublicWebsiteLocaleProvider locale="en">
              <WebsiteThemeScope
                theme={getWebsiteTheme(themeKey)}
                brand={{
                  primaryColor: '',
                  secondaryColor: '',
                  accentColor: '',
                }}
              >
                {node}
              </WebsiteThemeScope>
            </PublicWebsiteLocaleProvider>
          </WebsiteIdentityProvider>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

const link = (name: string) =>
  screen.getByRole('link', { name: new RegExp(name) });

afterEach(cleanup);

describe.each(THEMES)(
  '%s — section buttons',
  (themeKey, pack, linkClass, boldClass) => {
    it.each(Object.keys(CONFIGS) as (keyof typeof CONFIGS)[])(
      '%s draws all three buttons, each going where it should',
      (type) => {
        const Renderer = pack.renderers[type] as ComponentType<
          SectionRenderProps<SectionType>
        >;
        renderSection(themeKey, Renderer, CONFIGS[type]);
        expect(link('Chat on WhatsApp').getAttribute('href')).toBe(
          'https://wa.me/201001234567'
        );
        expect(link('Call the hotline').getAttribute('href')).toBe('tel:19999');
        expect(link('Create an account').getAttribute('href')).toBe('/sign-up');
      }
    );

    it('draws a look the Owner chose instead of the position’s', () => {
      const Renderer = pack.renderers.hero as ComponentType<
        SectionRenderProps<SectionType>
      >;
      renderSection(themeKey, Renderer, {
        ...CONFIGS.hero,
        cta: { ...BUTTONS.cta, style: 'link' },
        tertiaryCta: { ...BUTTONS.tertiaryCta, style: 'primary' },
      });
      expect(link('Chat on WhatsApp').classList.contains(linkClass)).toBe(true);
      expect(link('Create an account').classList.contains(boldClass)).toBe(
        true
      );
      expect(link('Create an account').classList.contains(linkClass)).toBe(
        false
      );
    });

    it('draws a button without a look as it always did', () => {
      const Renderer = pack.renderers.hero as ComponentType<
        SectionRenderProps<SectionType>
      >;
      renderSection(themeKey, Renderer, {
        title: lt('Learn'),
        cta: BUTTONS.cta,
      });
      expect(link('Chat on WhatsApp').classList.contains(boldClass)).toBe(true);
    });
  }
);
