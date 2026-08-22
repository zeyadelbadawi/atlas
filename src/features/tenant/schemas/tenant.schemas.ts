/**
 * Tenant SaaS validation schemas.
 *
 * All Tenant/Platform-admin forms use Zod, consistent with the existing
 * Atlas form infrastructure.
 */
import { z } from 'zod';

/**
 * Trial Policy update schema (Platform Owner only).
 *
 * Deliberately does not require `durationDays > 0` when `enabled` is true —
 * that would be inventing a business constraint the domain doesn't state.
 * `durationDays` only needs to be a valid non-negative integer; `0` is a
 * legitimate value regardless of `enabled` (see `TrialPolicy`'s doc comment).
 */
export const updateTrialPolicySchema = z.object({
  enabled: z.boolean(),
  durationDays: z
    .number({ invalid_type_error: 'validation:number' })
    .int('validation:integer')
    .min(0, 'validation:min'),
});

export type UpdateTrialPolicyFormData = z.infer<typeof updateTrialPolicySchema>;
