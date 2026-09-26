/** "Ongoing · 12 min" or "1 h 5 min" — from the API's own `durationSeconds`. */
import { useTranslation } from 'react-i18next';
import type { AlertItem } from '@types';
import { formatDuration } from '../utils/observability-format';

export function AlertDuration({
  alert,
}: {
  readonly alert: AlertItem;
}): JSX.Element {
  const { t } = useTranslation();
  const duration =
    formatDuration(alert.durationSeconds, t) ??
    t('platformObservability:values.notReported');
  return (
    <span className="tabular-nums">
      {alert.endsAt === null
        ? t('platformObservability:alerts.ongoing', { duration })
        : duration}
    </span>
  );
}
