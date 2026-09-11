/**
 * Regression tests for two defects that a visitor saw at the same time on
 * a real Academy site, and that are therefore tested together here.
 *
 * (1) THE PAGE DID NOT FILL THE VIEWPORT. The shell was `min-h-full`
 *     — `min-height: 100%` — which resolves to `auto` unless an ancestor
 *     has a definite height, and neither `#root`, `body` nor `html` does.
 *     On an Academy with little content the site collapsed to content
 *     height and the Atlas dashboard's own dark body showed underneath, on
 *     the customer's own domain.
 *
 * (2) TWO STACKED FOOTERS. The mandatory Atlas attribution was a separate
 *     bordered strip rendered as a SIBLING after `<WebsiteFooter>`, so the
 *     page ended with the Academy's footer followed by a second
 *     platform-looking one.
 *
 * WHY THESE ASSERT ON CLASS NAMES. jsdom does no layout — `getBoundingClientRect`
 * returns zeroes — so "is it as tall as the viewport" is not observable
 * here and a test pretending to measure it would prove nothing. What IS
 * exactly checkable, and is precisely what regressed, is the declared
 * height strategy: the shell must ask for viewport height, must do it with
 * a viewport unit rather than a percentage or a hardcoded pixel count, and
 * the main region must be the flex child that absorbs the slack. The real
 * rendered result is verified separately in a browser against production.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { WebsiteChrome } from './WebsiteChrome';
import type { WebsiteConfiguration, WebsitePage } from '@types';

afterEach(cleanup);

// The real Atlas instance with the real bundles, so the shell renders the
// copy a visitor actually sees rather than bare keys.
const i18n = createI18nInstance('en');

const CONFIGURATION: Pick<
  WebsiteConfiguration,
  'themeKey' | 'brand' | 'navigation' | 'header' | 'footer'
> = {
  themeKey: 'modern-education',
  brand: {
    primaryColor: '#1f6feb',
    secondaryColor: '#0b4fc4',
    accentColor: '#f59e0b',
  },
  navigation: [],
  header: {},
  // The emptiest footer an Academy can configure — see the un-hideable
  // attribution test below.
  footer: { groups: [], socialLinks: [] },
};

function renderChrome(children: React.ReactNode, pages: readonly WebsitePage[] = []) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <WebsiteChrome
          academyName="Elzozo Academy"
          configuration={CONFIGURATION}
          pages={pages}
          onNavigate={() => undefined}
        >
          {children}
        </WebsiteChrome>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

/** Every element between the shell root and `main`, inclusive of the root. */
function heightChain(container: HTMLElement): readonly HTMLElement[] {
  const main = container.querySelector('main');
  if (!main) throw new Error('WebsiteChrome rendered no <main> region');
  const chain: HTMLElement[] = [];
  for (
    let node: HTMLElement | null = main.parentElement;
    node && node !== container;
    node = node.parentElement
  ) {
    chain.unshift(node);
  }
  return chain;
}

describe('WebsiteChrome — full-viewport shell', () => {
  it('declares viewport height, not a percentage of an unsized ancestor', () => {
    const { container } = renderChrome(<p>Sparse academy.</p>);
    const chain = heightChain(container);

    expect(chain.length).toBeGreaterThan(0);
    // Every wrapper between the root and `main` carries the viewport
    // minimum: one link missing it collapses the whole chain.
    for (const node of chain) {
      expect(node.className).toContain('min-h-[100dvh]');
    }
    // `min-h-full` is the exact class that caused the bug.
    for (const node of chain) {
      expect(node.className).not.toContain('min-h-full');
    }
  });

  it('uses a minimum height, never a fixed one, so long pages still grow', () => {
    const { container } = renderChrome(<p>Sparse academy.</p>);
    for (const node of heightChain(container)) {
      expect(node.className).not.toMatch(/(?:^|\s)h-\[100dvh\]/);
      expect(node.className).not.toMatch(/(?:^|\s)h-screen/);
    }
  });

  it('hardcodes no pixel height anywhere in the shell', () => {
    const { container } = renderChrome(<p>Sparse academy.</p>);
    const withPixelHeight = Array.from(
      container.querySelectorAll<HTMLElement>('[class]'),
    ).filter((node) => /(?:min-|max-)?h-\[\d+px\]/.test(node.className));

    expect(withPixelHeight.map((node) => node.className)).toEqual([]);
  });

  it('lets the main region absorb the leftover viewport height', () => {
    const { container } = renderChrome(<p>Sparse academy.</p>);
    const main = container.querySelector('main');

    expect(main?.className).toContain('flex-1');
    // `flex-1` only does anything inside a flex column.
    const parent = main?.parentElement;
    expect(parent?.className).toContain('flex');
    expect(parent?.className).toContain('flex-col');
  });

  it('keeps the same height strategy when the page is full of content', () => {
    const many = Array.from({ length: 60 }, (_, index) => (
      <p key={index}>Course module {index}</p>
    ));
    const { container } = renderChrome(<>{many}</>);

    for (const node of heightChain(container)) {
      expect(node.className).toContain('min-h-[100dvh]');
    }
    expect(container.querySelector('main')?.className).toContain('flex-1');
  });
});

describe('WebsiteChrome — one footer', () => {
  it('renders exactly one footer element', () => {
    const { container } = renderChrome(<p>Sparse academy.</p>);
    expect(container.querySelectorAll('footer')).toHaveLength(1);
  });

  it('renders exactly one footer even on a content-heavy page', () => {
    const many = Array.from({ length: 60 }, (_, index) => (
      <p key={index}>Course module {index}</p>
    ));
    const { container } = renderChrome(<>{many}</>);
    expect(container.querySelectorAll('footer')).toHaveLength(1);
  });

  it('puts the Atlas attribution inside that footer, not after it', () => {
    const { container } = renderChrome(<p>Sparse academy.</p>);
    const footer = container.querySelector('footer');
    const attribution = screen.getByTestId('atlas-platform-attribution');

    expect(footer).not.toBeNull();
    expect(footer?.contains(attribution)).toBe(true);
  });

  /*
   * THE UN-HIDEABLE REQUIREMENT (Phase 6) still holds after the move. The
   * attribution is emitted by component code and is not reachable from
   * `configuration.footer`, so there is no CMS field or prop that removes
   * it — including a footer configured with no columns and no links at all.
   */
  it('still shows the attribution when the Academy configures an empty footer', () => {
    renderChrome(<p>Sparse academy.</p>);
    expect(screen.getByTestId('atlas-platform-attribution')).toBeTruthy();
  });
});
