/**
 * Analytics date-range preset selector — shared by every tab on
 * `AnalyticsPage`, so the whole page stays on one consistent range.
 */
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AnalyticsDateRangePreset } from '../utils/analytics-date-range.utils';

export interface AnalyticsDateRangeSelectProps {
  readonly value: AnalyticsDateRangePreset;
  readonly onChange: (preset: AnalyticsDateRangePreset) => void;
}

export function AnalyticsDateRangeSelect({
  value,
  onChange,
}: AnalyticsDateRangeSelectProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <Select value={value} onValueChange={(next) => onChange(next as AnalyticsDateRangePreset)}>
      <SelectTrigger className="w-44" aria-label={t('analytics:dateRange.label')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7d">{t('analytics:dateRange.last7Days')}</SelectItem>
        <SelectItem value="30d">{t('analytics:dateRange.last30Days')}</SelectItem>
        <SelectItem value="90d">{t('analytics:dateRange.last90Days')}</SelectItem>
      </SelectContent>
    </Select>
  );
}
