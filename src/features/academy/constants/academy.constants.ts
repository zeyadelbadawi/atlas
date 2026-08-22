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

/** Academy member role options. */
export const ACADEMY_MEMBER_ROLES: readonly AcademyMemberRole[] = [
  'owner',
  'administrator',
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