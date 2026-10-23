/**
 * CMS phase 3d — every theme (and the base renderers the retired themes
 * use) draws the "Talk to us" bar, the click-to-play video, pricing and the
 * countdown in its own shell: buttons go where they should, YouTube loads
 * only after play, ✓ / ✗ are said in words, the countdown is a quiet timer
 * with a full-sentence name that turns into the "after it ends" message,
 * and a section that has nothing to show yet stays off the public site.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
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
import type { PublicWebsiteLocale, SectionType, WebsiteThemeKey } from '@types';

const lt = (en: string, ar = '') => ({ en, ar });
const linkRenderer: WebsiteLinkRenderer = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

const THEMES: readonly (readonly [
  string,
  WebsiteThemeKey,
  Partial<SectionRenderers>,
])[] = [
  ['modern-education', 'modern-education', MODERN_EDUCATION_PACK.renderers],
  ['atelier', 'atelier', ATELIER_PACK.renderers],
  ['manara', 'manara', MANARA_PACK.renderers],
  ['riwaq', 'riwaq', RIWAQ_PACK.renderers],
  ['base (retired themes)', 'premium-academy', BASE_RENDERERS],
];

const CONFIGS = {
  whatsappBar: {
    title: lt('Talk to us', 'تحدث إلينا'),
    description: lt('Ask about courses.'),
    cta: { label: lt('Chat on WhatsApp'), whatsapp: '+201001234567' },
    secondaryCta: { label: lt('Call the hotline'), phone: '19999' },
    tertiaryCta: { label: lt('Visit the FAQ'), url: 'https://example.com/faq' },
  },
  video: {
    title: lt('A minute in class'),
    description: lt('See how we teach.'),
    videoId: 'dQw4w9WgXcQ',
    caption: lt('Filmed in Cairo'),
  },
  pricing: {
    title: lt('Plans'),
    plans: [
      {
        id: 'm',
        name: lt('Monthly'),
        price: lt('450 EGP'),
        period: lt('per month'),
        features: [
          { id: 'f1', text: lt('Live class'), included: true },
          { id: 'f2', text: lt('Printed notes'), included: false },
        ],
        cta: { label: lt('Choose monthly'), authAction: 'signUp' },
      },
      {
        id: 't',
        name: lt('Term'),
        price: lt('1,200 EGP'),
        features: [],
        highlighted: true,
        cta: { label: lt('Choose the term'), whatsapp: '+201001234567' },
      },
    ],
  },
  countdown: {
    title: lt('Registration closes soon'),
    deadline: '2030-01-10T12:00:00+02:00',
    timeZone: 'Africa/Cairo',
    endedMessage: lt('Registration has closed.'),
    cta: { label: lt('Book a seat'), authAction: 'signUp' },
  },
} as const;

function renderSection(
  themeKey: WebsiteThemeKey,
  renderers: Partial<SectionRenderers>,
  type: SectionType,
  config: unknown,
  { isPublic = true, locale = 'en' as PublicWebsiteLocale } = {}
) {
  const Renderer = (renderers[type] ?? BASE_RENDERERS[type]) as ComponentType<
    SectionRenderProps<SectionType>
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
                <Renderer
                  config={config as never}
                  academyId="a1"
                  pages={[]}
                  linkRenderer={isPublic ? linkRenderer : undefined}
                />
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

describe('every theme has its own renderer for the phase 3d sections', () => {
  it.each(['whatsappBar', 'video', 'pricing', 'countdown'] as const)(
    '%s',
    (type) => {
      for (const [, , renderers] of THEMES.slice(0, 4)) {
        expect(renderers[type]).toBeTypeOf('function');
        expect(renderers[type]).not.toBe(BASE_RENDERERS[type]);
      }
    }
  );
});

describe.each(THEMES)('%s', (_name, themeKey, renderers) => {
  beforeEach(() => {
    vi.useFakeTimers({
      shouldAdvanceTime: false,
      toFake: ['Date', 'setTimeout', 'clearTimeout'],
    });
    vi.setSystemTime(new Date('2030-01-08T09:30:15+02:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('the bar sends each button where it goes', () => {
    renderSection(themeKey, renderers, 'whatsappBar', CONFIGS.whatsappBar);
    expect(screen.getByRole('heading', { name: 'Talk to us' })).toBeTruthy();
    expect(link('Chat on WhatsApp').getAttribute('href')).toBe(
      'https://wa.me/201001234567'
    );
    expect(link('Call the hotline').getAttribute('href')).toBe('tel:19999');
    expect(link('Visit the FAQ').getAttribute('href')).toBe(
      'https://example.com/faq'
    );
  });

  it('the bar stays off the public site until a button goes somewhere, and a preview says why', () => {
    const unfinished = {
      ...CONFIGS.whatsappBar,
      cta: { label: lt('WhatsApp'), whatsapp: '' },
      secondaryCta: undefined,
      tertiaryCta: undefined,
    };
    const { container } = renderSection(
      themeKey,
      renderers,
      'whatsappBar',
      unfinished
    );
    expect(container.querySelector('section')).toBeNull();
    cleanup();
    renderSection(themeKey, renderers, 'whatsappBar', unfinished, {
      isPublic: false,
    });
    expect(screen.getByText(/Visitors don’t see this bar/)).toBeTruthy();
  });

  it('the video loads nothing from YouTube but its poster until play is pressed', () => {
    const { container } = renderSection(
      themeKey,
      renderers,
      'video',
      CONFIGS.video
    );
    const frame = container.querySelector('[data-video-frame]')!;
    expect(frame.querySelector('iframe')).toBeNull();
    expect(frame.querySelector('img')!.getAttribute('src')).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
    expect(frame.querySelector('img')!.getAttribute('loading')).toBe('lazy');
    const play = screen.getByRole('button', {
      name: 'Play video: A minute in class',
    });
    fireEvent.click(play);
    const player = frame.querySelector('iframe')!;
    expect(player.getAttribute('src')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&modestbranding=1'
    );
    expect(player.getAttribute('title')).toBe('Video: A minute in class');
    expect(document.activeElement).toBe(player);
    expect(screen.getByText('Filmed in Cairo')).toBeTruthy();
  });

  it('the video shows an uploaded poster instead of the thumbnail', () => {
    const { container } = renderSection(themeKey, renderers, 'video', {
      ...CONFIGS.video,
      poster: 'https://cdn.example/poster.webp',
    });
    expect(
      container.querySelector('[data-video-frame] img')!.getAttribute('src')
    ).toBe('https://cdn.example/poster.webp');
  });

  it('the video is a picture, not a player, in previews; without a video it stays off the public site', () => {
    renderSection(themeKey, renderers, 'video', CONFIGS.video, {
      isPublic: false,
    });
    expect(screen.queryByRole('button', { name: /Play video/ })).toBeNull();
    cleanup();
    const { container } = renderSection(themeKey, renderers, 'video', {
      ...CONFIGS.video,
      videoId: '',
    });
    expect(container.querySelector('section')).toBeNull();
    cleanup();
    renderSection(
      themeKey,
      renderers,
      'video',
      { ...CONFIGS.video, videoId: '' },
      { isPublic: false }
    );
    expect(screen.getByText(/Add a YouTube link/)).toBeTruthy();
  });

  it('pricing draws each plan, says ✓ and ✗ in words, and badges the most popular', () => {
    const { container } = renderSection(
      themeKey,
      renderers,
      'pricing',
      CONFIGS.pricing
    );
    expect(screen.getByRole('heading', { name: 'Monthly' })).toBeTruthy();
    expect(screen.getByText('450 EGP')).toBeTruthy();
    expect(screen.getByText('per month')).toBeTruthy();
    const features = screen.getByRole('list', {
      name: 'What’s included in Monthly',
    });
    expect(within(features).getByText(/Included:/)).toBeTruthy();
    expect(within(features).getByText(/Not included:/)).toBeTruthy();
    expect(container.querySelectorAll('[data-highlighted]')).toHaveLength(1);
    expect(screen.getByText('Most popular')).toBeTruthy();
    expect(link('Choose monthly').getAttribute('href')).toBe('/sign-up');
    expect(link('Choose the term').getAttribute('href')).toBe(
      'https://wa.me/201001234567'
    );
  });

  it('the countdown is a quiet timer named in a sentence, then the message after it ends', () => {
    const { container } = renderSection(
      themeKey,
      renderers,
      'countdown',
      CONFIGS.countdown
    );
    const timer = screen.getByRole('timer');
    expect(timer.getAttribute('aria-live')).toBe('off');
    expect(timer.getAttribute('aria-label')).toBe(
      'Time left: 2 days, 2 hours and 29 minutes.'
    );
    const seconds = () =>
      timer.querySelector('[data-unit="seconds"] span')!.textContent;
    expect(seconds()).toBe('45');
    act(() => {
      // The clock ticks just after each whole second.
      vi.advanceTimersByTime(1100);
    });
    expect(seconds()).toBe('44');
    expect(
      screen.getByText(/Closes Thursday 10 January 2030, 12:00 \(UTC\+2\)/)
    ).toBeTruthy();
    expect(
      container
        .querySelector('[data-countdown-status]')!
        .getAttribute('aria-live')
    ).toBe('polite');
    expect(link('Book a seat').getAttribute('href')).toBe('/sign-up');

    act(() => {
      vi.setSystemTime(new Date('2030-01-10T12:00:01+02:00'));
      vi.advanceTimersByTime(1100);
    });
    expect(screen.queryByRole('timer')).toBeNull();
    expect(screen.getByText('Registration has closed.')).toBeTruthy();
  });

  it('the countdown counts in Arabic digits on the Arabic site', () => {
    renderSection(themeKey, renderers, 'countdown', CONFIGS.countdown, {
      locale: 'ar',
    });
    const timer = screen.getByRole('timer');
    expect(timer.querySelector('[data-unit="hours"] span')!.textContent).toBe(
      '٠٢'
    );
    expect(timer.getAttribute('aria-label')).toMatch(/^الوقت المتبقي: يومان/);
  });

  it('the countdown stays off the public site without a deadline', () => {
    const { container } = renderSection(themeKey, renderers, 'countdown', {
      ...CONFIGS.countdown,
      deadline: '',
    });
    expect(container.querySelector('section')).toBeNull();
    cleanup();
    renderSection(
      themeKey,
      renderers,
      'countdown',
      { ...CONFIGS.countdown, deadline: '' },
      { isPublic: false }
    );
    expect(screen.getByText(/Choose the date and time it closes/)).toBeTruthy();
  });
});
