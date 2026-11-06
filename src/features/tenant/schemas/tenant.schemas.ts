/**
 * Tenant SaaS validation schemas.
 *
 * All Tenant/Platform-admin forms use Zod, consistent with the existing
 * Atlas form infrastructure.
 */
import { z } from 'zod';
import { validationMessage } from '@/shared/forms/validation-message';
import { normalizeDigits } from '@/shared/utils/number.utils';

/** Trial Policy update schema (Platform Owner only). */
export const TRIAL_POLICY_DAYS_MIN = 1;
export const TRIAL_POLICY_DAYS_MAX = 365;

/**
 * B8 (UX audit) V23 — a whole number of days from 1 to 365, the server's
 * own range (`UpdateTrialPolicyDto`, atlas-backend#108): 0 gave every new
 * organization a trial that ended at once, and there was no ceiling.
 * Turning trials off is what `enabled` is for. The field is text so empty,
 * "abc" and "2.5" get the same clear message; Arabic digits count.
 */
export const updateTrialPolicySchema = z.object({
  enabled: z.boolean(),
  durationDays: z
    .string()
    .transform((value) => normalizeDigits(value).trim())
    .refine(
      (value) =>
        /^\d+$/.test(value) &&
        Number(value) >= TRIAL_POLICY_DAYS_MIN &&
        Number(value) <= TRIAL_POLICY_DAYS_MAX,
      validationMessage('tenant:platformAdmin.trialPolicy.durationDaysRange', {
        min: TRIAL_POLICY_DAYS_MIN,
        max: TRIAL_POLICY_DAYS_MAX,
      })
    ),
});

export type UpdateTrialPolicyFormData = z.input<typeof updateTrialPolicySchema>;
