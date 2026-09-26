/** Time-window selector (1 h … 30 d) shared by every Observability page. */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MetricRange } from '@types';
import { METRIC_RANGES } from '../hooks/useObservabilityRange';

export interface RangeSelectProps {
  readonly value: MetricRange;
  readonly onChange: (next: MetricRange) => void;
}

export function RangeSelect({
  value,
  onChange,
}: RangeSelectProps): JSX.Element {
  const { t } = useTranslation();
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {t('platformObservability:range.label')}
      </label>
      <Select
        value={value}
        onValueChange={(next) => onChange(next as MetricRange)}
      >
        <SelectTrigger
          id={id}
          className="w-full sm:w-40"
          aria-label={t('platformObservability:range.label')}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {METRIC_RANGES.map((range) => (
            <SelectItem key={range} value={range}>
              {t(`platformObservability:range.options.${range}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
