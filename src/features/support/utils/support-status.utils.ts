/**
 * Support case status/priority → `StatusBadge` tone mapping.
 */
import type { StatusTone } from '@components/data-display';
import type { SupportCasePriority, SupportCaseStatus } from '@types';

export function getSupportCaseStatusTone(status: SupportCaseStatus): StatusTone {
  switch (status) {
    case 'resolved':
    case 'closed':
      return 'neutral';
    case 'in_progress':
      return 'info';
    case 'open':
    default:
      return 'warning';
  }
}

export function getSupportCasePriorityTone(priority: SupportCasePriority): StatusTone {
  switch (priority) {
    case 'urgent':
      return 'destructive';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    case 'low':
    default:
      return 'neutral';
  }
}
