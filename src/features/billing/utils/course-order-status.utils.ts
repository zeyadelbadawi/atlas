/**
 * Course order / refund status → badge tone. Shared by the academy Orders
 * page and the Platform Owner's course-payment review, whose labels both
 * come from `payments:courseOrder.status.*` / `payments:refund.status.*`.
 * Status is never carried by colour alone: every badge renders its label.
 */
import type { StatusTone } from '@components/data-display';
import type { CourseOrderRefundStatus, CourseOrderStatus } from '@types';

export function getCourseOrderStatusTone(
  status: CourseOrderStatus
): StatusTone {
  switch (status) {
    case 'paid':
      return 'success';
    case 'pending_payment':
      return 'warning';
    case 'refunded':
      return 'info';
    case 'expired':
    case 'cancelled':
    case 'draft':
    default:
      return 'neutral';
  }
}

export function getRefundStatusTone(
  status: CourseOrderRefundStatus
): StatusTone {
  switch (status) {
    case 'succeeded':
      return 'info';
    case 'pending':
      return 'warning';
    case 'failed':
      return 'destructive';
    default:
      return 'neutral';
  }
}
