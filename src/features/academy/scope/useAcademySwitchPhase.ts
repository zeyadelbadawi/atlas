/**
 * Whether an academy SWITCH is still loading (W5) — what the switching
 * overlay is bound to. Real work only, never a timer:
 *   - it starts when the URL moves from one academy to another;
 *   - it lasts while the membership check (`GET /academies/:id/me`) has no
 *     answer, or any query of the new academy is fetching for the FIRST
 *     time (no data yet);
 *   - it ends as soon as both are done. A return to an academy whose data
 *     is still cached has nothing loading, so no overlay flashes.
 * Entering an academy from outside any academy (a deep link, the first
 * visit) is not a switch: the page's own loading states cover it.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import type { Query } from '@tanstack/react-query';
import { keyReferencesAcademy } from '@services/query';

function isFirstLoadOf(academyId: string | undefined) {
  return (query: Query) =>
    !!academyId &&
    query.state.data === undefined &&
    keyReferencesAcademy(query.queryKey as readonly unknown[], academyId);
}

export function useAcademySwitchPhase(
  academyId: string | undefined,
  membershipResolving: boolean
): boolean {
  const queryClient = useQueryClient();
  const [switchingTo, setSwitchingTo] = useState<string | undefined>();
  const previousRef = useRef(academyId);

  // Before paint, so the first frame of the new academy is already covered.
  // Started only when something of the new academy really has no data yet
  // (its membership check, or a screen query — both are registered in the
  // cache during render): a cached return never shows the overlay at all.
  useLayoutEffect(() => {
    const previous = previousRef.current;
    previousRef.current = academyId;
    if (previous && academyId && previous !== academyId) {
      const needsLoad = queryClient
        .getQueryCache()
        .findAll({ predicate: isFirstLoadOf(academyId) })
        .some((query) => !query.isDisabled());
      setSwitchingTo(needsLoad || membershipResolving ? academyId : undefined);
    } else if (!academyId) {
      setSwitchingTo(undefined);
    }
    // Only an academy change starts a switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academyId]);

  const firstLoads = useIsFetching({ predicate: isFirstLoadOf(academyId) });
  const active = !!academyId && switchingTo === academyId;

  useEffect(() => {
    if (!active || membershipResolving || firstLoads > 0) return;
    // The new screen has committed (its queries register as it mounts);
    // check the cache once more after that frame, then finish.
    const frame = requestAnimationFrame(() => {
      const stillLoading = queryClient
        .getQueryCache()
        .findAll({ predicate: isFirstLoadOf(academyId) })
        .some((query) => query.state.fetchStatus === 'fetching');
      if (!stillLoading) setSwitchingTo(undefined);
    });
    return () => cancelAnimationFrame(frame);
  }, [active, membershipResolving, firstLoads, academyId, queryClient]);

  return active;
}
