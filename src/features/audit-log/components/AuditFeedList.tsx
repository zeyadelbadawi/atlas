/**
 * A cursor-paginated audit feed: loading skeletons, a real error state
 * (403 rendered as its own permission copy by the caller's `forbidden`
 * keys), an empty state that distinguishes "nothing yet" from "nothing
 * matches these filters", the rows, and an explicit "Load more" button —
 * never infinite scroll, so keyboard and screen-reader users stay in
 * control of when more arrives.
 */
import { useTranslation } from 'react-i18next';
import { History, Loader2 } from 'lucide-react';
import { EmptyState, ErrorState } from '@components/feedback';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorKind, type ApiError } from '@api';
import {
  AuditEntryRow,
  type AuditEntryRowProps,
  type AuditRowModel,
} from './AuditEntryRow';

export interface AuditFeedListProps extends Pick<
  AuditEntryRowProps,
  'onOpen' | 'onFilterActor' | 'onFilterAcademy' | 'showAcademy'
> {
  readonly rows: readonly AuditRowModel[];
  readonly isLoading: boolean;
  readonly error: ApiError | null;
  readonly onRetry: () => void;
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly onLoadMore: () => void;
  readonly filtered: boolean;
  readonly emptyTitleKey: string;
  readonly emptyDescriptionKey: string;
  readonly filteredEmptyTitleKey: string;
  readonly filteredEmptyDescriptionKey: string;
  /** Copy for a 403 — the permission state, not a generic failure. */
  readonly forbiddenTitleKey?: string;
  readonly forbiddenDescriptionKey?: string;
}

export function AuditFeedList({
  rows,
  isLoading,
  error,
  onRetry,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  filtered,
  emptyTitleKey,
  emptyDescriptionKey,
  filteredEmptyTitleKey,
  filteredEmptyDescriptionKey,
  forbiddenTitleKey,
  forbiddenDescriptionKey,
  ...rowProps
}: AuditFeedListProps): JSX.Element {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div
        className="flex flex-col gap-3"
        aria-busy="true"
        data-testid="audit-feed-loading"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (error && rows.length === 0) {
    const kind = apiErrorKind(error);
    if (kind === 'forbidden' && forbiddenTitleKey) {
      return (
        <EmptyState
          titleKey={forbiddenTitleKey}
          descriptionKey={forbiddenDescriptionKey}
          className="py-10"
        />
      );
    }
    return <ErrorState kind={kind} onRetry={onRetry} />;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={History}
        titleKey={filtered ? filteredEmptyTitleKey : emptyTitleKey}
        descriptionKey={
          filtered ? filteredEmptyDescriptionKey : emptyDescriptionKey
        }
        className="py-10"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul
        className="flex flex-col divide-y divide-border"
        data-testid="audit-feed"
      >
        {rows.map((row) => (
          <AuditEntryRow key={row.id} row={row} {...rowProps} />
        ))}
      </ul>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {t('auditLog:list.loadMoreError')}
        </p>
      ) : null}
      {hasNextPage ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t('auditLog:list.loadingMore')}
              </>
            ) : (
              t('auditLog:list.loadMore')
            )}
          </Button>
        </div>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          {t('auditLog:list.end')}
        </p>
      )}
    </div>
  );
}
