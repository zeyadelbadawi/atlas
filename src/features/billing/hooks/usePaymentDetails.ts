/**
 * usePaymentDetails hook.
 *
 * The single query behind both the Payment Details page and the
 * gateway-return landing (the same page — see `PaymentDetailsPage`'s doc
 * comment). Never trusts a redirect query parameter: whatever brought the
 * user here, this hook re-fetches the backend-authoritative `Payment`.
 *
 * Polls while the payment is genuinely in progress (see
 * `PAYMENT_STATUS_POLL_INTERVAL_MS`), stops at any terminal status, and —
 * per acceptance criteria C-7-56/57/83 — does NOT poll while
 * `reviewStatus: 'pending'`, since nothing external is happening there for
 * polling to observe; a human has to act. Gated on `reviewStatus`, never
 * on `methodType === 'gateway'` — a gateway payment could in principle
 * also require manual review (see `payment.types.ts`'s `ManualReviewStatus`
 * doc comment), so the capability/state actually present on the record is
 * what decides this, not which method it came through.
 *
 * The moment `status` is first observed transitioning INTO `'succeeded'`,
 * this hook invalidates Prompt 6's `tenantKeys` (subscription/usage/
 * add-ons) so `useEffectiveEntitlements` picks up the change on its next
 * read — the one and only place Payment success feeds back into
 * entitlements (see `Reports/ARCHITECTURE.md`, Prompt 7, "Entitlements
 * Integration").
 */
import { useEffect, useRef } from 'react';
import { useApiQuery, useAuth, useInvalidate } from '@/shared/hooks';
import { checkoutKeys, paymentKeys, tenantKeys } from '@services/query';
import { paymentService } from '../services/PaymentService';
import { PAYMENT_STATUS_POLL_INTERVAL_MS } from '../constants/billing.constants';
import { TERMINAL_PAYMENT_STATUSES } from '@types';
import type { Payment } from '@types';
import type { ApiError } from '@api';

export function usePaymentDetails(paymentId: string) {
  const { organization } = useAuth();
  const { invalidate } = useInvalidate();
  const previousStatusRef = useRef<Payment['status'] | undefined>(undefined);

  const query = useApiQuery<Payment, ApiError>({
    queryKey: paymentKeys.detail(organization?.id, paymentId),
    queryFn: () => paymentService.getPayment(organization!.id, paymentId),
    enabled: !!organization?.id && !!paymentId,
    refetchInterval: (activeQuery) => {
      const payment = activeQuery.state.data;
      if (!payment) return false;
      if (TERMINAL_PAYMENT_STATUSES.includes(payment.status)) return false;
      if (payment.reviewStatus === 'pending') return false;
      return PAYMENT_STATUS_POLL_INTERVAL_MS;
    },
  });

  useEffect(() => {
    const current = query.data?.status;
    const previous = previousStatusRef.current;
    previousStatusRef.current = current;

    if (current === 'succeeded' && previous !== 'succeeded' && previous !== undefined) {
      void invalidate(tenantKeys.subscription(organization?.id));
      void invalidate(tenantKeys.usage(organization?.id));
      void invalidate(tenantKeys.addOns(organization?.id));
      void invalidate(checkoutKeys.all);
    }
  }, [query.data?.status, invalidate, organization?.id]);

  return query;
}
