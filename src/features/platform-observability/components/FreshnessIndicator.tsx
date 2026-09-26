/**
 * "Last updated 2 minutes ago", plus an explicit stale warning.
 *
 * The time shown is the SERVER's `generatedAt` — when the figures were
 * produced, not when the browser happened to receive them. Staleness is
 * judged from the last successful fetch (see `isDataStale`).
 *
 * Only the stale warning is a live region: the relative time ticks every
 * few seconds and announcing each tick would drown a screen reader.
 */
import { useTranslation } from 'react-i18next';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatDate, formatRelativeTime } from '@utils';
import type { LanguageCode } from '@types';
import { useNow } from '../hooks/useNow';
import { isDataStale } from '../utils/freshness';

export interface FreshnessIndicatorProps {
  readonly generatedAt: string;
  /** `dataUpdatedAt` from the query: when the last successful fetch landed. */
  readonly dataUpdatedAt: number;
  readonly intervalMs: number;
  readonly isFetching: boolean;
  /** True when the most recent refetch failed and older data is shown. */
  readonly refetchFailed: boolean;
  readonly onRefresh: () => void;
  readonly className?: string;
}

export function FreshnessIndicator({
  generatedAt,
  dataUpdatedAt,
  intervalMs,
  isFetching,
  refetchFailed,
  onRefresh,
  className,
}: FreshnessIndicatorProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const now = useNow();
  const stale = isDataStale({ dataUpdatedAt, intervalMs, now, refetchFailed });
  // `now` is read so the relative label re-renders on every tick.
  void now;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground',
        className
      )}
    >
      <span>
        {t('platformObservability:freshness.lastUpdated', {
          time: formatRelativeTime(generatedAt, language),
        })}{' '}
        <time dateTime={generatedAt} className="sr-only">
          {formatDate(generatedAt, language, 'dateTime')}
        </time>
      </span>
      <span role="status" aria-live="polite" className="contents">
        {stale ? (
          <span
            className="inline-flex items-center gap-1 rounded-pill border border-transparent bg-warning-surface px-2 py-0.5 font-medium text-warning"
            data-testid="stale-indicator"
          >
            <TriangleAlert className="size-3.5" strokeWidth={2} aria-hidden />
            {refetchFailed
              ? t('platformObservability:freshness.refreshFailed')
              : t('platformObservability:freshness.stale')}
          </span>
        ) : null}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 px-2 text-xs"
        onClick={onRefresh}
        disabled={isFetching}
        aria-label={t('platformObservability:freshness.refresh')}
      >
        <RefreshCw
          className={cn(
            'size-3.5',
            isFetching && 'animate-spin motion-reduce:animate-none'
          )}
          strokeWidth={2}
          aria-hidden
        />
        <span aria-hidden>
          {isFetching
            ? t('platformObservability:freshness.refreshing')
            : t('platformObservability:freshness.refreshShort')}
        </span>
      </Button>
    </div>
  );
}
