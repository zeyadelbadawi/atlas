/**
 * useStudentResults (Phase 9) — the authenticated student's own quiz and
 * assignment outcomes. No student id is passed or accepted; the backend
 * scopes the response to the caller.
 */
import { useApiQuery } from '@/shared/hooks';
import { studentResultsService } from '../services/StudentResultsService';
import type { StudentResults } from '@types';
import type { ApiError } from '@api';

export const studentResultsKeys = {
  mine: (academyId?: string) =>
    ['student-results', 'mine', academyId ?? 'all'] as const,
};

export function useStudentResults(academyId?: string) {
  return useApiQuery<StudentResults, ApiError>({
    queryKey: studentResultsKeys.mine(academyId),
    queryFn: () => studentResultsService.getMyResults(academyId),
  });
}
