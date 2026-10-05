/**
 * How each academy payment method is named and drawn — the ONE place the
 * settings page, the setup form, the review page and the learner pages
 * read it from. Icons are decorative (`aria-hidden`); the label always
 * carries the meaning.
 */
import { Landmark, type LucideIcon } from 'lucide-react';
import { MANUAL_METHOD_ICONS } from '@features/billing';
import type { AcademyPaymentMethodType } from '@types';

export interface AcademyPaymentMethodMeta {
  readonly type: AcademyPaymentMethodType;
  readonly icon: LucideIcon;
  /** `payments:common.methodType.<type>` holds the name. */
  readonly labelKey: string;
  readonly descriptionKey: string;
  readonly testId: string;
}

export const ACADEMY_PAYMENT_METHOD_META: readonly AcademyPaymentMethodMeta[] =
  [
    {
      type: 'manual_bank_transfer',
      icon: MANUAL_METHOD_ICONS.manual_bank_transfer ?? Landmark,
      labelKey: 'payments:common.methodType.manual_bank_transfer',
      descriptionKey: 'payments:academyMethods.types.manual_bank_transfer',
      testId: 'academy-method-bank',
    },
    {
      type: 'manual_instapay',
      icon: MANUAL_METHOD_ICONS.manual_instapay ?? Landmark,
      labelKey: 'payments:common.methodType.manual_instapay',
      descriptionKey: 'payments:academyMethods.types.manual_instapay',
      testId: 'academy-method-instapay',
    },
    {
      type: 'manual_wallet_transfer',
      icon: MANUAL_METHOD_ICONS.manual_wallet_transfer ?? Landmark,
      labelKey: 'payments:common.methodType.manual_wallet_transfer',
      descriptionKey: 'payments:academyMethods.types.manual_wallet_transfer',
      testId: 'academy-method-wallet',
    },
  ];

export function academyPaymentMethodMeta(
  type: string
): AcademyPaymentMethodMeta | undefined {
  return ACADEMY_PAYMENT_METHOD_META.find((meta) => meta.type === type);
}
