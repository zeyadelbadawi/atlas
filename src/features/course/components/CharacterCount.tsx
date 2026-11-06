/**
 * B3 (UX audit, V20) — the live length of a long text field against its
 * limit, so the limit is known before Save ("124 / 5000 characters"). It
 * turns red past the limit; the field's own message still explains it.
 * The numbers are bidi-isolated so "124 / 5000" never reads backwards on
 * an Arabic page.
 */
import { useTranslation } from 'react-i18next';
import { cn, isolateNumericExpression } from '@utils';

export interface CharacterCountProps {
  readonly id?: string;
  readonly length: number;
  readonly max: number;
  readonly className?: string;
}

export function CharacterCount({
  id,
  length,
  max,
  className,
}: CharacterCountProps): JSX.Element {
  const { t } = useTranslation();
  const over = length > max;
  return (
    <p
      id={id}
      data-testid={id}
      className={cn(
        'text-xs',
        over ? 'font-medium text-destructive' : 'text-muted-foreground',
        className
      )}
    >
      {t('course:form.characterCount', {
        counter: isolateNumericExpression(`${length} / ${max}`),
      })}
    </p>
  );
}
