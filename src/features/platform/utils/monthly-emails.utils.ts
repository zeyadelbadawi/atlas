/**
 * W3-compose — the plan editor's optional `monthlyEmails` limit: how many
 * emails each academy may send from Messages per calendar month (UTC).
 *
 * Optional on purpose: a plan saved without it keeps the platform default
 * (`DEFAULT_MONTHLY_EMAILS`), which the server applies — never "unlimited".
 */
import type { PlanResourceLimits } from '@types';
import { UNLIMITED } from './plan-limit-changes.utils';

export const DEFAULT_MONTHLY_EMAILS = 50;
const MAX_MONTHLY_EMAILS = 10_000_000;

/** Blank (platform default), `unlimited`, or a whole number from 0. */
export function isValidMonthlyEmailsInput(value: string): boolean {
  const raw = value.trim();
  if (raw === '' || raw === UNLIMITED) return true;
  if (!/^\d+$/.test(raw)) return false;
  return Number(raw) <= MAX_MONTHLY_EMAILS;
}

/** The limits payload with `monthlyEmails` added when the field is set. */
export function withMonthlyEmails(
  limits: PlanResourceLimits,
  value: string
): PlanResourceLimits {
  const raw = value.trim();
  if (raw === '' || !isValidMonthlyEmailsInput(raw)) return limits;
  return {
    ...limits,
    monthlyEmails: raw === UNLIMITED ? UNLIMITED : Number(raw),
  };
}
