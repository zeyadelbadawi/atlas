/**
 * B1 (DL-50) — `StaticMarketingRedirect` and its loop guard.
 *
 * A marketing page reached inside the app reloads the document ONCE so the
 * edge can serve the static page. If the reload comes back to the app (the
 * static site is off), it must not reload again for the same path within
 * the window: the fallback shows instead. No storage → no reload (never a
 * loop). The old `/#contact` anchor opens the contact form.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { StaticMarketingRedirect } from './StaticMarketingRedirect';
import {
  STATIC_MARKETING_RELOAD_KEY,
  STATIC_MARKETING_RELOAD_WINDOW_MS,
  claimStaticMarketingReload,
  resetStaticMarketingReloadForTests,
  type ReloadGuardStorage,
} from './static-marketing-reload';

function memoryStorage(): ReloadGuardStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

beforeEach(() => {
  window.sessionStorage.clear();
  resetStaticMarketingReloadForTests();
});
afterEach(() => cleanup());

describe('claimStaticMarketingReload (loop guard)', () => {
  it('allows the first reload for a path and records it', () => {
    const storage = memoryStorage();
    expect(claimStaticMarketingReload(storage, '/pricing', 1_000)).toBe(true);
    expect(JSON.parse(storage.data.get(STATIC_MARKETING_RELOAD_KEY)!)).toEqual({
      path: '/pricing',
      at: 1_000,
    });
  });

  it('refuses a second reload for the same path within the window (after the reload)', () => {
    const storage = memoryStorage();
    expect(claimStaticMarketingReload(storage, '/pricing', 1_000)).toBe(true);
    resetStaticMarketingReloadForTests(); // the document reloaded
    expect(claimStaticMarketingReload(storage, '/pricing', 1_000 + 3_000)).toBe(false);
    expect(claimStaticMarketingReload(storage, '/pricing/', 1_000 + 3_000)).toBe(false);
  });

  it('allows it again after the window, or for another path', () => {
    const storage = memoryStorage();
    claimStaticMarketingReload(storage, '/pricing', 1_000);
    resetStaticMarketingReloadForTests();
    expect(
      claimStaticMarketingReload(storage, '/pricing', 1_000 + STATIC_MARKETING_RELOAD_WINDOW_MS)
    ).toBe(true);
    resetStaticMarketingReloadForTests();
    expect(claimStaticMarketingReload(storage, '/ar', 1_000 + STATIC_MARKETING_RELOAD_WINDOW_MS)).toBe(
      true
    );
  });

  it('answers the same within one document (React may mount twice)', () => {
    const storage = memoryStorage();
    expect(claimStaticMarketingReload(storage, '/', 1_000)).toBe(true);
    expect(claimStaticMarketingReload(storage, '/', 1_001)).toBe(true);
  });

  it('never reloads without working storage', () => {
    expect(claimStaticMarketingReload(null, '/', 1_000)).toBe(false);
    const throwing: ReloadGuardStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => undefined,
    };
    expect(claimStaticMarketingReload(throwing, '/', 1_000)).toBe(false);
  });

  it('ignores a corrupt or future record', () => {
    const storage = memoryStorage();
    storage.setItem(STATIC_MARKETING_RELOAD_KEY, '{not json');
    expect(claimStaticMarketingReload(storage, '/', 1_000)).toBe(true);
    resetStaticMarketingReloadForTests();
    storage.setItem(STATIC_MARKETING_RELOAD_KEY, JSON.stringify({ path: '/', at: 99_999 }));
    expect(claimStaticMarketingReload(storage, '/', 1_000)).toBe(true);
  });
});

function Where(): JSX.Element {
  const location = useLocation();
  return <output data-testid="where">{location.pathname}</output>;
}

function renderAt(path: string, reload: () => void) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<StaticMarketingRedirect reload={reload} />} />
        <Route path="/pricing" element={<StaticMarketingRedirect reload={reload} />} />
        <Route path="/ar/pricing" element={<StaticMarketingRedirect reload={reload} />} />
        <Route path="/contact" element={<p>contact page</p>} />
      </Routes>
      <Where />
    </MemoryRouter>
  );
}

describe('StaticMarketingRedirect', () => {
  it('reloads the document once for the static page', () => {
    const reload = vi.fn();
    renderAt('/pricing', reload);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('static-marketing-fallback')).toBeNull();
    expect(window.sessionStorage.getItem(STATIC_MARKETING_RELOAD_KEY)).toContain('/pricing');
  });

  it('shows the fallback instead of reloading again when the reload came back to the app', () => {
    const reload = vi.fn();
    renderAt('/pricing', reload);
    cleanup();
    resetStaticMarketingReloadForTests(); // the document reloaded and the app answered again
    const second = vi.fn();
    renderAt('/pricing', second);
    expect(second).not.toHaveBeenCalled();
    const fallback = screen.getByTestId('static-marketing-fallback');
    expect(fallback.getAttribute('lang')).toBe('en');
    expect(fallback.querySelector('a[href="/pricing"]')).not.toBeNull();
    expect(fallback.querySelector('a[href="/auth/sign-in"]')).not.toBeNull();
    expect(fallback.querySelector('a[href="/privacy-policy"]')).not.toBeNull();
  });

  it('shows the Arabic fallback under /ar', () => {
    window.sessionStorage.setItem(
      STATIC_MARKETING_RELOAD_KEY,
      JSON.stringify({ path: '/ar/pricing', at: Date.now() })
    );
    const reload = vi.fn();
    renderAt('/ar/pricing', reload);
    expect(reload).not.toHaveBeenCalled();
    const fallback = screen.getByTestId('static-marketing-fallback');
    expect(fallback.getAttribute('lang')).toBe('ar');
    expect(fallback.getAttribute('dir')).toBe('rtl');
  });

  it('opens the contact form for the old /#contact anchor, without reloading', () => {
    const reload = vi.fn();
    renderAt('/#contact', reload);
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByTestId('where').textContent).toBe('/contact');
  });
});
