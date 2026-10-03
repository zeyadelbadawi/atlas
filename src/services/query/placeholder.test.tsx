/**
 * Placeholder-data policy.
 *
 * The app used to keep the previous key's data on screen for EVERY query
 * (a global `placeholderData: previous => previous`), so opening course B
 * after course A rendered course A for a beat. `useApiQuery` now keeps
 * previous data only while the SAME resource re-pages or re-filters.
 * These tests drive the real hook against the real query client factory.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { createQueryClient } from './query-client';
import { courseKeys, mediaKeys, academyKeys } from './query-keys';
import { isSameResourceKey } from './placeholder';

afterEach(cleanup);

describe('isSameResourceKey', () => {
  it('treats query/filter objects and numeric windows as parameters', () => {
    expect(
      isSameResourceKey(
        courseKeys.list('a1', { pagination: { page: 1, pageSize: 20 } }),
        courseKeys.list('a1', { pagination: { page: 2, pageSize: 20 } })
      )
    ).toBe(true);
    expect(
      isSameResourceKey(courseKeys.list('a1'), courseKeys.list('a1', {}))
    ).toBe(true);
    expect(
      isSameResourceKey(
        ['reports', 'integrity', 'a1', 7],
        ['reports', 'integrity', 'a1', 30]
      )
    ).toBe(true);
  });

  it('treats any string change (entity, scope, slug) as a different resource', () => {
    expect(
      isSameResourceKey(
        courseKeys.detail('a1', 'c1'),
        courseKeys.detail('a1', 'c2')
      )
    ).toBe(false);
    expect(
      isSameResourceKey(courseKeys.list('a1', {}), courseKeys.list('a2', {}))
    ).toBe(false);
    expect(
      isSameResourceKey(
        academyKeys.stats('o1', 'a1'),
        academyKeys.stats('o2', 'a1')
      )
    ).toBe(false);
    expect(isSameResourceKey(['x', 'y'], ['x', 'y', 'z'])).toBe(false);
    expect(isSameResourceKey(undefined, ['x'])).toBe(false);
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function wrapperFor() {
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('useApiQuery placeholder behaviour', () => {
  it('does NOT render the previous entity when a detail id changes', async () => {
    const { wrapper } = wrapperFor();
    const pending = deferred<{ id: string }>();
    const { result, rerender } = renderHook(
      ({ courseId }: { courseId: string }) =>
        useApiQuery<{ id: string }>({
          queryKey: courseKeys.detail('a1', courseId),
          queryFn: () =>
            courseId === 'c1' ? Promise.resolve({ id: 'c1' }) : pending.promise,
        }),
      { wrapper, initialProps: { courseId: 'c1' } }
    );
    await waitFor(() => expect(result.current.data).toEqual({ id: 'c1' }));

    rerender({ courseId: 'c2' });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isPlaceholderData).toBe(false);
    expect(result.current.isLoading).toBe(true);

    pending.resolve({ id: 'c2' });
    await waitFor(() => expect(result.current.data).toEqual({ id: 'c2' }));
  });

  it('keeps the previous page visible while the same list pages', async () => {
    const { wrapper } = wrapperFor();
    const pending = deferred<string[]>();
    const { result, rerender } = renderHook(
      ({ page }: { page: number }) =>
        useApiQuery<string[]>({
          queryKey: mediaKeys.list('a1', { pagination: { page, pageSize: 2 } }),
          queryFn: () =>
            page === 1 ? Promise.resolve(['a', 'b']) : pending.promise,
        }),
      { wrapper, initialProps: { page: 1 } }
    );
    await waitFor(() => expect(result.current.data).toEqual(['a', 'b']));

    rerender({ page: 2 });

    expect(result.current.data).toEqual(['a', 'b']);
    expect(result.current.isPlaceholderData).toBe(true);

    pending.resolve(['c']);
    await waitFor(() => expect(result.current.data).toEqual(['c']));
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it("does not carry one academy's list into another academy's", async () => {
    const { wrapper } = wrapperFor();
    const pending = deferred<string[]>();
    const { result, rerender } = renderHook(
      ({ academyId }: { academyId: string }) =>
        useApiQuery<string[]>({
          queryKey: mediaKeys.list(academyId, {}),
          queryFn: () =>
            academyId === 'a1' ? Promise.resolve(['a1-file']) : pending.promise,
        }),
      { wrapper, initialProps: { academyId: 'a1' } }
    );
    await waitFor(() => expect(result.current.data).toEqual(['a1-file']));

    rerender({ academyId: 'a2' });

    expect(result.current.data).toBeUndefined();
    pending.resolve([]);
    await waitFor(() => expect(result.current.data).toEqual([]));
  });

  it('respects a hook that opts out explicitly with placeholderData: undefined', async () => {
    const { wrapper } = wrapperFor();
    const pending = deferred<string[]>();
    const { result, rerender } = renderHook(
      ({ page }: { page: number }) =>
        useApiQuery<string[]>({
          queryKey: mediaKeys.list('a1', { pagination: { page, pageSize: 2 } }),
          queryFn: () =>
            page === 1 ? Promise.resolve(['a']) : pending.promise,
          placeholderData: undefined,
        }),
      { wrapper, initialProps: { page: 1 } }
    );
    await waitFor(() => expect(result.current.data).toEqual(['a']));
    rerender({ page: 2 });
    expect(result.current.data).toBeUndefined();
    pending.resolve(['b']);
    await waitFor(() => expect(result.current.data).toEqual(['b']));
  });

  it('the query client no longer sets a key-blind global placeholder', () => {
    const client = createQueryClient();
    expect(client.getDefaultOptions().queries?.placeholderData).toBeUndefined();
  });
});
