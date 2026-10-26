/**
 * B2 — Founding Academies presentation helpers. Status is always words
 * (`StatusBadge`); the tone only reinforces it.
 */
import type { StatusTone } from '@components/data-display';
import type { LanguageCode } from '@types';
import { formatCurrency } from '@utils';
import type {
  FoundingMoney,
  FoundingPlanRef,
  FoundingStatus,
} from '../services/PlatformFoundingService';

export const FOUNDING_K = 'platform:founding';

export const FOUNDING_STATUSES: readonly FoundingStatus[] = [
  'active',
  'ended',
  'revoked',
];

export function foundingStatusTone(status: FoundingStatus): StatusTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'revoked':
      return 'destructive';
    default:
      return 'neutral';
  }
}

export function foundingPlanName(
  plan: FoundingPlanRef,
  language: string
): string {
  const lang = language.startsWith('ar') ? 'ar' : 'en';
  return plan.nameLocalized?.[lang] || plan.name;
}

export function foundingMoney(money: FoundingMoney, language: string): string {
  return formatCurrency(
    money.amount,
    (language.startsWith('ar') ? 'ar' : 'en') as LanguageCode,
    money.currency,
    { maximumFractionDigits: 0 }
  );
}

const KNOWN_ACTIONS = new Set([
  'created',
  'updated',
  'plan_changed',
  'revoked',
  'ended',
  'emailed',
  'renewal_price_notice_sent',
]);

/** `platform.founding.plan_changed` → its timeline label key, or `null` for an unknown action. */
export function foundingTimelineKey(action: string): string | null {
  const suffix = action.replace(/^platform\.founding\./, '');
  return KNOWN_ACTIONS.has(suffix)
    ? `${FOUNDING_K}.timeline.actions.${suffix}`
    : null;
}

/** A filename-safe CSV download in the browser. */
export function downloadCsv(name: string, text: string): void {
  const blob = new Blob([`${String.fromCharCode(0xfeff)}${text}`], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
