/**
 * Academy validation schemas.
 *
 * All Academy forms use Zod for validation to maintain consistency with the
 * existing Atlas form infrastructure.
 */
import { z } from 'zod';
import {
  MAX_ACADEMY_NAME_LENGTH,
  MAX_ACADEMY_DESCRIPTION_LENGTH,
  MAX_ACADEMY_SLUG_LENGTH,
  MAX_MEMBER_NAME_LENGTH,
  MIN_MEMBER_NAME_LENGTH,
} from '../constants/academy.constants';
import { validationMessage } from '@/shared/forms/validation-message';

/** Shortest address a new academy may take (backend `MIN_ACADEMY_SLUG_LENGTH`). */
export const MIN_NEW_ACADEMY_SLUG_LENGTH = 3;

/*
 * B4 (UX audit) V04 — the contact phone is shown on the public website and
 * the address on invoices, so both are checked before saving. The limits
 * match the backend's `UpdateAcademyDto`: street 200, city 100,
 * state/region 100, postal code 2–20 letters, digits, spaces or hyphens;
 * the phone an optional +, digits, spaces, parentheses and hyphens with
 * 7–15 digits (E.164 has at most 15).
 */
export const MAX_ACADEMY_STREET_LENGTH = 200;
export const MAX_ACADEMY_CITY_LENGTH = 100;
export const MAX_ACADEMY_STATE_LENGTH = 100;
export const ACADEMY_POSTAL_CODE_PATTERN = /^[A-Za-z0-9 -]{2,20}$/;
export const ACADEMY_CONTACT_PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;
const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;

/** Arabic-Indic (٠–٩) and Persian (۰–۹) digits read as Western ones. */
export function toWesternDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** Whether a typed contact phone is one the backend accepts (blank is allowed). */
export function isValidContactPhone(value: string): boolean {
  const phone = toWesternDigits(value).trim();
  if (phone === '') return true;
  const digits = phone.replace(/\D/g, '').length;
  return (
    ACADEMY_CONTACT_PHONE_PATTERN.test(phone) &&
    digits >= MIN_PHONE_DIGITS &&
    digits <= MAX_PHONE_DIGITS
  );
}

const contactPhoneSchema = z
  .string()
  .refine(isValidContactPhone, 'academy:settings.contactPhoneInvalid')
  .optional();

function maxText(max: number) {
  return z
    .string()
    .max(max, validationMessage('validation:maxLength', { count: max }))
    .optional();
}

const postalCodeSchema = z
  .string()
  .refine(
    (value) => value.trim() === '' || ACADEMY_POSTAL_CODE_PATTERN.test(value.trim()),
    'academy:profile.postalCodeInvalid'
  )
  .optional();

/** Slug validation regex: lowercase letters, numbers, hyphens. */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Academy creation schema. */
export const createAcademySchema = z.object({
  name: z
    .string()
    .min(1, 'validation:required')
    .max(
      MAX_ACADEMY_NAME_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_ACADEMY_NAME_LENGTH,
      })
    ),
  // A new address needs MIN_NEW_ACADEMY_SLUG_LENGTH characters (the backend
  // refuses shorter new labels); the settings forms keep min(1) so an
  // existing shorter address still saves.
  slug: z
    .string()
    .min(1, 'validation:required')
    .min(MIN_NEW_ACADEMY_SLUG_LENGTH, 'validation:slugTooShort')
    .max(
      MAX_ACADEMY_SLUG_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_ACADEMY_SLUG_LENGTH,
      })
    )
    .regex(SLUG_REGEX, 'validation:invalidSlug'),
  description: z
    .string()
    .max(
      MAX_ACADEMY_DESCRIPTION_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_ACADEMY_DESCRIPTION_LENGTH,
      })
    )
    .optional(),
  contactEmail: z
    .string()
    .email('validation:invalidEmail')
    .optional()
    .or(z.literal('')),
  contactPhone: contactPhoneSchema,
  website: z.string().url('validation:invalidUrl').optional().or(z.literal('')),
  country: z.string().optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
});

export type CreateAcademyFormData = z.infer<typeof createAcademySchema>;

/** Academy profile update schema. */
export const updateAcademyProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'validation:required')
    .max(
      MAX_ACADEMY_NAME_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_ACADEMY_NAME_LENGTH,
      })
    ),
  slug: z
    .string()
    .min(1, 'validation:required')
    .max(
      MAX_ACADEMY_SLUG_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_ACADEMY_SLUG_LENGTH,
      })
    )
    .regex(SLUG_REGEX, 'validation:invalidSlug'),
  description: z
    .string()
    .max(
      MAX_ACADEMY_DESCRIPTION_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_ACADEMY_DESCRIPTION_LENGTH,
      })
    )
    .optional(),
  contactEmail: z
    .string()
    .email('validation:invalidEmail')
    .optional()
    .or(z.literal('')),
  contactPhone: contactPhoneSchema,
  website: z.string().url('validation:invalidUrl').optional().or(z.literal('')),
  street: maxText(MAX_ACADEMY_STREET_LENGTH),
  city: maxText(MAX_ACADEMY_CITY_LENGTH),
  state: maxText(MAX_ACADEMY_STATE_LENGTH),
  postalCode: postalCodeSchema,
  country: z.string().optional(),
  language: z.string().min(1, 'validation:required'),
  timezone: z.string().min(1, 'validation:required'),
  currency: z.string().min(1, 'validation:required'),
});

export type UpdateAcademyProfileFormData = z.infer<
  typeof updateAcademyProfileSchema
>;

/** Academy settings schema. */
export const updateAcademySettingsSchema = z.object({
  name: z
    .string()
    .min(1, 'validation:required')
    .max(
      MAX_ACADEMY_NAME_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_ACADEMY_NAME_LENGTH,
      })
    ),
  slug: z
    .string()
    .min(1, 'validation:required')
    .max(
      MAX_ACADEMY_SLUG_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_ACADEMY_SLUG_LENGTH,
      })
    )
    .regex(SLUG_REGEX, 'validation:invalidSlug'),
  description: z
    .string()
    .max(
      MAX_ACADEMY_DESCRIPTION_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_ACADEMY_DESCRIPTION_LENGTH,
      })
    )
    .optional(),
  language: z.string().min(1, 'validation:required'),
  timezone: z.string().min(1, 'validation:required'),
  currency: z.string().min(1, 'validation:required'),
  contactEmail: z
    .string()
    .email('validation:invalidEmail')
    .optional()
    .or(z.literal('')),
  contactPhone: contactPhoneSchema,
  website: z.string().url('validation:invalidUrl').optional().or(z.literal('')),
});

export type UpdateAcademySettingsFormData = z.infer<
  typeof updateAcademySettingsSchema
>;

/** Academy branding schema. */
export const updateAcademyBrandingSchema = z.object({
  name: z
    .string()
    .min(1, 'validation:required')
    .max(
      MAX_ACADEMY_NAME_LENGTH,
      validationMessage('validation:maxLength', {
        count: MAX_ACADEMY_NAME_LENGTH,
      })
    ),
  logo: z.string().optional(),
  favicon: z.string().optional(),
});

export type UpdateAcademyBrandingFormData = z.infer<
  typeof updateAcademyBrandingSchema
>;

/**
 * Add Academy Manager schema — `email` and `name`, both always required
 * (ATO F5): the dialog no longer learns whether the address has an Atlas
 * account, so the name is always asked for; the server uses it only to
 * invite a brand-new account, and an existing account keeps its own.
 * Launch Stabilization A2: nobody chooses a password for another person —
 * the invitee sets their own through the emailed link.
 */
export const addAcademyManagerSchema = z.object({
  email: z
    .string()
    .min(1, 'validation:required')
    .email('validation:invalidEmail'),
  name: z
    .string()
    .trim()
    .min(1, 'academy:members.lookup.nameRequired')
    .min(MIN_MEMBER_NAME_LENGTH, 'academy:members.lookup.nameTooShort')
    .max(MAX_MEMBER_NAME_LENGTH, 'academy:members.lookup.nameTooLong'),
});

export type AddAcademyManagerFormData = z.infer<typeof addAcademyManagerSchema>;

/** Add Academy Instructor schema — identical shape/rationale to `addAcademyManagerSchema`. */
export const addAcademyInstructorSchema = addAcademyManagerSchema;

export type AddAcademyInstructorFormData = z.infer<
  typeof addAcademyInstructorSchema
>;

/**
 * Create Academy Student schema — the same shape as the staff dialogs:
 * email and name, both required (the name is only used for a new
 * account). Launch Stabilization A2: no password field.
 */
export const createAcademyStudentSchema = addAcademyManagerSchema;

export type CreateAcademyStudentFormData = z.infer<
  typeof createAcademyStudentSchema
>;
