/**
 * Academy constants.
 */
import type { AcademyStatus, AcademyMemberRole } from '@types';

/** Default timezone for new academies. */
export const DEFAULT_TIMEZONE = 'UTC';

/** Default language for new academies. */
export const DEFAULT_LANGUAGE = 'en';

/** Default currency for new academies. */
export const DEFAULT_CURRENCY = 'USD';

/** Academy status options. */
export const ACADEMY_STATUS_OPTIONS: readonly AcademyStatus[] = [
  'draft',
  'active',
  'suspended',
  'archived',
] as const;

/**
 * Academy member roles the product OFFERS — the single list every role
 * picker, filter and label in the Academy feature is driven from.
 *
 * `administrator` is deliberately absent (P64 Phase 1, decision D9).
 * It is a real, still-supported value of `AcademyMemberRole` — the
 * backend treats it as part of the managing tier alongside `owner` and
 * `manager` (`MANAGING_ROLES` in `academies.service.ts`,
 * `academy-students.service.ts`, the curriculum services) and legacy rows
 * may still carry it — but no role-assignment endpoint will ever grant it
 * again, so offering it in a picker would produce a selection the API
 * refuses. Existing rows are labelled through
 * `getAcademyMemberRoleLabelKey`, which shows them as Manager: the tier
 * they actually hold.
 */
export const ACADEMY_MEMBER_ROLES: readonly AcademyMemberRole[] = [
  'owner',
  'manager',
  'instructor',
  'staff',
] as const;

/** Academy onboarding steps count. */
export const ACADEMY_ONBOARDING_STEPS_COUNT = 4;

/** Maximum academy name length. */
export const MAX_ACADEMY_NAME_LENGTH = 100;

/** Maximum academy description length. */
export const MAX_ACADEMY_DESCRIPTION_LENGTH = 500;

/** Maximum academy slug length. */
export const MAX_ACADEMY_SLUG_LENGTH = 50;

/** Academy logo maximum file size (5MB). */
export const MAX_LOGO_FILE_SIZE = 5 * 1024 * 1024;

/** Academy favicon maximum file size (1MB). */
export const MAX_FAVICON_FILE_SIZE = 1024 * 1024;

/** Allowed logo file types. */
export const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

/** Allowed favicon file types. */
export const ALLOWED_FAVICON_TYPES = ['image/x-icon', 'image/png'];
