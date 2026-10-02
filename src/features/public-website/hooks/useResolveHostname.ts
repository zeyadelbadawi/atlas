/**
 * useResolveHostname hook.
 *
 * `enabled` only when a non-empty hostname is supplied — a caller that
 * hasn't resolved the current hostname yet (e.g. before hydration) never
 * fires an accidental request.
 */
import { useApiQuery } from '@/shared/hooks';
import { publicWebsiteKeys } from '@services/query';
// The early request `main.tsx` started, if any (Reports/LCP_ROOT_CAUSE.md).
import { prefetchKeys, publicWebsiteService, takePrefetched } from '@services';
import { setDevHostAcademyId } from '@/services/api/dev-host-academy';
import { DEV_OVERRIDE_PARAM } from '@utils';
import type { HostnameResolution } from '@types';
import type { ApiError } from '@api';

export function useResolveHostname(hostname: string) {
  return useApiQuery<HostnameResolution | null, ApiError>({
    queryKey: publicWebsiteKeys.hostnameResolution(hostname),
    queryFn: async () => {
      const resolution = await (takePrefetched<HostnameResolution | null>(
        prefetchKeys.resolve(hostname)
      ) ?? publicWebsiteService.resolveHostname(hostname));
      // Local development: remember the dev-preview Academy for the
      // host-resolved learner routes (see `dev-host-academy.ts`).
      if (
        import.meta.env.DEV &&
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get(DEV_OVERRIDE_PARAM) ===
          hostname
      ) {
        setDevHostAcademyId(resolution?.academyId);
      }
      return resolution;
    },
    enabled: !!hostname,
    // P63g — a hostname's answer changes rarely but it DOES change (a
    // customer fixes DNS, a domain goes live): re-read after a minute of
    // staleness and on focus, so a visitor who saw "not found" is not stuck
    // with it for the whole session.
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
