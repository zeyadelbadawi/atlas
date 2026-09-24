/**
 * Platform Settings validation schemas.
 */
import { z } from 'zod';

export const generalSettingsSchema = z.object({
  platformName: z.string().min(1, 'settings:general.platformNameRequired'),
  platformDescription: z.string().optional(),
  supportEmail: z
    .string()
    .email('validation:email')
    .optional()
    .or(z.literal('')),
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
