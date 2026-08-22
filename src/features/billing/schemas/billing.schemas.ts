/**
 * Billing & Payment validation schemas.
 */
import { z } from 'zod';
import {
  MAX_PAYMENT_PROOF_NOTE_LENGTH,
  MAX_PAYMENT_REVIEW_NOTES_LENGTH,
  MIN_PAYMENT_REJECTION_NOTES_LENGTH,
} from '../constants/billing.constants';

/** Optional free-text reference note submitted alongside payment proof. */
export const submitPaymentProofSchema = z.object({
  note: z
    .string()
    .max(MAX_PAYMENT_PROOF_NOTE_LENGTH, 'validation:maxLength')
    .optional(),
});

export type SubmitPaymentProofFormData = z.infer<typeof submitPaymentProofSchema>;

/** Approval notes are optional — an approval is usually self-explanatory. */
export const approvePaymentSchema = z.object({
  notes: z
    .string()
    .max(MAX_PAYMENT_REVIEW_NOTES_LENGTH, 'validation:maxLength')
    .optional(),
});

export type ApprovePaymentFormData = z.infer<typeof approvePaymentSchema>;

/** Rejection notes are required and must be actionable — the Tenant needs to know what to fix. */
export const rejectPaymentSchema = z.object({
  notes: z
    .string()
    .min(MIN_PAYMENT_REJECTION_NOTES_LENGTH, 'validation:minLength')
    .max(MAX_PAYMENT_REVIEW_NOTES_LENGTH, 'validation:maxLength'),
});

export type RejectPaymentFormData = z.infer<typeof rejectPaymentSchema>;
