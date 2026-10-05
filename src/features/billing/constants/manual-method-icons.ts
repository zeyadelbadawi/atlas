/**
 * The icon beside each manual method wherever one is listed (checkout, the
 * academy setup form, the academy's payment pages). Decorative only: the
 * method's name always carries the meaning (`aria-hidden` at every use).
 */
import { Landmark, Smartphone, Zap, type LucideIcon } from 'lucide-react';
import type { PaymentMethodType } from '@types';

export const MANUAL_METHOD_ICONS: Partial<
  Record<PaymentMethodType, LucideIcon>
> = {
  manual_bank_transfer: Landmark,
  manual_instapay: Zap,
  manual_wallet_transfer: Smartphone,
};
