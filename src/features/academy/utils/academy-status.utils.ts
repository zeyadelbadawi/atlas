/**
 * Academy status → tone mapping.
 *
 * Centralizes how Academy lifecycle/role/member states map onto the shared
 * `StatusBadge` tones, so every page (Dashboard, Settings, Members) renders
 * status consistently instead of each hand-rolling its own badge variant.
 */
import type { StatusTone } from '@components/data-display';
import type {
  AcademyStatus,
  AcademyMemberRole,
  AcademyMemberStatus,
  WebsitePublishStatus,
} from '@types';

/**
 * The Academy website's publish state → tone, as the website editor's own
 * publish bar shows it. This — not the Academy's internal lifecycle
 * status — is the status the Academy dashboard presents (Task 1).
 */
export const WEBSITE_STATUS_TONE: Record<WebsitePublishStatus, StatusTone> = {
  draft: 'neutral',
  published: 'success',
};

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

/**
 * Translation key for an academy member's role.
 *
 * `administrator` (P64 Phase 1, D9) is never shown by that name: it is a
 * legacy tier no endpoint grants any more, and the authority it carries
 * is exactly the managing tier's (`MANAGING_ROLES` server-side), so a row
 * still holding it is labelled Manager rather than exposing a role the
 * product no longer has a concept of. Every label in the feature goes
 * through here so the hidden role cannot resurface one table at a time.
 */
export function getAcademyMemberRoleLabelKey(role: AcademyMemberRole): string {
  return `academy:members.roles.${getShownAcademyMemberRole(role)}`;
}

/** The role names the product shows for an academy member. */
export type ShownAcademyMemberRole =
  'owner' | 'manager' | 'instructor' | 'member';

/**
 * The role an academy member is SHOWN as, wherever a role is named (the
 * Members table and filter, the academy switcher's badge).
 *
 * B0-ORG-01 — the legacy `administrator` (D9) reads as Manager, the tier it
 * holds. The retired `staff` role (never granted; no production row) and
 * any value this build does not know read as a plain "Team member" rather
 * than naming a role the product no longer has. Both stay valid values of
 * `AcademyMemberRole`, since the database enum keeps them.
 */
export function getShownAcademyMemberRole(
  role: AcademyMemberRole | string
): ShownAcademyMemberRole {
  switch (role) {
    case 'owner':
      return 'owner';
    case 'administrator':
    case 'manager':
      return 'manager';
    case 'instructor':
      return 'instructor';
    default:
      return 'member';
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
