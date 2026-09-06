/**
 * useAcademyIdentity hook — Phase 6. The ONE combined Academy Identity/
 * Branding read (`GET public/websites/:academyId/identity`), reused by the
 * public website, the Student LMS, and the dashboard's non-staff surfaces.
 * No new storage, no new theme system — see `AcademyIdentityResponse`'s
 * (backend) own doc comment.
 */
import { useApiQuery } from '@/shared/hooks';
import { publicWebsiteKeys } from '@services/query';
import { publicWebsiteService } from '../services/PublicWebsiteService';
import type { AcademyIdentity } from '@types';
import type { ApiError } from '@api';

export function useAcademyIdentity(academyId: string | undefined) {
  return useApiQuery<AcademyIdentity | null, ApiError>({
    queryKey: publicWebsiteKeys.identity(academyId),
    queryFn: () => publicWebsiteService.getIdentity(academyId!),
    enabled: !!academyId,
    // Identity/branding changes rarely — cache generously so navigating
    // between LMS pages doesn't re-fetch every time.
    staleTime: 5 * 60 * 1000,
  });
}
