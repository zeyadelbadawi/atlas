/**
 * The pager every Zoom operations list shares, so paging behaves and reads
 * identically across pages. Server-side: it only reports the page the
 * server returned and requests the next/previous page number.
 */
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export interface ZoomPagerProps {
  readonly page: number;
  readonly totalPages: number;
  readonly totalItems: number;
  readonly onPage: (next: number) => void;
}

export function ZoomPager({ page, totalPages, totalItems, onPage }: ZoomPagerProps): JSX.Element | null {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        {t('platformZoom:pagination.summary', { page, totalPages, totalItems })}
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(Math.max(1, page - 1))}>
          {t('platformZoom:pagination.previous')}
        </Button>
        <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          {t('platformZoom:pagination.next')}
        </Button>
      </div>
    </div>
  );
}
