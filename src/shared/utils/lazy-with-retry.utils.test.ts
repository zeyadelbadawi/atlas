/**
 * Stale-tab recovery — loading a route chunk after a deploy removed it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  importWithRetry,
  isChunkLoadError,
  reloadOnceForNewVersion,
} from './lazy-with-retry.utils';

const reload = vi.fn();
const originalLocation = window.location;

beforeEach(() => {
  window.sessionStorage.clear();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, reload },
  });
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  });
  reload.mockReset();
});

const chunkError = () =>
  new TypeError(
    'Failed to fetch dynamically imported module: https://x/assets/Page-abc.js'
  );

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: /assets/A-1.js',
    'error loading dynamically imported module',
    'Importing a module script failed.',
    'Unable to preload CSS for /assets/B-2.css',
    "Expected a JavaScript module script but the server responded with a MIME type of 'text/html'",
  ])('recognises %j', (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true);
  });

  it('does not treat a bug as a chunk failure', () => {
    expect(
      isChunkLoadError(
        new TypeError("Cannot read properties of undefined (reading 'x')")
      )
    ).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe('importWithRetry', () => {
  it('a passing blip: retries and resolves without reloading', async () => {
    const factory = vi
      .fn()
      .mockRejectedValueOnce(chunkError())
      .mockResolvedValue({ default: 'Page' });
    await expect(importWithRetry(factory, [0, 0])).resolves.toEqual({
      default: 'Page',
    });
    expect(factory).toHaveBeenCalledTimes(2);
    expect(reload).not.toHaveBeenCalled();
  });

  it('a chunk that is gone: reloads ONCE into the new build and never settles', async () => {
    const factory = vi.fn().mockRejectedValue(chunkError());
    const outcome = await Promise.race([
      importWithRetry(factory, [0, 0]).then(
        () => 'settled',
        () => 'settled'
      ),
      new Promise((resolve) => setTimeout(() => resolve('pending'), 50)),
    ]);
    expect(outcome).toBe('pending');
    expect(factory).toHaveBeenCalledTimes(3);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('fails again right after that reload: no loop — the error reaches the boundary', async () => {
    reloadOnceForNewVersion();
    expect(reload).toHaveBeenCalledTimes(1);
    const factory = vi.fn().mockRejectedValue(chunkError());
    await expect(importWithRetry(factory, [0])).rejects.toThrow(
      /dynamically imported module/
    );
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('offline: does not reload into the browser’s offline page', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    const factory = vi.fn().mockRejectedValue(chunkError());
    await expect(importWithRetry(factory, [0])).rejects.toThrow();
    expect(reload).not.toHaveBeenCalled();
  });

  it('a real bug in the module is rethrown immediately, never retried', async () => {
    const factory = vi
      .fn()
      .mockRejectedValue(new SyntaxError('Unexpected token'));
    await expect(importWithRetry(factory, [0, 0])).rejects.toThrow(
      'Unexpected token'
    );
    expect(factory).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });
});
