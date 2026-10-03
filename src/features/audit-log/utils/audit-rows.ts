/**
 * API shapes → the one row model every audit surface renders.
 */
import type {
  AuditLogEntrySummary,
  DashboardActivityItem,
  TenantAuditLogEntry,
} from '@types';
import type { AuditRowModel } from '../components/AuditEntryRow';
import {
  fromDashboardItem,
  fromPlatformEntry,
  fromTenantEntry,
} from './formatAuditEntry';

export function tenantEntryToRow(entry: TenantAuditLogEntry): AuditRowModel {
  return {
    id: entry.id,
    occurredAt: entry.occurredAt,
    input: fromTenantEntry(entry),
    // Atlas staff are not a filterable "person" in a tenant's log.
    actorId: entry.actor.isPlatformStaff ? undefined : entry.actor.id,
    role: entry.role,
    academyId: entry.academyId,
    academyName: entry.academyName,
  };
}

export function platformEntryToRow(entry: AuditLogEntrySummary): AuditRowModel {
  return {
    id: entry.id,
    occurredAt: entry.occurredAt,
    input: fromPlatformEntry(entry),
    actorId: entry.actor.id,
    role: entry.role,
    academyId: entry.academyId,
    academyName: entry.academyName,
    organizationName: entry.organizationName,
  };
}

export function dashboardItemToRow(item: DashboardActivityItem): AuditRowModel {
  return {
    id: item.id,
    occurredAt: item.occurredAt,
    input: fromDashboardItem(item),
    role: item.actorRole,
    academyId: item.academyId,
  };
}
