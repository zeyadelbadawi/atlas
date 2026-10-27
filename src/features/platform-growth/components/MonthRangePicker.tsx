/**
 * G1 — a From / To month range (Cairo calendar months) with an Apply
 * button. The range is checked before it is sent (at most 36 months, From
 * not after To); the problem is shown next to the fields and announced.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MonthRange } from '../types';
import { K, MAX_RANGE_MONTHS, rangeProblem } from '../utils/growth.utils';

export function MonthRangePicker({
  idPrefix,
  value,
  onChange,
}: {
  readonly idPrefix: string;
  readonly value: MonthRange;
  readonly onChange: (range: MonthRange) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<MonthRange>(value);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    setDraft(value);
    setProblem(null);
  }, [value]);

  const errorId = `${idPrefix}-range-error`;
  const apply = () => {
    const next = rangeProblem(draft.from, draft.to);
    setProblem(next);
    if (!next) onChange(draft);
  };

  return (
    <form
      noValidate
      className="flex flex-wrap items-end gap-3"
      aria-label={t(`${K}range.label`)}
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-from`}>{t(`${K}range.from`)}</Label>
        <Input
          id={`${idPrefix}-from`}
          type="month"
          inputMode="numeric"
          placeholder="YYYY-MM"
          className="h-11 w-44"
          value={draft.from}
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? errorId : undefined}
          onChange={(event) =>
            setDraft((current) => ({ ...current, from: event.target.value }))
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-to`}>{t(`${K}range.to`)}</Label>
        <Input
          id={`${idPrefix}-to`}
          type="month"
          inputMode="numeric"
          placeholder="YYYY-MM"
          className="h-11 w-44"
          value={draft.to}
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? errorId : undefined}
          onChange={(event) =>
            setDraft((current) => ({ ...current, to: event.target.value }))
          }
        />
      </div>
      <Button type="submit" variant="outline" className="min-h-11">
        {t(`${K}range.apply`)}
      </Button>
      {problem ? (
        <p
          id={errorId}
          role="alert"
          className="basis-full text-xs font-medium text-destructive"
        >
          {t(`${K}${problem}`, { max: MAX_RANGE_MONTHS })}
        </p>
      ) : null}
    </form>
  );
}
