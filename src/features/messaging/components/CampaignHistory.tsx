/**
 * W3-compose — sent messages with their REAL progress.
 *
 * Every number comes from the server's outbox and delivery rows: "Sent"
 * means a provider accepted it, "Delivered" only appears when a provider
 * webhook confirmed it, and "Not sent" (preference, suppression, daily
 * limit) is not shown as a failure. A list of cards rather than a wide
 * table, so it reads at 390px.
 */
import { useTranslation } from 'react-i18next';
import { BellRing, Inbox, Mail } from 'lucide-react';
import type { InfiniteData } from '@tanstack/react-query';
import { EmptyState, ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import type { StatusTone } from '@components/data-display';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useDateFormatter } from '@hooks';
import { formatNumber } from '@utils';
import type { ApiError } from '@api';
import type { LanguageCode } from '@types';
import type {
  CampaignAudience,
  CampaignPage,
  CampaignStatus,
  CampaignSummary,
} from '../messaging.types';

const STATUS_TONE: Record<CampaignStatus, StatusTone> = {
  queued: 'neutral',
  expanding: 'info',
  sending: 'info',
  completed: 'success',
  cancelled: 'neutral',
  failed: 'destructive',
};

export interface CampaignHistoryProps {
  readonly data: InfiniteData<CampaignPage, string | undefined> | undefined;
  readonly isLoading: boolean;
  readonly error: ApiError | null;
  readonly onRetry: () => void;
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly onLoadMore: () => void;
}

function audienceKey(audience: CampaignAudience): string {
  return `messaging:audience.summary.${audience.type}`;
}

function CampaignCard({ item }: { readonly item: CampaignSummary }): JSX.Element {
  const { t, i18n } = useTranslation();
  const { dateTime } = useDateFormatter();
  const language = i18n.language as LanguageCode;
  const n = (value: number) => formatNumber(value, language);
  const p = item.progress;
  const audienceCount =
    item.audience.type === 'courses'
      ? item.audience.courseIds.length
      : item.audience.type === 'staff'
        ? item.audience.roles.length
        : 0;

  return (
    <li
      className="space-y-3 rounded-md border border-border p-4"
      data-testid="campaign-history-item"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="break-words font-medium" dir="auto">
            {item.subject}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('messaging:history.meta', {
              date: dateTime(item.createdAt),
              author: item.authorName ?? t('messaging:history.unknownAuthor'),
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t(audienceKey(item.audience), { count: audienceCount })}
            {' · '}
            {t('messaging:history.recipients', {
              count: item.recipientCount,
              formatted: n(item.recipientCount),
            })}
          </p>
        </div>
        <StatusBadge
          labelKey={`messaging:status.${item.status}`}
          tone={STATUS_TONE[item.status] ?? 'neutral'}
        />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        {item.channels.email ? (
          <>
            <div>
              <dt className="flex items-center gap-1 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                {t('messaging:history.sent')}
              </dt>
              <dd className="font-semibold" data-testid="campaign-sent">
                {n(p.sent)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('messaging:history.queued')}</dt>
              <dd className="font-semibold">{n(p.queued + p.awaitingRelease)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('messaging:history.notSent')}</dt>
              <dd className="font-semibold">
                {n(p.skipped + item.excluded.optedOut + item.excluded.suppressed + item.excluded.quota)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('messaging:history.failed')}</dt>
              <dd className={p.failed > 0 ? 'font-semibold text-destructive' : 'font-semibold'}>
                {n(p.failed)}
              </dd>
            </div>
            {p.delivered > 0 || p.bounced > 0 ? (
              <div className="col-span-2 sm:col-span-4">
                <dt className="sr-only">{t('messaging:history.providerReports')}</dt>
                <dd className="text-muted-foreground">
                  {t('messaging:history.delivered', {
                    delivered: n(p.delivered),
                    bounced: n(p.bounced),
                  })}
                </dd>
              </div>
            ) : null}
          </>
        ) : null}
        {item.channels.inApp ? (
          <div>
            <dt className="flex items-center gap-1 text-muted-foreground">
              <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
              {t('messaging:history.inApp')}
            </dt>
            <dd className="font-semibold" data-testid="campaign-in-app">
              {n(p.inApp)}
            </dd>
          </div>
        ) : null}
      </dl>
    </li>
  );
}

export function CampaignHistory({
  data,
  isLoading,
  error,
  onRetry,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: CampaignHistoryProps): JSX.Element {
  const { t } = useTranslation();
  const items = data?.pages.flatMap((page) => page.items) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label={t('messaging:history.loading')}>
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-24 w-full" />
        ))}
      </div>
    );
  }
  if (error && items.length === 0) {
    return <ErrorState kind={error.kind} requestId={error.requestId} onRetry={onRetry} />;
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        titleKey="messaging:history.emptyTitle"
        descriptionKey="messaging:history.emptyDescription"
      />
    );
  }
  return (
    <div className="space-y-3">
      <ul className="space-y-3" data-testid="campaign-history">
        {items.map((item) => (
          <CampaignCard key={item.id} item={item} />
        ))}
      </ul>
      {hasNextPage ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            aria-busy={isFetchingNextPage}
          >
            {isFetchingNextPage ? t('messaging:history.loadingMore') : t('messaging:history.loadMore')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
