/**
 * Text-only brand chip for an e-wallet provider or InstaPay.
 *
 * The provider's name in a neutral chip — no fabricated or downloaded logo,
 * and no unrelated icon standing in for one. Official assets are pending
 * verification; when one is added to `manual-payment-brands.ts` it is shown
 * beside the name here, and nowhere else needs to change.
 */
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';
import type { ManualPaymentInstructions } from '@types';
import {
  isArabicLanguage,
  manualProviderDisplayName,
  manualProviderLogo,
} from '../utils/manual-payment-method.utils';

export interface ManualPaymentBrandChipProps {
  readonly instructions: ManualPaymentInstructions | undefined;
  readonly className?: string;
  readonly testId?: string;
}

/** Renders nothing for bank transfer, or when a wallet has no provider name at all. */
export function ManualPaymentBrandChip({
  instructions,
  className,
  testId,
}: ManualPaymentBrandChipProps): JSX.Element | null {
  const { i18n } = useTranslation();
  const name = manualProviderDisplayName(instructions, i18n.language);
  if (!name) return null;
  const logo = manualProviderLogo(instructions);
  return (
    <span
      data-testid={testId}
      lang={isArabicLanguage(i18n.language) ? 'ar' : undefined}
      dir="auto"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-semibold text-foreground',
        className
      )}
    >
      {logo ? <img src={logo} alt="" className="size-4" aria-hidden /> : null}
      {name}
    </span>
  );
}
