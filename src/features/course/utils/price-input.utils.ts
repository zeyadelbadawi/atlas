/**
 * B3 (UX audit, V02/V14) — reading a course price the author typed.
 *
 * The price used to be an `<input type="number">` read with
 * `z.coerce.number()`, and three wrong inputs became wrong prices without
 * a word: "0.001" was accepted and stored as 0 (the API keeps minor
 * units), "12,50" reached the API as 1,250 and "1e3" as 1,000. Nothing
 * capped the amount either.
 *
 * Now the field is plain text with a decimal keyboard, and this is the one
 * place that turns it into an amount — or into the reason it is not one:
 *   - digits with at most one decimal separator: "12.50", "12,50" (a
 *     decimal comma reads as a point), Arabic-Indic digits and "٫";
 *   - at most two decimal places — sub-unit precision is refused, never
 *     rounded away;
 *   - no exponent, sign, thousands separator or other characters;
 *   - at most {@link MAX_COURSE_PRICE}.
 *
 * The backend pricing DTO (`CoursePricingInputDto`) has `@IsPositive()`
 * and no upper bound, so the maximum is the dashboard's own:
 * 1,000,000 in the course's currency.
 */
import { validationMessage } from '@/shared/forms/validation-message';

/** The highest price a course can be given here (no backend limit exists). */
export const MAX_COURSE_PRICE = 1_000_000;

/** Decimal places a price may carry (currencies Atlas sells in use 2). */
export const MAX_COURSE_PRICE_DECIMALS = 2;

export type PriceInputResult =
  | { readonly kind: 'empty' }
  | { readonly kind: 'ok'; readonly value: number }
  | { readonly kind: 'error'; readonly message: string };

/** Arabic-Indic and Extended Arabic-Indic digits → 0-9; "٫" → "."; "٬" stays (it is a thousands mark). */
function toLatinDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.');
}

/** The amount in `raw`, or why it is not a price. Numbers pass through the same checks. */
export function parsePriceInput(raw: unknown): PriceInputResult {
  if (raw === undefined || raw === null) return { kind: 'empty' };
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) {
      return { kind: 'error', message: 'course:validation.priceFormat' };
    }
    return parsePriceInput(String(raw));
  }
  if (typeof raw !== 'string') {
    return { kind: 'error', message: 'course:validation.priceFormat' };
  }

  const text = toLatinDigits(raw).trim();
  if (text === '') return { kind: 'empty' };

  // One separator only: "12.50" or "12,50". "1,250.00", "1.250,00",
  // "1e3", "-5", "+5", "12.5.0", "abc" are all refused as a format.
  const match = /^(\d+)(?:[.,](\d*))?$/.exec(text);
  if (!match) {
    return { kind: 'error', message: 'course:validation.priceFormat' };
  }
  const [, whole, fraction = ''] = match;
  if (fraction.length > MAX_COURSE_PRICE_DECIMALS) {
    return {
      kind: 'error',
      message: validationMessage('course:validation.priceDecimals', {
        count: MAX_COURSE_PRICE_DECIMALS,
      }),
    };
  }
  const value = Number(`${whole}.${fraction || '0'}`);
  if (value > MAX_COURSE_PRICE) {
    return {
      kind: 'error',
      message: validationMessage('course:validation.priceTooHigh', {
        max: MAX_COURSE_PRICE.toLocaleString('en-US'),
      }),
    };
  }
  return { kind: 'ok', value };
}

/** The amount to send, or `undefined` for a blank or invalid entry (the schema has refused those already). */
export function priceAmountFromInput(raw: unknown): number | undefined {
  const result = parsePriceInput(raw);
  return result.kind === 'ok' ? result.value : undefined;
}

/** A stored amount as the text the price field shows ("12.5" → "12.50"). */
export function priceInputFromAmount(amount: number | undefined): string {
  if (amount === undefined || amount === null || !Number.isFinite(amount)) {
    return '';
  }
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

/**
 * The pricing rule every course form shares: a paid course needs a valid
 * price above zero ("0.00" included), with the message for what is wrong.
 * A free course ignores whatever the hidden price field still holds.
 */
export function pricingIssue(data: {
  readonly pricingType: 'free' | 'paid';
  readonly pricingAmount?: unknown;
}): string | null {
  if (data.pricingType !== 'paid') return null;
  const result = parsePriceInput(data.pricingAmount);
  if (result.kind === 'error') return result.message;
  if (result.kind === 'empty' || result.value <= 0) {
    return 'course:validation.priceRequired';
  }
  return null;
}
