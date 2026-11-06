/**
 * useAcademyIdentity hook — Phase 6. The ONE combined Academy Identity/
 * Branding read (`GET public/websites/:academyId/identity`), reused by the
 * public website, the Student LMS, and the dashboard's non-staff surfaces.
 * No new storage, no new theme system — see `AcademyIdentityResponse`'s
 * (backend) own doc comment.
 */
import { useApiQuery } from './useApiQuery';
import { INLINE_ERRORS_META, publicWebsiteKeys } from '@services/query';
import { publicWebsiteService } from '@services';
import type { AcademyIdentity } from '@types';
import type { ApiError } from '@api';

/** B9 (UX audit) — the public site draws its own state for a failed read; the app-wide toast would only repeat it. */
const PUBLIC_READ_META = { [INLINE_ERRORS_META]: true } as const;

export function useAcademyIdentity(academyId: string | undefined) {
  return useApiQuery<AcademyIdentity | null, ApiError>({
    meta: PUBLIC_READ_META,
    queryKey: publicWebsiteKeys.identity(academyId),
    queryFn: () => publicWebsiteService.getIdentity(academyId!),
    enabled: !!academyId,
    // Identity/branding changes rarely — cache generously so navigating
    // between LMS pages doesn't re-fetch every time.
    staleTime: 5 * 60 * 1000,
  });
}
