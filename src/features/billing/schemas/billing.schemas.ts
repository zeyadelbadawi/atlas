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

export type SubmitPaymentProofFormData = z.infer<
  typeof submitPaymentProofSchema
>;

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

/*
 * A Platform Owner's bank-transfer method (`/platform-payment-methods`).
 * Mirrors `platform-payment-method.dto.ts` exactly — length limits and the
 * three patterns — so a value the server would refuse is refused here
 * first. Values are trimmed, as the server stores them. Field paths are
 * nested under `instructions` like the request body, so a server violation
 * (`instructions.iban`) lands on the right field through
 * `useServerValidation`.
 */
const BANK_FIELD_REQUIRED = 'payments:bankTransferMethods.validation.required';
const BANK_FIELD_TOO_LONG = 'payments:bankTransferMethods.validation.tooLong';

/** `/^[A-Za-z0-9 -]+$/` — letters, digits, spaces and hyphens. */
export const BANK_ACCOUNT_NUMBER_PATTERN = /^[A-Za-z0-9 -]+$/;
/** ISO 13616: two letters, two check digits, then 10–32 letters/digits (spaces allowed). */
export const IBAN_PATTERN = /^[A-Za-z]{2}[0-9]{2}[A-Za-z0-9 ]{10,32}$/;
/** SWIFT/BIC: 8 or 11 characters. */
export const SWIFT_CODE_PATTERN =
  /^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/;

function requiredText(max: number) {
  return z
    .string()
    .trim()
    .min(1, BANK_FIELD_REQUIRED)
    .max(max, BANK_FIELD_TOO_LONG);
}

function optionalPattern(pattern: RegExp, message: string) {
  return z
    .string()
    .trim()
    .refine((value) => value === '' || pattern.test(value), { message });
}

export const bankTransferMethodSchema = z.object({
  displayName: requiredText(80),
  description: z.string().trim().max(300, BANK_FIELD_TOO_LONG),
  instructions: z.object({
    bankName: requiredText(120),
    accountName: requiredText(120),
    accountNumber: requiredText(64).refine(
      (value) => BANK_ACCOUNT_NUMBER_PATTERN.test(value),
      { message: 'validation:invalidAccountNumber' }
    ),
    iban: optionalPattern(IBAN_PATTERN, 'validation:invalidIban'),
    swiftCode: optionalPattern(SWIFT_CODE_PATTERN, 'validation:invalidSwift'),
    instructions: requiredText(2000),
    referenceInstructions: requiredText(1000),
  }),
});

export type BankTransferMethodFormData = z.infer<
  typeof bankTransferMethodSchema
>;
