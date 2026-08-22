/**
 * Reusable validation primitives.
 *
 * Validation messages are translation keys, never literal text, so a form error
 * reads correctly in Arabic and English. Features compose these primitives into
 * their own schemas rather than redefining common rules.
 */
import { z } from 'zod';

/** Message keys consumed by the field-error renderer. */
export const VALIDATION_MESSAGE_KEYS = {
  required: 'validation:required',
  invalid: 'validation:invalid',
  email: 'validation:email',
  url: 'validation:url',
  minLength: 'validation:minLength',
  maxLength: 'validation:maxLength',
  min: 'validation:min',
  max: 'validation:max',
  pattern: 'validation:pattern',
  mustMatch: 'validation:mustMatch',
  number: 'validation:number',
  integer: 'validation:integer',
  date: 'validation:date',
} as const;

/** A required, trimmed text field. */
export function requiredText(options?: {
  readonly minLength?: number;
  readonly maxLength?: number;
}) {
  let schema = z
    .string({ required_error: VALIDATION_MESSAGE_KEYS.required })
    .trim()
    .min(1, VALIDATION_MESSAGE_KEYS.required);

  if (options?.minLength !== undefined) {
    schema = schema.min(options.minLength, VALIDATION_MESSAGE_KEYS.minLength);
  }

  if (options?.maxLength !== undefined) {
    schema = schema.max(options.maxLength, VALIDATION_MESSAGE_KEYS.maxLength);
  }

  return schema;
}

/** An optional text field. Empty input is normalised to `undefined`. */
export function optionalText(maxLength?: number) {
  const base = z.string().trim();
  const bounded =
    maxLength === undefined
      ? base
      : base.max(maxLength, VALIDATION_MESSAGE_KEYS.maxLength);

  return bounded
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));
}

/** A required email address, lowercased for consistent storage. */
export const emailSchema = z
  .string({ required_error: VALIDATION_MESSAGE_KEYS.required })
  .trim()
  .min(1, VALIDATION_MESSAGE_KEYS.required)
  .email(VALIDATION_MESSAGE_KEYS.email)
  .toLowerCase();

/** A required absolute URL. */
export const urlSchema = z
  .string({ required_error: VALIDATION_MESSAGE_KEYS.required })
  .trim()
  .min(1, VALIDATION_MESSAGE_KEYS.required)
  .url(VALIDATION_MESSAGE_KEYS.url);

/** A numeric field bounded by an inclusive range. */
export function numberInRange(minimum: number, maximum: number) {
  return z
    .number({
      required_error: VALIDATION_MESSAGE_KEYS.required,
      invalid_type_error: VALIDATION_MESSAGE_KEYS.number,
    })
    .min(minimum, VALIDATION_MESSAGE_KEYS.min)
    .max(maximum, VALIDATION_MESSAGE_KEYS.max);
}

/** A required ISO-8601 date string. */
export const isoDateSchema = z
  .string({ required_error: VALIDATION_MESSAGE_KEYS.required })
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    VALIDATION_MESSAGE_KEYS.date
  );

/** A checkbox that must be checked, such as accepting terms. */
export const mustBeAcceptedSchema = z
  .boolean()
  .refine((value) => value, VALIDATION_MESSAGE_KEYS.required);