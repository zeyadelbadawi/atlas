/**
 * RecentActivityList (Phase 8, rebuilt for Task 3) — real audit-trail
 * activity, newest first.
 *
 * Every row is a real `audit_log_entries` row the backend already scoped
 * (organization always; academy too, for an academy dashboard) and already
 * restricted to tenant-visible actions — this component never filters.
 *
 * Each row reads as a full sentence through the shared `formatAuditEntry`
 * (every audited action has English and Arabic copy, with a target-aware
 * fallback), replacing the old 27-action table whose fallback was the
 * contentless "{{actor}} made a change".
 */
import { History } from 'lucide-react';
import { EmptyState } from '@components/feedback';
import { AuditEntryRow, dashboardItemToRow } from '@features/audit-log';
import type { DashboardActivityItem } from '@types';

export interface RecentActivityListProps {
  readonly items: readonly DashboardActivityItem[];
}

export function RecentActivityList({
  items,
}: RecentActivityListProps): JSX.Element {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={History}
        titleKey="dashboard:activity.empty.title"
        descriptionKey="dashboard:activity.empty.description"
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map((item) => (
        <AuditEntryRow key={item.id} row={dashboardItemToRow(item)} compact />
      ))}
    </ul>
  );
}
