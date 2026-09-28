/**
 * Google Identity — whether THIS host offers "Continue with Google".
 *
 * A failure is not an error the visitor sees: the button simply stays
 * hidden, which is exactly what the backend's own flag-off answer means.
 */
import { useApiQuery } from '@/shared/hooks';
import { authKeys } from '@services/query';
import { authenticationService } from '@services/identity';
import type { ApiError } from '@api';
import type { AuthOptions } from '@types';

export function useGoogleAuthOptions(
  options: { readonly academyId?: string; readonly enabled?: boolean } = {}
): { readonly googleEnabled: boolean } {
  const query = useApiQuery<AuthOptions, ApiError>({
    queryKey: authKeys.options(options.academyId),
    queryFn: () => authenticationService.authOptions(options.academyId),
    enabled: options.enabled ?? true,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  return { googleEnabled: query.data?.google === true };
}
