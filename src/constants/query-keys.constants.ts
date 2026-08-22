/**
 * TanStack Query cache key factory.
 *
 * A single factory keeps cache keys unique, serialisable and predictable, which
 * makes invalidation reliable as modules are added. Features extend this by
 * composing their own scope beneath `ATLAS_QUERY_SCOPE`.
 */
import type { CollectionQuery } from '@types';

/** Root scope shared by every Atlas query key. */
export const ATLAS_QUERY_SCOPE = 'atlas' as const;

/** A cache key tuple accepted by TanStack Query. */
export type QueryKey = readonly unknown[];

/**
 * Builds cache keys for one resource.
 *
 * @example
 * const coursesKeys = createResourceKeys('courses');
 * coursesKeys.list({ search: 'design' });
 * coursesKeys.detail('course-1');
 */
export function createResourceKeys(resource: string) {
  const root = [ATLAS_QUERY_SCOPE, resource] as const;

  return {
    /** Every cache entry belonging to the resource. Use to invalidate all. */
    all: (): QueryKey => root,
    /** All list queries of the resource, regardless of their parameters. */
    lists: (): QueryKey => [...root, 'list'],
    /** One list query, identified by its collection parameters. */
    list: (query?: CollectionQuery): QueryKey => [...root, 'list', query ?? {}],
    /** All detail queries of the resource. */
    details: (): QueryKey => [...root, 'detail'],
    /** One entity, identified by its id. */
    detail: (id: string): QueryKey => [...root, 'detail', id],
  } as const;
}

export type ResourceKeys = ReturnType<typeof createResourceKeys>;