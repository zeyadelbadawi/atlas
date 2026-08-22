/**
 * useResolveHostname hook.
 *
 * `enabled` only when a non-empty hostname is supplied — a caller that
 * hasn't resolved the current hostname yet (e.g. before hydration) never
 * fires an accidental request.
 */
import { useApiQuery } from '@/shared/hooks';
import { publicWebsiteKeys } from '@services/query';
import { publicWebsiteService } from '../services/PublicWebsiteService';
import type { HostnameResolution } from '@types';
import type { ApiError } from '@api';

export function useResolveHostname(hostname: string) {
  return useApiQuery<HostnameResolution | null, ApiError>({
    queryKey: publicWebsiteKeys.hostnameResolution(hostname),
    queryFn: () => publicWebsiteService.resolveHostname(hostname),
    enabled: !!hostname,
    // Which Academy a hostname resolves to essentially never changes
    // during a session — safe to treat as effectively static.
    staleTime: Infinity,
  });
}
