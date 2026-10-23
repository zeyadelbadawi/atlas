/**
 * The countdown's deadline (CMS phase 3d, field kind `deadline`).
 *
 * The Owner picks a date and time on their academy's clock — not their
 * laptop's — and the field stores the moment as an ISO date and time with
 * that zone's offset on that date (`2026-11-05T23:59:00+02:00`), plus the
 * zone's name (`timeZone`) so the site can say the deadline in it. A
 * deadline chosen before keeps the zone it was chosen in.
 *
 * Under the field: which zone it is, what visitors will read, and — once
 * the date has passed — that visitors now see the "after it ends" message.
 */
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAcademy } from '@features/academy';
import {
  deadlineInstant,
  deadlineText,
  deadlineToWallTime,
  isKnownTimeZone,
  localTimeZone,
  utcOffsetLabel,
  wallTimeToDeadline,
} from '../utils/countdown.utils';

export interface DeadlineValue {
  readonly deadline: string;
  readonly timeZone?: string;
}

export function DeadlineField({
  id,
  labelKey,
  value,
  onChange,
  academyId,
  schemaError,
}: {
  readonly id: string;
  readonly labelKey: string;
  readonly value: DeadlineValue;
  readonly onChange: (next: DeadlineValue) => void;
  readonly academyId: string;
  readonly schemaError?: string;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const hintId = useId();
  const [touched, setTouched] = useState(false);
  const academyZone = useAcademy(academyId).data?.timezone;
  const zone = isKnownTimeZone(value.timeZone)
    ? value.timeZone!
    : isKnownTimeZone(academyZone)
      ? academyZone!
      : localTimeZone();
  const instant = deadlineInstant(value.deadline);
  const wallTime = value.deadline
    ? deadlineToWallTime(value.deadline, zone)
    : '';
  const isPast = instant !== undefined && instant <= Date.now();
  const error =
    schemaError ??
    (touched && value.deadline && instant === undefined
      ? t('validation:invalidDeadline')
      : undefined);
  const locale = i18n.language === 'ar' ? 'ar' : 'en';
  const preview =
    instant !== undefined ? deadlineText(instant, zone, locale) : undefined;
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t(labelKey)}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="datetime-local"
          dir="ltr"
          className="min-h-11"
          value={wallTime}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${errorId} ${hintId}` : hintId}
          data-field-error={error ? true : undefined}
          onChange={(event) => {
            const next = event.target.value;
            if (!next) {
              onChange({ deadline: '', timeZone: value.timeZone });
              return;
            }
            const deadline = wallTimeToDeadline(next, zone);
            if (deadline) onChange({ deadline, timeZone: zone });
          }}
          onBlur={() => setTouched(true)}
        />
        {value.deadline ? (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 shrink-0"
            onClick={() => onChange({ deadline: '', timeZone: value.timeZone })}
          >
            {t('common:actions.clear')}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div id={hintId} className="space-y-1 text-xs text-muted-foreground">
        <p>
          {t('website:sectionEditors.deadline.hint', {
            zone: `${zone}, ${utcOffsetLabel(instant ?? Date.now(), zone)}`,
          })}
        </p>
        {preview ? (
          <p className="text-foreground">
            {t('website:sectionEditors.deadline.preview', { ...preview })}
          </p>
        ) : (
          <p>{t('website:sectionEditors.deadline.empty')}</p>
        )}
        {isPast ? (
          <p
            className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400"
            role="status"
          >
            <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
            {t('website:sectionEditors.deadline.past')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
