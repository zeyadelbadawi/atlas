/**
 * useResolveHostname hook.
 *
 * `enabled` only when a non-empty hostname is supplied — a caller that
 * hasn't resolved the current hostname yet (e.g. before hydration) never
 * fires an accidental request.
 */
import { useApiQuery } from '@/shared/hooks';
import { publicWebsiteKeys } from '@services/query';
import { publicWebsiteService } from '@services';
import type { HostnameResolution } from '@types';
import type { ApiError } from '@api';

export function useResolveHostname(hostname: string) {
  return useApiQuery<HostnameResolution | null, ApiError>({
    queryKey: publicWebsiteKeys.hostnameResolution(hostname),
    queryFn: () => publicWebsiteService.resolveHostname(hostname),
    enabled: !!hostname,
    // P63g — a hostname's answer changes rarely but it DOES change (a
    // customer fixes DNS, a domain goes live): re-read after a minute of
    // staleness and on focus, so a visitor who saw "not found" is not stuck
    // with it for the whole session.
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
