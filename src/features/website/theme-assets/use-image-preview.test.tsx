/**
 * Production QA Issue 1 — `useImagePreview` follows the public renderer:
 * an unrecognised (legacy) site theme previews with the fallback pack,
 * and a pack that cannot load shows "unavailable", never an endless spinner.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type * as ThemePackLoader from '../theme-packs/theme-pack.loader';

const failing = new Set<string>();

vi.mock('../theme-packs/theme-pack.loader', async (importOriginal) => {
  const actual = await importOriginal<typeof ThemePackLoader>();
  const failed = new Map<string, unknown>();
  const listeners = new Set<() => void>();
  return {
    ...actual,
    subscribeToThemePacks: (listener: () => void) => {
      listeners.add(listener);
      const off = actual.subscribeToThemePacks(listener);
      return () => {
        listeners.delete(listener);
        off();
      };
    },
    getLoadedThemePack: (key: string | undefined) =>
      failing.has(actual.resolveThemePackKey(key))
        ? undefined
        : actual.getLoadedThemePack(key),
    themePackLoadError: (key: string | undefined) =>
      failed.get(actual.resolveThemePackKey(key)) ??
      actual.themePackLoadError(key),
    loadThemePack: (key: string | undefined) => {
      const resolved = actual.resolveThemePackKey(key);
      if (!failing.has(resolved)) return actual.loadThemePack(key);
      const error = new Error('chunk failed');
      failed.set(resolved, error);
      listeners.forEach((listener) => listener());
      return Promise.reject(error);
    },
  };
});

const { useImagePreview } = await import('./useImagePreview');

afterEach(() => {
  cleanup();
  failing.clear();
});

describe('useImagePreview', () => {
  it('previews with the fallback pack when the site theme is not one this build knows', async () => {
    const { result } = renderHook(() =>
      useImagePreview('theme-asset:modern-education/home-hero', 'legacy-theme')
    );
    await waitFor(() => expect(result.current.status).toBe('theme-asset'));
    expect(
      result.current.status === 'theme-asset' ? result.current.src : ''
    ).toMatch(/\/theme-assets\/modern-education\/v\d+\/home-hero/);
  });

  it('shows "unavailable", not a spinner, when the theme pack fails to load', async () => {
    failing.add('manara');
    const { result } = renderHook(() =>
      useImagePreview('theme-asset:manara/home-hero', 'manara')
    );
    await waitFor(() => expect(result.current.status).toBe('unavailable'));
  });
});
