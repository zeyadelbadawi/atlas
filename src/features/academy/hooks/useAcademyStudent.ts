/**
 * useAcademyStudent hook (P64 Phase 1).
 *
 * Fetches one learner's roster detail: membership, enrollments, quiz and
 * assignment outcomes, active sessions, and the viewer's scope.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { academyKeys } from '@services/query';
import type { ApiError } from '@api';
import { academyRosterService } from '../services/AcademyRosterService';
import type { AcademyStudentDetail } from '@types';

export interface UseAcademyStudentOptions {
  readonly enabled?: boolean;
}

export function useAcademyStudent(
  academyId: string,
  userId: string,
  options?: UseAcademyStudentOptions
) {
  const { enabled = true } = options ?? {};
  const { organization } = useAuth();

  return useApiQuery<AcademyStudentDetail, ApiError>({
    queryKey: academyKeys.rosterStudent(organization?.id, academyId, userId),
    queryFn: () => academyRosterService.getStudent(academyId, userId),
    enabled: enabled && !!academyId && !!userId,
  });
}
