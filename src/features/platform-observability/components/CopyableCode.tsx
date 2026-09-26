/** A monospace, left-to-right code block with a copy button. */
import { useTranslation } from 'react-i18next';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCopyToClipboard } from '@hooks';

export function CopyableCode({
  code,
  label,
}: {
  readonly code: string;
  /** Accessible name of the block, e.g. "Expression". */
  readonly label: string;
}): JSX.Element {
  const { t } = useTranslation();
  const { hasCopied, copy } = useCopyToClipboard();
  return (
    <div className="relative rounded-md border border-border bg-muted/50">
      <pre
        dir="ltr"
        aria-label={label}
        tabIndex={0}
        className="overflow-x-auto whitespace-pre-wrap break-words p-3 pe-12 font-mono text-xs leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <code>{code}</code>
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute end-1 top-1 size-8"
        onClick={() => void copy(code)}
        aria-label={t('platformObservability:rule.copyExpression')}
      >
        {hasCopied ? (
          <Check className="size-4 text-success" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {hasCopied ? t('platformObservability:rule.copied') : ''}
      </span>
    </div>
  );
}
