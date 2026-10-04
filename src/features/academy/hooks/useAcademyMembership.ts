/**
 * useAcademyMembership — `GET /academies/:id/me` (W5).
 *
 * The caller's role, permissions and the academy summary for the academy
 * the URL addresses. It is the academy scope's access check: a 403 (no
 * longer staff) or 404 (academy gone) here is what sends the user out of
 * an academy they cannot open any more.
 *
 * `staleTime: 0` on purpose: every entry into an academy (a switch, Back,
 * a deep link) re-asks the server, so a role revoked in another tab or by
 * another owner is noticed on the next visit, not five minutes later. A
 * cached answer still renders at once (no switching overlay on a return
 * visit) while the revalidation runs.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { academyKeys } from '@services/query';
import type { ApiError } from '@api';
import type { AcademyMembership } from '@types';
import { academyService } from '../services/AcademyService';

export function useAcademyMembership(academyId: string | undefined) {
  const { organization } = useAuth();

  return useApiQuery<AcademyMembership, ApiError>({
    queryKey: academyKeys.membership(organization?.id, academyId ?? ''),
    queryFn: () => academyService.getMyMembership(academyId!),
    enabled: !!academyId,
    staleTime: 0,
    // A refusal is an answer, not a transient failure: retrying a 403/404
    // would only delay the redirect the user needs.
    retry: (failureCount, error) =>
      error.kind !== 'forbidden' &&
      error.kind !== 'notFound' &&
      failureCount < 2,
    // Handled by the academy scope (message + redirect), not the generic
    // "you do not have access" toast.
    meta: { inlineErrors: true },
  });
}
