/**
 * Theme packs load per theme (`theme-pack.loader.ts`): a public site
 * downloads only its theme's code and stylesheet, the stylesheet is linked
 * in front of the app's own (cascade order, Reports/LCP_ROOT_CAUSE.md §8),
 * and a theme renders only once both have arrived.
 *
 * The test setup registers every pack up front (`setup-theme-packs.ts`),
 * so each test here takes a FRESH module instance of the loader.
 */
import { Component, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { WEBSITE_THEME_KEYS, type WebsiteThemeKey } from '@types';

// The test runner serves CSS `?url` imports as empty strings; give the two
// theme stylesheets the distinct URLs a build gives them.
vi.mock('../modern-education/modern-education.css?url', () => ({
  default: '/assets/modern-education-test.css',
}));
vi.mock('../atelier/atelier.stylesheet.css?url', () => ({
  default: '/assets/atelier.stylesheet-test.css',
}));

async function freshModules() {
  vi.resetModules();
  const loader = await import('./theme-pack.loader');
  const registry = await import('./theme-pack.registry');
  const gate = await import('./ThemePackGate');
  const stylesheets = await import('./theme-stylesheets');
  const { mapBaseBrandPalette } = await import('./base-brand-mapping');
  return { loader, registry, gate, stylesheets, mapBaseBrandPalette };
}

const APP_STYLESHEET = '<link rel="stylesheet" href="/assets/index-app.css">';

function themeLinks(): HTMLLinkElement[] {
  return Array.from(
    document.head.querySelectorAll<HTMLLinkElement>(
      'link[data-theme-stylesheet]'
    )
  );
}

/** The browser finishing every theme stylesheet it was asked for. */
function finishStylesheets(): void {
  for (const link of themeLinks()) link.dispatchEvent(new Event('load'));
}

/** Stylesheet hrefs in document order. */
function headStylesheets(): string[] {
  return Array.from(
    document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
  ).map((link) => link.getAttribute('href') ?? '');
}

/** Lets pending module imports and promise callbacks run. */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0));
}

afterEach(() => {
  cleanup();
  document.head.innerHTML = '';
  vi.doUnmock('../atelier/atelier.pack');
});

describe('theme pack loader', () => {
  it('knows every theme, and an unknown/legacy key renders as Modern Education', async () => {
    const { loader } = await freshModules();
    for (const key of WEBSITE_THEME_KEYS) {
      expect(loader.isKnownThemeKey(key)).toBe(true);
      expect(loader.resolveThemePackKey(key)).toBe(key);
    }
    expect(loader.isKnownThemeKey('retro-2019')).toBe(false);
    expect(loader.resolveThemePackKey('retro-2019')).toBe('modern-education');
    expect(loader.resolveThemePackKey(undefined)).toBe('modern-education');
  });

  it('has the base-pack themes at once, and Theme 1 and Atelier only once loaded', async () => {
    const { loader, registry, mapBaseBrandPalette } = await freshModules();
    for (const key of [
      'premium-academy',
      'corporate-learning',
      'minimal-editorial',
      'bold-creative',
    ] as const) {
      const pack = loader.getLoadedThemePack(key);
      expect(pack?.key).toBe(key);
      expect(pack?.mapBrandPalette).toBe(mapBaseBrandPalette);
      // Stable, as `useSyncExternalStore` requires.
      expect(loader.getLoadedThemePack(key)).toBe(pack);
    }
    expect(loader.getLoadedThemePack('modern-education')).toBeUndefined();
    expect(loader.getLoadedThemePack('atelier')).toBeUndefined();
    expect(() => registry.getThemePack('atelier')).toThrow(/has not loaded/);
    // A base-pack theme has no stylesheet and loads nothing.
    await loader.loadThemePack('bold-creative');
    expect(themeLinks()).toHaveLength(0);
  });

  it('loads a theme’s code and stylesheet, and only then reports it loaded', async () => {
    document.head.innerHTML = APP_STYLESHEET;
    const { loader, stylesheets } = await freshModules();
    const listener = vi.fn();
    loader.subscribeToThemePacks(listener);

    const request = loader.loadThemePack('atelier');
    expect(loader.loadThemePack('atelier')).toBe(request);
    // The stylesheet is linked at once, in front of the app's own.
    expect(headStylesheets()).toEqual([
      ...(stylesheets.THEME_STYLESHEETS.atelier ?? []),
      '/assets/index-app.css',
    ]);
    expect(themeLinks()[0].getAttribute('data-theme-stylesheet')).toBe(
      'atelier'
    );

    // The code has arrived, the stylesheet has not: not ready yet.
    await import('../atelier/atelier.pack');
    await flush();
    expect(loader.getLoadedThemePack('atelier')).toBeUndefined();
    expect(listener).not.toHaveBeenCalled();

    finishStylesheets();
    const pack = await request;
    expect(pack.key).toBe('atelier');
    expect(loader.getLoadedThemePack('atelier')).toBe(pack);
    expect(listener).toHaveBeenCalled();
    // Loading it again adds nothing.
    await expect(loader.loadThemePack('atelier')).resolves.toBe(pack);
    expect(themeLinks()).toHaveLength(1);
    // Theme 1 was never requested.
    expect(loader.getLoadedThemePack('modern-education')).toBeUndefined();
    expect(headStylesheets().join(' ')).not.toMatch(/modern-education/);
  });

  it('an unknown key loads Modern Education', async () => {
    document.head.innerHTML = APP_STYLESHEET;
    const { loader } = await freshModules();
    const request = loader.loadThemePack('retro-2019');
    finishStylesheets();
    expect((await request).key).toBe('modern-education');
  });

  it('keeps the cascade order whatever the load order: themes, then the app stylesheet', async () => {
    document.head.innerHTML = APP_STYLESHEET;
    const { loader, stylesheets } = await freshModules();
    const atelier = loader.loadThemePack('atelier');
    const theme1 = loader.loadThemePack('modern-education');
    finishStylesheets();
    await Promise.all([atelier, theme1]);
    expect(headStylesheets()).toEqual([
      ...(stylesheets.THEME_STYLESHEETS['modern-education'] ?? []),
      ...(stylesheets.THEME_STYLESHEETS.atelier ?? []),
      '/assets/index-app.css',
    ]);
  });

  it('in development, links in front of the app’s injected <style> elements', async () => {
    document.head.innerHTML =
      '<style data-vite-dev-id="index.css">.a{}</style><style>.b{}</style>';
    const { loader } = await freshModules();
    const request = loader.loadThemePack('modern-education');
    finishStylesheets();
    await request;
    expect(document.head.firstElementChild?.tagName).toBe('LINK');
  });

  it('reuses the stylesheet link the server rendered, without waiting or duplicating it', async () => {
    const { stylesheets } = await freshModules();
    document.head.innerHTML =
      stylesheets.themeStylesheetLinksHtml(['atelier']) + APP_STYLESHEET;
    const { loader } = await freshModules();
    // No load event is dispatched: the server's link loaded before any
    // module script ran.
    const pack = await loader.loadThemePack('atelier');
    expect(pack.key).toBe('atelier');
    expect(themeLinks()).toHaveLength(1);
  });

  it('a stylesheet that fails to load does not keep the theme from rendering', async () => {
    document.head.innerHTML = APP_STYLESHEET;
    const { loader } = await freshModules();
    const request = loader.loadThemePack('atelier');
    for (const link of themeLinks()) link.dispatchEvent(new Event('error'));
    expect((await request).key).toBe('atelier');
  });

  it('records a pack that fails to load', async () => {
    vi.doMock('../atelier/atelier.pack', () => {
      throw new Error('chunk failed');
    });
    const { loader } = await freshModules();
    const listener = vi.fn();
    loader.subscribeToThemePacks(listener);
    await expect(loader.loadThemePack('atelier')).rejects.toThrow();
    expect(loader.themePackLoadError('atelier')).toBeDefined();
    expect(loader.getLoadedThemePack('atelier')).toBeUndefined();
    expect(listener).toHaveBeenCalled();
  });

  it('knows which system pages a theme draws before loading it, and that matches the pack', async () => {
    const { loader } = await freshModules();
    const all = loader.loadAllThemePacks();
    finishStylesheets();
    await all;
    for (const key of WEBSITE_THEME_KEYS) {
      const pages = loader.getLoadedThemePack(key)?.pages;
      expect(loader.themeDrawsSystemPage(key, 'NotFound'), key).toBe(
        !!pages?.NotFound
      );
      expect(loader.themeDrawsSystemPage(key, 'ComingSoon'), key).toBe(
        !!pages?.ComingSoon
      );
    }
  });
});

describe('theme stylesheet links for the server-rendered head', () => {
  it('lists only themes with a stylesheet, once each, in cascade order', async () => {
    const { stylesheets } = await freshModules();
    const keys: WebsiteThemeKey[] = [
      'atelier',
      'bold-creative',
      'modern-education',
      'atelier',
    ];
    const html = stylesheets.themeStylesheetLinksHtml(keys);
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual([
      ...(stylesheets.THEME_STYLESHEETS['modern-education'] ?? []),
      ...(stylesheets.THEME_STYLESHEETS.atelier ?? []),
    ]);
    expect(html).toMatch(
      /^<link rel="stylesheet" crossorigin href="[^"]+" data-theme-stylesheet="modern-education">/
    );
    expect(stylesheets.themeStylesheetLinksHtml(['premium-academy'])).toBe('');
  });
});

class Boundary extends Component<{ children: ReactNode }, { error: boolean }> {
  override state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  override render() {
    return this.state.error ? <p>boundary</p> : this.props.children;
  }
}

describe('ThemePackGate', () => {
  it('shows its fallback while the pack loads, then the theme', async () => {
    document.head.innerHTML = APP_STYLESHEET;
    const { gate, loader } = await freshModules();
    render(
      <gate.ThemePackGate themeKey="atelier" fallback={<p>loading</p>}>
        <p>themed</p>
      </gate.ThemePackGate>
    );
    expect(screen.getByText('loading')).toBeTruthy();
    await act(async () => {
      await flush();
      finishStylesheets();
      await loader.loadThemePack('atelier');
    });
    expect(screen.getByText('themed')).toBeTruthy();
    expect(screen.queryByText('loading')).toBeNull();
  });

  it('renders at once when the pack has loaded, and records the theme it used', async () => {
    const { gate, loader } = await freshModules();
    const all = loader.loadAllThemePacks();
    finishStylesheets();
    await all;
    const used = new Set<WebsiteThemeKey>();
    render(
      <gate.ThemePackUsageContext.Provider value={used}>
        <gate.ThemePackGate themeKey="retro-2019" fallback={<p>loading</p>}>
          <p>themed</p>
        </gate.ThemePackGate>
      </gate.ThemePackUsageContext.Provider>
    );
    expect(screen.getByText('themed')).toBeTruthy();
    expect([...used]).toEqual(['modern-education']);
  });

  it('throws a pack that failed to load to the error boundary', async () => {
    vi.doMock('../atelier/atelier.pack', () => {
      throw new Error('chunk failed');
    });
    const { gate } = await freshModules();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <Boundary>
        <gate.ThemePackGate themeKey="atelier" fallback={<p>loading</p>}>
          <p>themed</p>
        </gate.ThemePackGate>
      </Boundary>
    );
    await act(async () => {
      await flush();
    });
    expect(screen.getByText('boundary')).toBeTruthy();
  });
});
