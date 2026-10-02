/**
 * A small icon button that copies one value — the same pattern as the
 * domain DNS records' copy buttons (`useCopyToClipboard`), with a polite
 * live region so screen readers hear that the copy worked.
 */
import { useTranslation } from 'react-i18next';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCopyToClipboard } from '@hooks';

export interface CopyValueButtonProps {
  readonly value: string;
  /** Accessible name, e.g. "Copy wallet number". */
  readonly label: string;
  readonly testId?: string;
}

export function CopyValueButton({
  value,
  label,
  testId,
}: CopyValueButtonProps): JSX.Element {
  const { t } = useTranslation();
  const { hasCopied, copy } = useCopyToClipboard();
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        aria-label={label}
        data-testid={testId}
        onClick={() => void copy(value)}
      >
        {hasCopied ? (
          <Check className="size-3.5 text-success" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {hasCopied ? t('common:actions.copied') : ''}
      </span>
    </>
  );
}
