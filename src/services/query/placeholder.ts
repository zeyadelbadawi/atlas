/**
 * Placeholder-data policy.
 *
 * Keeping the previous result on screen while a new key loads is right for
 * paging, filtering and sorting ONE collection (the table does not collapse
 * to a skeleton on every page turn) and wrong whenever the key now names a
 * DIFFERENT thing: opening course B after course A briefly rendered course
 * A's title, settings and actions under course B's URL, and switching
 * organization or academy flashed the previous tenant's data.
 *
 * The app used to set `placeholderData: previous => previous` as a global
 * default, which cannot tell the two apart (the default function never sees
 * the new key). `useApiQuery` now applies `keepPreviousForSameResource`,
 * which keeps the previous data only when the two keys differ solely in
 * their parameter elements (query/filter objects and numeric windows); any
 * change of a string element — an entity id, a scope id, a slug, a search
 * term — means a different resource, and the query shows its loading state.
 */
import type { Query, QueryKey } from '@tanstack/react-query';

/**
 * Parameter elements: the query/filter/pagination objects every list key
 * ends in, numeric windows (`days`), and absent values. Identity elements
 * (ids, slugs, scope names) are strings or booleans.
 */
function isParameterElement(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    typeof value === 'number' ||
    typeof value === 'object'
  );
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null
  ) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a as Record<string, unknown>).filter(
    (key) => (a as Record<string, unknown>)[key] !== undefined
  );
  const bKeys = Object.keys(b as Record<string, unknown>).filter(
    (key) => (b as Record<string, unknown>)[key] !== undefined
  );
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) =>
    deepEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key]
    )
  );
}

/**
 * Whether `next` addresses the same resource as `previous` — same length,
 * and every element that differs is a parameter element on both sides.
 */
export function isSameResourceKey(
  previous: QueryKey | undefined,
  next: QueryKey
): boolean {
  if (!previous || previous.length !== next.length) return false;
  return next.every((element, index) => {
    const before = previous[index];
    if (deepEqual(before, element)) return true;
    return isParameterElement(before) && isParameterElement(element);
  });
}

/**
 * A `placeholderData` function for `queryKey`: the previous data while the
 * same resource re-pages/re-filters, nothing when the key names a
 * different resource.
 */
export function keepPreviousForSameResource<TData>(queryKey: QueryKey) {
  return (
    previousData: TData | undefined,
    previousQuery: Query<TData, never, TData, QueryKey> | undefined
  ): TData | undefined =>
    previousQuery && isSameResourceKey(previousQuery.queryKey, queryKey)
      ? previousData
      : undefined;
}
