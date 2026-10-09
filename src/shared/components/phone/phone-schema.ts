/**
 * Zod refinement for a `phoneNumber` + `phoneCountry` pair in a form schema.
 * Messages are translation keys (`common:phone.errors.*`), as elsewhere in
 * the app's schemas.
 */
import { z } from 'zod';
import { checkPhone } from './phone-number';
import type { PhoneIssue } from './phone-number';

export const PHONE_ERROR_KEYS: Readonly<Record<PhoneIssue, string>> = {
  required: 'common:phone.errors.required',
  invalid: 'common:phone.errors.invalid',
  countryMismatch: 'common:phone.errors.countryMismatch',
  invalidCountry: 'common:phone.errors.country',
};

export function refinePhone(
  data: { readonly phoneNumber?: string; readonly phoneCountry?: string },
  context: z.RefinementCtx,
  options: { readonly required: boolean }
): void {
  const number = data.phoneNumber ?? '';
  if (!options.required && number.trim() === '') return;
  const check = checkPhone(number, data.phoneCountry ?? '');
  if (check.ok) return;
  context.addIssue({
    code: z.ZodIssueCode.custom,
    path: [check.issue === 'invalidCountry' ? 'phoneCountry' : 'phoneNumber'],
    message: PHONE_ERROR_KEYS[check.issue],
  });
}
