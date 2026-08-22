/**
 * Academy status → tone mapping.
 *
 * Centralizes how Academy lifecycle/role/member states map onto the shared
 * `StatusBadge` tones, so every page (Dashboard, Settings, Members) renders
 * status consistently instead of each hand-rolling its own badge variant.
 */
import type { StatusTone } from '@components/data-display';
import type { AcademyStatus, AcademyMemberRole, AcademyMemberStatus } from '@types';

/**
 * Maps an academy's lifecycle status to its translation key.
 *
 * Reuses the existing `academy:settings.status*` keys (already shown in the
 * Settings status selector) instead of introducing a parallel set of labels.
 */
export function getAcademyStatusLabelKey(status: AcademyStatus): string {
  const capitalized = status.charAt(0).toUpperCase() + status.slice(1);
  return `academy:settings.status${capitalized}`;
}

/** Maps an academy's lifecycle status to a status tone. */
export function getAcademyStatusTone(status: AcademyStatus): StatusTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'draft':
      return 'neutral';
    case 'suspended':
      return 'warning';
    case 'archived':
      return 'destructive';
    default:
      return 'neutral';
  }
}

/** Maps an academy member's role to a status tone. */
export function getAcademyMemberRoleTone(role: AcademyMemberRole): StatusTone {
  switch (role) {
    case 'owner':
      return 'success';
    case 'administrator':
    case 'manager':
      return 'info';
    case 'instructor':
    case 'staff':
    default:
      return 'neutral';
  }
}

/** Maps an academy member's status to a status tone. */
export function getAcademyMemberStatusTone(
  status: AcademyMemberStatus
): StatusTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'pending':
      return 'warning';
    case 'inactive':
    default:
      return 'neutral';
  }
}
