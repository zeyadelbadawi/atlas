/**
 * Platform commerce form schemas.
 *
 * Mirrors the backend DTOs so a request the form accepts is one the API
 * accepts: review-notes length bounds (`billing.constants.ts`), the
 * payout DTO (`academyId` + two ISO dates, end after start — the service
 * returns 409 `invalidPeriod` otherwise), and the 0..10000 bp integer
 * range every commission DTO enforces. Messages are translation keys.
 */
import { z } from 'zod';
import {
  MAX_BASIS_POINTS,
  percentToBasisPoints,
} from '../utils/commission.utils';

/** Backend `MIN_PAYMENT_REJECTION_NOTES_LENGTH` / `MAX_PAYMENT_REVIEW_NOTES_LENGTH`. */
export const MIN_REJECTION_NOTES_LENGTH = 10;
export const MAX_REVIEW_NOTES_LENGTH = 1000;
/** Backend `MarkAcademyPayoutPaidDto.providerReference` `@MaxLength(255)`. */
export const MAX_PROVIDER_REFERENCE_LENGTH = 255;

export const approveCourseOrderPaymentSchema = z.object({
  notes: z
    .string()
    .max(MAX_REVIEW_NOTES_LENGTH, 'platformCommerce:validation.notesTooLong'),
});
export type ApproveCourseOrderPaymentFormData = z.infer<
  typeof approveCourseOrderPaymentSchema
>;

export const rejectCourseOrderPaymentSchema = z.object({
  notes: z
    .string()
    .trim()
    .min(
      MIN_REJECTION_NOTES_LENGTH,
      'platformCommerce:validation.rejectNotesTooShort'
    )
    .max(MAX_REVIEW_NOTES_LENGTH, 'platformCommerce:validation.notesTooLong'),
});
export type RejectCourseOrderPaymentFormData = z.infer<
  typeof rejectCourseOrderPaymentSchema
>;

/** `YYYY-MM-DD` from an `<input type="date">`. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const createPayoutSchema = z
  .object({
    academyId: z
      .string()
      .trim()
      .min(1, 'platformCommerce:validation.academyRequired'),
    periodStart: z
      .string()
      .regex(DATE_ONLY, 'platformCommerce:validation.dateRequired'),
    periodEnd: z
      .string()
      .regex(DATE_ONLY, 'platformCommerce:validation.dateRequired'),
  })
  .refine((value) => value.periodEnd > value.periodStart, {
    path: ['periodEnd'],
    message: 'platformCommerce:validation.periodEndAfterStart',
  });
export type CreatePayoutFormData = z.infer<typeof createPayoutSchema>;

/**
 * Converts the form's calendar dates to the ISO instants the backend
 * compares against ledger `occurredAt`: the start of the first day and the
 * END of the last day, both UTC, so "1 Sep – 30 Sep" includes the whole of
 * 30 September rather than stopping at its midnight.
 */
export function toPayoutPeriod(form: CreatePayoutFormData): {
  periodStart: string;
  periodEnd: string;
} {
  return {
    periodStart: `${form.periodStart}T00:00:00.000Z`,
    periodEnd: `${form.periodEnd}T23:59:59.999Z`,
  };
}

export const markPayoutPaidSchema = z.object({
  providerReference: z
    .string()
    .trim()
    .max(
      MAX_PROVIDER_REFERENCE_LENGTH,
      'platformCommerce:validation.referenceTooLong'
    ),
});
export type MarkPayoutPaidFormData = z.infer<typeof markPayoutPaidSchema>;

/**
 * A percentage typed by a person: 0–100, at most two decimals (bp
 * precision). Kept as a string in the form so an empty field is
 * distinguishable from 0 and the input never fights the user's typing.
 */
export const percentageField = z
  .string()
  .trim()
  .min(1, 'platformCommerce:validation.percentRequired')
  .regex(/^\d{1,3}(\.\d{1,2})?$/, 'platformCommerce:validation.percentFormat')
  .refine(
    (value) => {
      const bp = percentToBasisPoints(Number(value));
      return bp >= 0 && bp <= MAX_BASIS_POINTS;
    },
    { message: 'platformCommerce:validation.percentRange' }
  );

export const commissionRateSchema = z.object({ percent: percentageField });
export type CommissionRateFormData = z.infer<typeof commissionRateSchema>;

export const organizationCommissionSchema = z
  .object({
    commissionMode: z.enum(['default', 'custom', 'exempt']),
    percent: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    if (value.commissionMode !== 'custom') return;
    const result = percentageField.safeParse(value.percent);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['percent'],
        message:
          result.error.issues[0]?.message ??
          'platformCommerce:validation.percentFormat',
      });
    }
  });
export type OrganizationCommissionFormData = z.infer<
  typeof organizationCommissionSchema
>;
