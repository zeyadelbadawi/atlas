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
} from '../constants/academy.constants';

/** Slug validation regex: lowercase letters, numbers, hyphens. */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Academy creation schema. */
export const createAcademySchema = z.object({
  name: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_ACADEMY_NAME_LENGTH, 'validation:maxLength'),
  slug: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_ACADEMY_SLUG_LENGTH, 'validation:maxLength')
    .regex(SLUG_REGEX, 'validation:invalidSlug'),
  description: z
    .string()
    .max(MAX_ACADEMY_DESCRIPTION_LENGTH, 'validation:maxLength')
    .optional(),
  contactEmail: z.string().email('validation:invalidEmail').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
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
    .max(MAX_ACADEMY_NAME_LENGTH, 'validation:maxLength'),
  slug: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_ACADEMY_SLUG_LENGTH, 'validation:maxLength')
    .regex(SLUG_REGEX, 'validation:invalidSlug'),
  description: z
    .string()
    .max(MAX_ACADEMY_DESCRIPTION_LENGTH, 'validation:maxLength')
    .optional(),
  contactEmail: z.string().email('validation:invalidEmail').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  website: z.string().url('validation:invalidUrl').optional().or(z.literal('')),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
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
    .max(MAX_ACADEMY_NAME_LENGTH, 'validation:maxLength'),
  slug: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_ACADEMY_SLUG_LENGTH, 'validation:maxLength')
    .regex(SLUG_REGEX, 'validation:invalidSlug'),
  description: z
    .string()
    .max(MAX_ACADEMY_DESCRIPTION_LENGTH, 'validation:maxLength')
    .optional(),
  status: z.enum(['draft', 'active', 'suspended', 'archived']),
  language: z.string().min(1, 'validation:required'),
  timezone: z.string().min(1, 'validation:required'),
  currency: z.string().min(1, 'validation:required'),
  contactEmail: z.string().email('validation:invalidEmail').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
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
    .max(MAX_ACADEMY_NAME_LENGTH, 'validation:maxLength'),
  logo: z.string().optional(),
  favicon: z.string().optional(),
});

export type UpdateAcademyBrandingFormData = z.infer<
  typeof updateAcademyBrandingSchema
>;

/**
 * Add Academy Manager schema — `email` alone grants access to an
 * already-registered Atlas account; filling in `name` + `password`
 * together creates a brand-new account and grants it in the same action
 * (no invitation flow exists). Both new-account fields must be provided
 * together, or neither.
 */
export const addAcademyManagerSchema = z
  .object({
    email: z.string().min(1, 'validation:required').email('validation:invalidEmail'),
    name: z.string().max(MAX_ACADEMY_NAME_LENGTH, 'validation:maxLength').optional().or(z.literal('')),
    password: z.string().optional().or(z.literal('')),
  })
  .refine((data) => !data.password || data.password.length >= 8, {
    message: 'validation:minLength',
    path: ['password'],
  })
  .refine((data) => (!data.name && !data.password) || (!!data.name && !!data.password), {
    message: 'academy:members.newAccount.bothRequired',
    path: ['password'],
  });

export type AddAcademyManagerFormData = z.infer<typeof addAcademyManagerSchema>;

/** Add Academy Instructor schema — identical shape/rationale to `addAcademyManagerSchema`. */
export const addAcademyInstructorSchema = addAcademyManagerSchema;

export type AddAcademyInstructorFormData = z.infer<typeof addAcademyInstructorSchema>;

/** Create Academy Student schema — always a brand-new account, so all three fields are required. */
export const createAcademyStudentSchema = z.object({
  name: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_ACADEMY_NAME_LENGTH, 'validation:maxLength'),
  email: z.string().min(1, 'validation:required').email('validation:invalidEmail'),
  password: z.string().min(8, 'validation:minLength'),
});

export type CreateAcademyStudentFormData = z.infer<typeof createAcademyStudentSchema>;