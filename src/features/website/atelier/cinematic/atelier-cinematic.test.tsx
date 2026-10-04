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
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss, { type AtRule, type Node, type Rule } from 'postcss';
import { cleanup, render, screen } from '@testing-library/react';
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

  it('wraps the page-opening hero on the public site, with a decorative runway after it', () => {
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
    // The arch asks for a full-width file only where it opens to the window.
    const sizes =
      container.querySelector('picture source')?.getAttribute('sizes') ?? '';
    expect(sizes).toMatch(
      /^\(min-width: 1024px\) and \(min-height: 720px\) and \(min-aspect-ratio: 1\/1\) and \(prefers-reduced-motion: no-preference\) 100vw, /
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
      expect(gates).toMatch(
        /prefers-reduced-motion: no-preference\) and \(min-width: 1024px\) and \(min-height: \d+px\)/
      );
    });
    expect(pinning.length).toBeGreaterThanOrEqual(4);
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
