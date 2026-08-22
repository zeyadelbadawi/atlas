/**
 * useCreateCheckout hook.
 *
 * `organizationId` is passed explicitly by the caller (not read internally
 * from `useAuth`) — the same pattern `useUpdateAcademy` uses — so a
 * mutation already in flight can't silently switch organizations underneath
 * itself. Never auto-retried: a duplicate `createCheckout` call must be an
 * explicit user action, replaying the SAME `idempotencyKey` the caller
 * generated once per attempt (see `generateIdempotencyKey`).
 */
import { useApiMutation } from '@/shared/hooks';
import type { ApiError } from '@api';
import { checkoutService } from '../services/CheckoutService';
import type { Checkout, CreateCheckoutPayload } from '@types';

export interface CreateCheckoutVariables {
  readonly organizationId: string;
  readonly payload: CreateCheckoutPayload;
}

export function useCreateCheckout() {
  return useApiMutation<Checkout, CreateCheckoutVariables, ApiError>({
    mutationFn: ({ organizationId, payload }) =>
      checkoutService.createCheckout(organizationId, payload),
    showSuccessToast: false,
    showErrorToast: false,
  });
}
