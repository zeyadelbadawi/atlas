/**
 * Whether the current person may file Customer Requests for the academy
 * the URL addresses: an owner or administrator of THAT academy (the same
 * rule the API enforces with `AcademyRoles('owner', 'administrator')`).
 *
 * Hiding is UX, not security — it only stops the product from offering a
 * door that would answer 403. While the membership is unresolved (or
 * outside an academy) the answer is `false`, so nothing flickers in and
 * out for a manager.
 */
import { useAcademyScope } from '@features/academy';
import { CUSTOMER_REQUEST_ACADEMY_ROLES } from '../constants/customer-request.constants';

export interface CustomerRequestAccess {
  readonly academyId: string | undefined;
  readonly canRequest: boolean;
  /** `true` while the academy membership has no answer yet. */
  readonly isResolving: boolean;
}

export function useCustomerRequestAccess(): CustomerRequestAccess {
  const { academyId, membership, isResolving } = useAcademyScope();
  const canRequest =
    !!academyId &&
    !!membership &&
    membership.academy.id === academyId &&
    CUSTOMER_REQUEST_ACADEMY_ROLES.includes(membership.role);
  return { academyId, canRequest, isResolving };
}

/** Shorthand for the contextual cards: may this person request a custom service here? */
export function useCanRequestCustomerServices(): boolean {
  return useCustomerRequestAccess().canRequest;
}
