/**
 * Academy-scoped cache helpers (W5 — academy switching isolation).
 *
 * THE INVARIANT. Every query key that holds one academy's data carries that
 * academy's id as a TOP-LEVEL STRING element (`['course', 'list', academyId,
 * query]`, `['academy', 'stats', orgId, academyId]`, ...). Never inside a
 * parameter object: the placeholder policy keeps previous data across a
 * change in an object element, and the predicates below would not see it.
 * `academy-scope-registry.test.ts` enforces the invariant for every key
 * factory in `query-keys.ts`.
 *
 * That invariant is what lets a switch or a revocation address one
 * academy's whole cache in a single predicate, whatever feature cached it.
 */
import type { Query, QueryClient } from '@tanstack/react-query';

/** `true` when `queryKey` holds `academyId` as one of its top-level elements. */
export function keyReferencesAcademy(
  queryKey: readonly unknown[],
  academyId: string
): boolean {
  return academyId.length > 0 && queryKey.some((part) => part === academyId);
}

/** A TanStack query filter matching every cached query of one academy. */
export function academyQueryFilter(academyId: string) {
  return {
    predicate: (query: Query) =>
      keyReferencesAcademy(query.queryKey as readonly unknown[], academyId),
  };
}

/**
 * Cancels every in-flight query of one academy. TanStack drops the result
 * of a cancelled fetch (the query reverts to its previous state), so a
 * response for the academy the user just left can never land in the cache
 * after the switch — the race guard for reads.
 */
export function cancelAcademyQueries(
  queryClient: QueryClient,
  academyId: string
): Promise<void> {
  return queryClient.cancelQueries(academyQueryFilter(academyId));
}

/**
 * Removes every cached query of one academy (access revoked, academy
 * deleted): nothing the user can no longer open may be shown from cache,
 * and a later return must re-ask the server.
 */
export function removeAcademyQueries(
  queryClient: QueryClient,
  academyId: string
): void {
  void queryClient.cancelQueries(academyQueryFilter(academyId));
  queryClient.removeQueries(academyQueryFilter(academyId));
}
