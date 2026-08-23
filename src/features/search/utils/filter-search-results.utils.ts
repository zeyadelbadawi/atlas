/**
 * Client-side permission-aware filtering for search results.
 *
 * A defensive second layer, not the enforcement point — `RouteGuard`
 * still fail-closes if a user follows a result they cannot access. This
 * exists so a non-Platform-Owner is never even shown Platform-only
 * results ("platform" category) in the first place, matching the same
 * fail-closed posture as everywhere else in Atlas.
 */
import type { SearchResults } from '@types';

export function filterSearchResultsByRole(
  results: SearchResults,
  roles: readonly string[]
): SearchResults {
  const isPlatformOwner = roles.includes('platform_owner');

  const groups = results.groups
    .filter((group) => group.category !== 'platform' || isPlatformOwner)
    .map((group) => group);

  return {
    ...results,
    groups,
    totalCount: groups.reduce((sum, group) => sum + group.items.length, 0),
  };
}
