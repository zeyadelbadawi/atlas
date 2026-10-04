/**
 * Atelier's cinematic scenes (`AtelierScene`, `../atelier-cinematic.css`):
 * - a scene is marked only on the public runtime, and only where it has
 *   something to play (the page-opening hero with an image, three or more
 *   steps, a drawn statistics chapter, the closing CTA);
 * - previews render today's static markup, unwrapped;
 * - the scene keeps the chapter's content, headings and DOM order, and its
 *   extra layers are decorative (`aria-hidden`);
 * - the stylesheet keeps every pinned or scroll-driven rule behind its
 *   gate, scoped to the theme, animating only transform, opacity and
 *   clip-path.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss, { type AtRule, type Node, type Rule } from 'postcss';
import { act, cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import { PublicWebsiteLocaleProvider } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { PageHeadingProvider } from '@/features/website/renderer/PageHeadingContext';
import { WebsiteThemeScope } from '@/features/website/renderer/WebsiteThemeScope';
import { getWebsiteTheme } from '@/features/website/themes/website-theme.registry';
import type { WebsiteLinkRenderer } from '@/features/website/renderer/website-link-renderer.types';
import type { SectionConfigMap, WebsitePage } from '@types';
import {
  AtelierCta,
  AtelierHero,
  AtelierStatistics,
  AtelierSteps,
} from '../sections';

vi.mock('@/shared/hooks/usePublicWebsiteStatistics', () => ({
  usePublicWebsiteStatistics: () => ({
    data: { courses: 6, students: 1240, instructors: 3 },
    isLoading: false,
  }),
}));

const i18nEn = createI18nInstance('en');
const i18nAr = createI18nInstance('ar');
const lt = (en: string, ar = '') => ({ en, ar });

const linkRenderer: WebsiteLinkRenderer = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

const PAGES = [
  { id: 'p-home', coreType: 'home', slug: 'home', title: 'Home', sections: [] },
  {
    id: 'p-courses',
    coreType: 'courses',
    slug: 'courses',
    title: 'Courses',
    sections: [],
  },
] as unknown as WebsitePage[];

function wrap(
  children: ReactNode,
  {
    locale = 'en',
    heading = 'h1',
  }: { locale?: 'en' | 'ar'; heading?: 'h1' | 'h2' } = {}
) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={locale === 'en' ? i18nEn : i18nAr}>
        <MemoryRouter>
          <PublicWebsiteLocaleProvider locale={locale}>
            <WebsiteThemeScope theme={getWebsiteTheme('atelier')}>
              <PageHeadingProvider value={heading}>
                {children}
              </PageHeadingProvider>
            </WebsiteThemeScope>
          </PublicWebsiteLocaleProvider>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
});

/** Lets pending animation frames run. */
const frames = () => new Promise((resolve) => setTimeout(resolve, 50));

const scene = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLElement>(`[data-at-cinematic="${name}"]`);

/* ------------------------------------------------------------------ */
/* Opening                                                              */
/* ------------------------------------------------------------------ */

describe('Opening scene (hero)', () => {
  const config: SectionConfigMap['hero'] = {
    eyebrow: lt('A learning studio'),
    title: lt('Learn deliberately', 'تعلّم بتأنٍّ'),
    cta: { label: lt('Browse the courses'), pageId: 'p-courses' },
    image: 'theme-asset:atelier/home-hero',
  };

  it('wraps the page-opening hero on the public site, with a decorative runway after it', async () => {
    const { container } = wrap(
      <AtelierHero
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const opening = scene(container, 'opening');
    expect(opening).toBeTruthy();
    const [stage, runway] = Array.from(opening!.children);
    expect(stage.matches('section.ath-hero')).toBe(true);
    expect(runway.matches('.atc-runway[aria-hidden]')).toBe(true);
    expect(runway.textContent).toBe('');
    // Same heading and controls, in the same order.
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(
      screen
        .getByRole('link', { name: /Browse the courses/ })
        .closest('.ath-hero-copy')
    ).toBeTruthy();
    // The arch's own file first; the full-window file (only where the
    // arch opens to the window) once that has loaded.
    const sizes = () =>
      container.querySelector('picture source')?.getAttribute('sizes') ?? '';
    expect(sizes()).toBe(
      '(min-width: 1024px) 30vw, (min-width: 640px) 28rem, 100vw'
    );
    await act(async () => {
      container.querySelector('img')?.dispatchEvent(new Event('load'));
      await frames();
    });
    expect(sizes()).toMatch(
      /^\(min-width: 64em\) and \(min-height: 45em\) and \(min-aspect-ratio: 1\/1\) and \(prefers-reduced-motion: no-preference\) 100vw, /
    );
    expect(container.querySelector('img')?.getAttribute('loading')).toBe(
      'eager'
    );
  });

  it('stays static in previews, for a hero that does not open the page, and without an image', () => {
    const preview = wrap(
      <AtelierHero config={config} academyId="a1" pages={PAGES} />
    );
    expect(scene(preview.container, 'opening')).toBeNull();
    expect(
      preview.container.querySelector('picture source')?.getAttribute('sizes')
    ).toBe('(min-width: 1024px) 30vw, (min-width: 640px) 28rem, 100vw');
    cleanup();

    const second = wrap(
      <AtelierHero
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />,
      { heading: 'h2' }
    );
    expect(scene(second.container, 'opening')).toBeNull();
    cleanup();

    const textOnly = wrap(
      <AtelierHero
        config={{ ...config, image: undefined }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(scene(textOnly.container, 'opening')).toBeNull();
    expect(textOnly.container.querySelector('.atc-runway')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Method                                                               */
/* ------------------------------------------------------------------ */

describe('Method scene (steps)', () => {
  const steps = (count: number): SectionConfigMap['steps'] => ({
    title: lt('The method', 'المنهج'),
    items: Array.from({ length: count }, (_, index) => ({
      id: `s${index}`,
      title: lt(`Step ${index + 1}`, `الخطوة ${index + 1}`),
      description: lt('Do the work.', 'أنجز العمل.'),
    })),
  });

  it('carries the step count and each step index, with the track and its thread decorative', () => {
    const { container } = wrap(
      <AtelierSteps
        config={steps(4)}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const method = scene(container, 'method');
    expect(method?.style.getPropertyValue('--at-steps')).toBe('4');
    expect(
      method?.querySelector(':scope > .atc-runway[aria-hidden]')
    ).toBeTruthy();
    const items = container.querySelectorAll<HTMLElement>(
      '.atc-track > ol.ath-syllabus > li'
    );
    expect(items).toHaveLength(4);
    expect(
      Array.from(items).map((item) => item.style.getPropertyValue('--at-i'))
    ).toEqual(['0', '1', '2', '3']);
    for (const layer of container.querySelectorAll(
      '.atc-track-guide, .atc-track-line'
    )) {
      expect(layer.getAttribute('aria-hidden')).toBe('true');
    }
    // One list, one heading per step, in order.
    expect(container.querySelectorAll('ol')).toHaveLength(1);
    expect(
      screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    ).toEqual(['Step 1', 'Step 2', 'Step 3', 'Step 4']);
  });

  it('plays in Arabic too (the direction is resolved in CSS)', () => {
    const { container } = wrap(
      <div dir="rtl">
        <AtelierSteps
          config={steps(3)}
          academyId="a1"
          pages={PAGES}
          linkRenderer={linkRenderer}
        />
      </div>,
      { locale: 'ar' }
    );
    expect(scene(container, 'method')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'الخطوة 1' })).toBeTruthy();
  });

  it('needs three steps, and never plays in previews', () => {
    const short = wrap(
      <AtelierSteps
        config={steps(2)}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(scene(short.container, 'method')).toBeNull();
    expect(short.container.querySelector('.atc-track')).toBeNull();
    cleanup();
    const preview = wrap(
      <AtelierSteps config={steps(5)} academyId="a1" pages={PAGES} />
    );
    expect(scene(preview.container, 'method')).toBeNull();
    expect(
      preview.container.querySelector('li')?.style.getPropertyValue('--at-i')
    ).toBe('');
  });
});

/* ------------------------------------------------------------------ */
/* Ink and closing                                                      */
/* ------------------------------------------------------------------ */

describe('Ink scene (statistics)', () => {
  const config: SectionConfigMap['statistics'] = {
    title: lt('In figures'),
    items: [
      { id: 'a', metric: 'courses', value: lt(''), label: lt('Courses') },
      { id: 'b', metric: 'students', value: lt(''), label: lt('Learners') },
    ],
  };

  it('draws its ink window behind the chapter and orders the real figures', () => {
    const { container } = wrap(
      <AtelierStatistics
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const ink = scene(container, 'ink');
    expect(ink?.style.getPropertyValue('--at-stats')).toBe('2');
    const chapter = screen.getByRole('region', { name: 'In figures' });
    expect(chapter.parentElement).toBe(ink);
    const window = chapter.firstElementChild;
    expect(window?.matches('.atc-ink-window[aria-hidden]')).toBe(true);
    const stats = container.querySelectorAll<HTMLElement>('.ath-stat');
    expect(
      Array.from(stats).map((stat) => stat.style.getPropertyValue('--at-i'))
    ).toEqual(['0', '1']);
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('1,240')).toBeTruthy();
  });

  it('stays static in previews', () => {
    const { container } = wrap(
      <AtelierStatistics config={config} academyId="a1" pages={PAGES} />
    );
    expect(scene(container, 'ink')).toBeNull();
    expect(container.querySelector('.atc-ink-window')).toBeNull();
  });
});

describe('Closing scene (CTA)', () => {
  const config: SectionConfigMap['cta'] = {
    title: lt('Begin your first chapter'),
    cta: { label: lt('Create an account'), authAction: 'signUp' },
    image: 'theme-asset:atelier/home-cta',
  };

  it('is marked on the public site without a runway (it is not pinned)', () => {
    const { container } = wrap(
      <AtelierCta
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const closing = scene(container, 'closing');
    expect(closing).toBeTruthy();
    expect(closing?.querySelector('.atc-runway')).toBeNull();
    expect(closing?.querySelector('.ath-cta-plate')).toBeTruthy();
    cleanup();
    const preview = wrap(
      <AtelierCta config={config} academyId="a1" pages={PAGES} />
    );
    expect(scene(preview.container, 'closing')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Safety layers: the content budget and the fit check                  */
/* ------------------------------------------------------------------ */

/** Exactly `length` characters of wide-glyph running words. */
const wide = (length: number) =>
  'Wholehearted Workmanship Masterworks Methodical Mentorship '
    .repeat(Math.ceil(length / 58))
    .slice(0, length)
    .trim()
    .padEnd(length, 'W');

describe('Content budget', () => {
  it('renders an over-budget hero static and complete, never truncated', () => {
    const description = wide(2000);
    const { container } = wrap(
      <AtelierHero
        config={{
          eyebrow: lt(wide(60)),
          title: lt(wide(70)),
          subtitle: lt(wide(140)),
          description: lt(description),
          cta: { label: lt(wide(40)), pageId: 'p-courses' },
          image: 'theme-asset:atelier/home-hero',
        }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(scene(container, 'opening')).toBeNull();
    expect(container.querySelector('.atc-runway')).toBeNull();
    expect(container.querySelector('h1')?.textContent).toBe(wide(70));
    expect(container.querySelector('.at-lead')?.textContent).toBe(description);
    // A static spread asks for the arch's width only.
    expect(
      container.querySelector('picture source')?.getAttribute('sizes')
    ).toBe('(min-width: 1024px) 30vw, (min-width: 640px) 28rem, 100vw');
  });

  it('keeps the method scene for typical copy, with or without a plate, and lets long syllabi go static', () => {
    const steps = (
      count: number,
      text: string,
      image?: string
    ): SectionConfigMap['steps'] => ({
      title: lt('The method'),
      description: lt('Three movements, from the first page to the last.'),
      image,
      imageAlt: lt('Sketches laid out in sequence'),
      items: Array.from({ length: count }, (_, index) => ({
        id: `s${index}`,
        title: lt(`Step ${index + 1}`),
        description: lt(text),
      })),
    });
    const render = (config: SectionConfigMap['steps']) =>
      wrap(
        <AtelierSteps
          config={config}
          academyId="a1"
          pages={PAGES}
          linkRenderer={linkRenderer}
        />
      ).container;

    const withPlate = render(
      steps(
        4,
        'Open a course and see what it covers.',
        'theme-asset:atelier/home-method'
      )
    );
    const method = scene(withPlate, 'method');
    expect(method).toBeTruthy();
    const plate = method!.querySelector(
      '.ath-method-head .ath-method-plate img'
    );
    expect(plate?.getAttribute('alt')).toBe('Sketches laid out in sequence');
    expect(method!.querySelector('.ath-method-head h2')?.textContent).toBe(
      'The method'
    );
    cleanup();

    const plain = render(steps(6, 'Open a course and see what it covers.'));
    expect(scene(plain, 'method')).toBeTruthy();
    expect(plain.querySelector('.ath-method-plate')).toBeNull();
    cleanup();

    const long = render({
      ...steps(6, wide(240), 'theme-asset:atelier/home-method'),
      title: lt(wide(80)),
      description: lt(wide(240)),
    });
    expect(scene(long, 'method')).toBeNull();
    expect(long.querySelectorAll('.ath-syllabus-step')).toHaveLength(6);
    // The plate still renders in the static chapter.
    expect(long.querySelector('.ath-method-plate img')).toBeTruthy();
  });

  it('lets a chapter of many figures go static, in even rows', () => {
    const { container } = wrap(
      <AtelierStatistics
        config={{
          title: lt(wide(80)),
          items: Array.from({ length: 12 }, (_, index) => ({
            id: `k${index}`,
            value: lt(`${index + 1}0%`),
            label: lt(wide(40)),
          })),
        }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(scene(container, 'ink')).toBeNull();
    const list = container.querySelector<HTMLElement>('dl.ath-stats');
    expect(list?.getAttribute('data-rows')).toBe('3');
    expect(list?.style.getPropertyValue('--at-stat-cols')).toBe('4');
    expect(container.querySelectorAll('.ath-stat')).toHaveLength(12);
  });
});

describe('Fit check', () => {
  type Callback = () => void;
  const observers: { callback: Callback; disconnected: boolean }[] = [];
  let stageHeight = 0;

  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private readonly entry: { callback: Callback; disconnected: boolean };
        constructor(callback: Callback) {
          this.entry = { callback, disconnected: false };
          observers.push(this.entry);
        }
        observe(): void {}
        disconnect(): void {
          this.entry.disconnected = true;
        }
      }
    );
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(
      () => stageHeight
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const config: SectionConfigMap['hero'] = {
    title: lt('Learn deliberately'),
    cta: { label: lt('Browse the courses'), pageId: 'p-courses' },
    image: 'theme-asset:atelier/home-hero',
  };

  it('lets go of the pin while the stage is taller than its window, and only then', async () => {
    const { container, unmount } = wrap(
      <AtelierHero
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const opening = scene(container, 'opening')!;
    const stage = opening.firstElementChild as HTMLElement;
    expect(observers).toHaveLength(1);
    // Inside the CSS gate the stage is one window tall (its min-height).
    stage.style.minHeight = '644px';

    // Released in place first, then static on a later frame.
    stageHeight = 900;
    act(() => observers[0].callback());
    expect(opening.getAttribute('data-at-fit')).toBe('release');
    await act(frames);
    expect(opening.getAttribute('data-at-fit')).toBe('overflow');
    // Still too tall: it stays let go.
    act(() => observers[0].callback());
    expect(opening.getAttribute('data-at-fit')).toBe('overflow');

    stageHeight = 644;
    act(() => observers[0].callback());
    expect(opening.hasAttribute('data-at-fit')).toBe(false);

    // Outside the gate there is nothing to measure: no change.
    stage.style.minHeight = '';
    stageHeight = 2000;
    act(() => observers[0].callback());
    expect(opening.hasAttribute('data-at-fit')).toBe(false);

    unmount();
    expect(observers[0].disconnected).toBe(true);
  });

  it('re-arms a scene that let go when the window is resized', async () => {
    const { container } = wrap(
      <AtelierHero
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const opening = scene(container, 'opening')!;
    const stage = opening.firstElementChild as HTMLElement;
    stage.style.minHeight = '644px';
    stageHeight = 900;
    act(() => observers[0].callback());
    await act(frames);
    expect(opening.getAttribute('data-at-fit')).toBe('overflow');
    // A static stage (no min-height) cannot be measured: the scene is
    // re-armed so the pinned layout is measured again.
    stage.style.minHeight = '';
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(opening.hasAttribute('data-at-fit')).toBe(false);
  });

  it('watches nothing in previews', () => {
    wrap(<AtelierHero config={config} academyId="a1" pages={PAGES} />);
    expect(observers).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* The stylesheet's gates                                               */
/* ------------------------------------------------------------------ */

const css = postcss.parse(
  readFileSync(resolve(__dirname, '../atelier-cinematic.css'), 'utf-8')
);

/** The at-rule conditions wrapping a node, outermost first. */
function conditions(node: Node): string[] {
  const out: string[] = [];
  for (let parent = node.parent; parent && parent.type !== 'root';) {
    if (parent.type === 'atrule') {
      const at = parent as AtRule;
      out.unshift(`@${at.name} ${at.params}`);
    }
    parent = parent.parent;
  }
  return out;
}

const SCROLL_DRIVEN =
  /^(animation(-timeline|-range)?|view-timeline(-name|-inset)?|timeline-scope)$/;

describe('atelier-cinematic.css', () => {
  it('keeps every scroll-driven declaration behind support and the motion preference', () => {
    let checked = 0;
    css.walkDecls((decl) => {
      if (!SCROLL_DRIVEN.test(decl.prop) || decl.value === 'none') return;
      const gates = conditions(decl);
      if (gates.some((gate) => gate.startsWith('@keyframes'))) return;
      checked += 1;
      expect(gates.join(' '), `${decl.prop}: ${decl.value}`).toContain(
        '@supports (animation-timeline: view())'
      );
      expect(gates.join(' ')).toContain(
        'prefers-reduced-motion: no-preference'
      );
    });
    expect(checked).toBeGreaterThan(20);
  });

  it('pins, adds scroll height and overlaps chapters only inside the large-screen gate', () => {
    const pinning: string[] = [];
    css.walkDecls((decl) => {
      const pins = decl.prop === 'position' && decl.value === 'sticky';
      const runway =
        decl.prop === 'display' &&
        decl.value === 'block' &&
        (decl.parent as Rule).selector?.includes('.atc-runway');
      const overlap =
        decl.prop === 'margin-block-start' && decl.value.includes('100svh');
      if (!pins && !runway && !overlap) return;
      pinning.push(decl.prop);
      const gates = conditions(decl).join(' ');
      expect(gates).toContain('@supports (animation-timeline: view())');
      // In em, so a larger default font size asks for a larger window.
      expect(gates).toMatch(
        /prefers-reduced-motion: no-preference\) and \(min-width: 64em\) and \(min-height: \d+em\)/
      );
      // And only while the stage fits its window (the fit check).
      const rule = decl.parent as Rule;
      expect(
        rule.selector.replace(/\s+/g, ''),
        `${rule.selector} { ${decl.prop} }`
      ).toContain(':not([data-at-fit])');
    });
    expect(pinning.length).toBeGreaterThanOrEqual(4);
  });

  it('plays every pinned scene-driven animation only while the stage fits', () => {
    let checked = 0;
    css.walkDecls((decl) => {
      if (decl.prop !== 'animation-timeline') return;
      const rule = decl.parent as Rule;
      if (!/opening|method|ink/.test(rule.selector)) return;
      if (rule.selector.includes("'closing'")) return;
      checked += 1;
      expect(rule.selector.replace(/\s+/g, '')).toContain(
        ':not([data-at-fit])'
      );
    });
    expect(checked).toBeGreaterThan(8);
  });

  it('scopes every selector to the Atelier theme', () => {
    css.walkRules((rule) => {
      if ((rule.parent as AtRule | undefined)?.name === 'keyframes') return;
      for (const selector of rule.selectors) {
        expect(selector).toContain("[data-theme-pack='atelier']");
      }
    });
  });

  it('animates only transform, opacity and clip-path', () => {
    css.walkAtRules('keyframes', (keyframes) => {
      keyframes.walkDecls((decl) => {
        expect(['transform', 'opacity', 'clip-path']).toContain(decl.prop);
      });
    });
  });
});
