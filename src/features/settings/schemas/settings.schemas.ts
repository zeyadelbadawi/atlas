/**
 * Platform Settings validation schemas.
 */
import { z } from 'zod';
import { validationMessage } from '@/shared/forms/validation-message';

/**
 * B1 (UX audit, V18) — the backend's limits (`UpdatePlatformSettingsDto`:
 * `MAX_PLATFORM_NAME_LENGTH`, `MAX_PLATFORM_DESCRIPTION_LENGTH`), checked
 * before sending and named in the message, instead of a 400 that only
 * ever said "Unexpected error".
 */
export const PLATFORM_NAME_MAX_LENGTH = 100;
export const PLATFORM_DESCRIPTION_MAX_LENGTH = 500;

export const generalSettingsSchema = z.object({
  platformName: z
    .string()
    .trim()
    .min(1, 'settings:general.platformNameRequired')
    .max(
      PLATFORM_NAME_MAX_LENGTH,
      validationMessage('validation:maxLength', {
        count: PLATFORM_NAME_MAX_LENGTH,
      })
    ),
  platformDescription: z
    .string()
    .max(
      PLATFORM_DESCRIPTION_MAX_LENGTH,
      validationMessage('validation:maxLength', {
        count: PLATFORM_DESCRIPTION_MAX_LENGTH,
      })
    )
    .optional(),
  // Optional: empty is allowed, anything else must be an address.
  supportEmail: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || z.string().email().safeParse(value).success,
      'validation:email'
    )
    .optional(),
});

export type GeneralSettingsFormData = z.infer<typeof generalSettingsSchema>;

/**
 * P66 — the Communications tab. Ranges mirror the backend's: trusted
 * device windows 1–365 days, digest hour 0–23 local, quota thresholds
 * as whole percentages 1–100 with no duplicates.
 */
export const EMAIL_OTP_POLICY_VALUES = ['new_device', 'always', 'off'] as const;

const wholeNumberInRange = (min: number, max: number, messageKey: string) =>
  z.coerce
    .number({ invalid_type_error: messageKey })
    .int(messageKey)
    .min(min, messageKey)
    .max(max, messageKey);

export const communicationSettingsSchema = z.object({
  emailOtpPolicyManagement: z.enum(EMAIL_OTP_POLICY_VALUES),
  emailOtpPolicyAcademyDefault: z.enum(EMAIL_OTP_POLICY_VALUES),
  trustedDeviceDaysManagement: wholeNumberInRange(
    1,
    365,
    'settings:communications.errors.trustedDeviceDays'
  ),
  trustedDeviceDaysAcademy: wholeNumberInRange(
    1,
    365,
    'settings:communications.errors.trustedDeviceDays'
  ),
  digestHourLocal: wholeNumberInRange(
    0,
    23,
    'settings:communications.errors.digestHour'
  ),
  quotaAlertThresholds: z
    .array(z.number().int().min(1).max(100))
    .min(1, 'settings:communications.errors.quotaThresholdsRequired')
    .refine((values) => new Set(values).size === values.length, {
      message: 'settings:communications.errors.quotaThresholdsUnique',
    }),
});

export type CommunicationSettingsFormData = z.infer<
  typeof communicationSettingsSchema
>;
