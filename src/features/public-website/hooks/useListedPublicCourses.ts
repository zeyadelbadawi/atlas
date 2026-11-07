/**
 * The courses a page currently lists (SEO/AEO/GEO pass, Nov 2026).
 *
 * The Courses page's `ItemList` structured data must name the courses the
 * page itself shows — no more, no fewer. Those come from whichever public
 * course-list queries the page's sections ran (the catalog's page, a
 * featured block), so this reads them from the query cache rather than
 * fetching a list of its own: no extra request, and nothing listed that
 * the visitor cannot see. On the server the last render pass sees every
 * list the sections fetched; in the browser the hook re-renders when one
 * of them changes.
 */
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { publicWebsiteKeys } from '@services';
import type { Course, PaginatedResult } from '@types';

export function useListedPublicCourses(
  academyId: string,
  enabled: boolean
): readonly Course[] {
  const client = useQueryClient();
  const prefix = publicWebsiteKeys.coursesAll(academyId);
  const findLists = useCallback(
    () =>
      enabled
        ? client
            .getQueryCache()
            .findAll({ queryKey: prefix })
            .filter((query) => query.state.status === 'success')
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, enabled, academyId]
  );
  const subscribe = useCallback(
    (onChange: () => void) => client.getQueryCache().subscribe(onChange),
    [client]
  );
  // A cheap, stable snapshot: which lists, and when each last changed.
  const snapshot = useCallback(
    () =>
      findLists()
        .map((query) => `${query.queryHash}@${query.state.dataUpdatedAt}`)
        .join('|'),
    [findLists]
  );
  const version = useSyncExternalStore(subscribe, snapshot, snapshot);
  return useMemo(() => {
    const seen = new Set<string>();
    const courses: Course[] = [];
    for (const query of findLists()) {
      const data = query.state.data as PaginatedResult<Course> | null;
      for (const course of data?.items ?? []) {
        if (seen.has(course.id)) continue;
        seen.add(course.id);
        courses.push(course);
      }
    }
    return courses;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, findLists]);
}
