/**
 * useInvalidate hook.
 *
 * Provides query invalidation helpers.
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateQueries, invalidateResource } from '@services/query/query-utils';

export interface UseInvalidateResult {
  /** Invalidates all queries matching a key prefix. */
  readonly invalidate: (keyPrefix: readonly unknown[]) => Promise<void>;

  /** Invalidates all queries for a specific resource. */
  readonly invalidateResource: (resource: string) => Promise<void>;
}

export function useInvalidate(): UseInvalidateResult {
  const queryClient = useQueryClient();

  const invalidate = useCallback(
    async (keyPrefix: readonly unknown[]) => {
      await invalidateQueries(queryClient, keyPrefix);
    },
    [queryClient]
  );

  const invalidateResourceCallback = useCallback(
    async (resource: string) => {
      await invalidateResource(queryClient, resource);
    },
    [queryClient]
  );

  return {
    invalidate,
    invalidateResource: invalidateResourceCallback,
  };
}