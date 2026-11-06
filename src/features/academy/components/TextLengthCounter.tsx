/**
 * B4 (UX audit) — "120 / 500 characters" under a limited text field, so
 * the limit is known before it is hit and nothing is cut silently. Turns
 * red past the limit; the field's own message says what to do.
 */
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';

export interface TextLengthCounterProps {
  readonly id?: string;
  readonly length: number;
  readonly max: number;
  readonly className?: string;
}

export function TextLengthCounter({
  id,
  length,
  max,
  className,
}: TextLengthCounterProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <p
      id={id}
      className={cn(
        'text-xs tabular-nums',
        length > max ? 'font-medium text-destructive' : 'text-muted-foreground',
        className
      )}
      data-testid={id ? `${id}` : undefined}
    >
      {t('common:form.characterCount', { count: length, max })}
    </p>
  );
}
