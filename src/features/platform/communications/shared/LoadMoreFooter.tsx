/** "Load more" for a cursor feed: a real button, disabled while loading, and an honest end-of-list line. */
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface LoadMoreFooterProps {
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly onLoadMore: () => void;
}

export function LoadMoreFooter({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: LoadMoreFooterProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex justify-center border-t border-border p-4">
      {hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
          aria-busy={isFetchingNextPage}
        >
          {isFetchingNextPage ? (
            <>
              <Loader2
                className="me-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              {t('platformEmail:common.loadingMore')}
            </>
          ) : (
            t('platformEmail:common.loadMore')
          )}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t('platformEmail:common.endOfList')}
        </p>
      )}
    </div>
  );
}
