/**
 * What a Platform Owner's approve/reject of a SUBSCRIPTION payment changes,
 * beyond the review queue itself — shared by `useApprovePayment` and
 * `useRejectPayment` so the two can never drift apart.
 *
 * An approval activates or replaces the organization's subscription, so the
 * platform metrics and analytics (subscription revenue), the subscriptions
 * overview and that organization's console detail are all stale after it. A
 * rejection changes the payment/checkout state shown on the same views.
 * Every key is a prefix from the query-key factory, never an inline array.
 */
import {
  analyticsKeys,
  platformMetricsKeys,
  platformOrganizationKeys,
  platformPaymentKeys,
  platformSubscriptionKeys,
} from '@services/query';

export function subscriptionPaymentDecisionKeys(
  paymentId: string,
  organizationId: string | undefined
): readonly (readonly unknown[])[] {
  return [
    platformPaymentKeys.detail(paymentId),
    platformPaymentKeys.all,
    platformMetricsKeys.all,
    analyticsKeys.all,
    platformSubscriptionKeys.all,
    organizationId
      ? platformOrganizationKeys.detail(organizationId)
      : platformOrganizationKeys.all,
  ];
}
