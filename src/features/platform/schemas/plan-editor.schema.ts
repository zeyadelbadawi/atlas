/**
 * B8 (UX audit) V04/V09/V10/V23/V28 — the plan editor's rules, the same
 * ones the server applies (`UpdatePlanDto`, atlas-backend#108), so a value
 * the server would refuse is refused here first, with the reason and the
 * range, in the page's language:
 *
 * - price: a whole number from 1 to 1,000,000 (0 would make the plan free
 *   silently); yearly price, when set, 1 to 10,000,000 and not below one
 *   month's price; currency three letters;
 * - trial length, when set: 1 to 365 days (blank = the platform default);
 * - gifted days: blank/0 (none) or 5 to 15;
 * - every limit: a whole number of 0 or more, or Unlimited (a switch, so
 *   nobody has to type the English word); monthly emails the same, blank
 *   for the platform default.
 *
 * Digits typed in Arabic (٠–٩) count as digits. Nothing that is not a
 * number is ever sent as `null`.
 */
import { z } from 'zod';
import { normalizeDigits } from '@utils';
import { validationMessage } from '@/shared/forms/validation-message';
import type { PlanLimitKey } from '@types';
import { GIFTED_DAYS_MAX, GIFTED_DAYS_MIN } from '../utils/gifted-days.utils';

export const PLAN_PRICE_MIN = 1;
export const PLAN_PRICE_MAX = 1_000_000;
export const PLAN_YEARLY_MAX = 10_000_000;
export const TRIAL_DAYS_MIN = 1;
export const TRIAL_DAYS_MAX = 365;
export const MONTHLY_EMAILS_MAX = 10_000_000;

const WHOLE = /^\d+$/;

/** The text of a number field as the server reads it: ASCII digits, trimmed. */
export function numberText(value: string | undefined): string {
  return normalizeDigits(value ?? '').trim();
}

/** A whole number, or `null` when the text isn't one. */
export function wholeNumber(value: string | undefined): number | null {
  const text = numberText(value);
  return WHOLE.test(text) ? Number(text) : null;
}

export interface PlanEditorValues {
  amount: string;
  currency: string;
  yearlyAmount: string;
  trialEligible: boolean;
  trialDays: string;
  giftedMonthly: string;
  giftedYearly: string;
  limits: Record<string, string>;
  unlimited: Record<string, boolean>;
  monthlyEmails: string;
  monthlyEmailsUnlimited: boolean;
  features: Record<string, boolean>;
}

export interface PlanEditorSchemaOptions {
  /** Whether a price must be given (the plan already has one). */
  readonly priced: boolean;
  /** Whether the plan offers a yearly price beside its monthly one. */
  readonly offersYearly: boolean;
  readonly limitKeys: readonly PlanLimitKey[];
  /** Formats a number in the page's language ("1,000,000" in both languages). */
  readonly formatNumber: (value: number) => string;
  /** Formats an amount in the plan's currency, for the yearly floor. */
  readonly formatPrice: (value: number) => string;
}

export function planEditorSchema(options: PlanEditorSchemaOptions) {
  const n = options.formatNumber;
  const range = (min: number, max: number) =>
    validationMessage('validation:integerRange', { min: n(min), max: n(max) });

  return z
    .object({
      amount: z.string(),
      currency: z.string(),
      yearlyAmount: z.string(),
      trialEligible: z.boolean(),
      trialDays: z.string(),
      giftedMonthly: z.string(),
      giftedYearly: z.string(),
      limits: z.record(z.string()),
      unlimited: z.record(z.boolean()),
      monthlyEmails: z.string(),
      monthlyEmailsUnlimited: z.boolean(),
      features: z.record(z.boolean()),
    })
    .superRefine((values, ctx) => {
      const issue = (path: (string | number)[], message: string) =>
        ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

      // ---- price ----
      const amountText = numberText(values.amount);
      const amount = wholeNumber(values.amount);
      if (amountText === '') {
        if (options.priced) issue(['amount'], 'validation:required');
      } else if (
        amount === null ||
        amount < PLAN_PRICE_MIN ||
        amount > PLAN_PRICE_MAX
      ) {
        issue(['amount'], range(PLAN_PRICE_MIN, PLAN_PRICE_MAX));
      }
      if (
        (amountText !== '' || options.priced) &&
        !/^[A-Za-z]{3}$/.test(values.currency.trim())
      ) {
        issue(['currency'], 'platform:planAdmin.editor.currencyInvalid');
      }
      if (options.offersYearly && numberText(values.yearlyAmount) !== '') {
        const yearly = wholeNumber(values.yearlyAmount);
        if (yearly === null || yearly < 1 || yearly > PLAN_YEARLY_MAX) {
          issue(['yearlyAmount'], range(1, PLAN_YEARLY_MAX));
        } else if (amount !== null && amount > 0 && yearly < amount) {
          issue(
            ['yearlyAmount'],
            validationMessage('errors:plan.yearlyBelowMonthly', {
              min: options.formatPrice(amount),
            })
          );
        }
      }

      // ---- trial ----
      if (values.trialEligible && numberText(values.trialDays) !== '') {
        const days = wholeNumber(values.trialDays);
        if (days === null || days < TRIAL_DAYS_MIN || days > TRIAL_DAYS_MAX) {
          issue(['trialDays'], range(TRIAL_DAYS_MIN, TRIAL_DAYS_MAX));
        }
      }

      // ---- gifted days ----
      for (const field of ['giftedMonthly', 'giftedYearly'] as const) {
        const text = numberText(values[field]);
        if (text === '' || text === '0') continue;
        const days = wholeNumber(values[field]);
        if (days === null || days < GIFTED_DAYS_MIN || days > GIFTED_DAYS_MAX) {
          issue(
            [field],
            validationMessage('platform:planAdmin.editor.giftInvalid', {
              min: n(GIFTED_DAYS_MIN),
              max: n(GIFTED_DAYS_MAX),
            })
          );
        }
      }

      // ---- limits ----
      for (const key of options.limitKeys) {
        if (values.unlimited[key]) continue;
        const text = numberText(values.limits[key]);
        if (text === '') {
          issue(['limits', key], 'validation:required');
        } else if (wholeNumber(text) === null) {
          issue(
            ['limits', key],
            validationMessage('errors:plan.limitValue', { min: n(0) })
          );
        }
      }
      if (!values.monthlyEmailsUnlimited) {
        const text = numberText(values.monthlyEmails);
        if (text !== '') {
          const count = wholeNumber(text);
          if (count === null) {
            issue(
              ['monthlyEmails'],
              validationMessage('errors:plan.limitValue', { min: n(0) })
            );
          } else if (count > MONTHLY_EMAILS_MAX) {
            issue(['monthlyEmails'], range(0, MONTHLY_EMAILS_MAX));
          }
        }
      }
    });
}
