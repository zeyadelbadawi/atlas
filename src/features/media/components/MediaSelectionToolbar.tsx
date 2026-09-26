/**
 * Select mode for the Academy Media library: a count, select-all for the
 * current page, clear, and "Delete selected" — which stays disabled until
 * something is selected so a bulk delete can never start from nothing.
 */
import { useTranslation } from 'react-i18next';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface MediaSelectionToolbarProps {
  readonly selectedCount: number;
  readonly pageCount: number;
  readonly isDeleting: boolean;
  readonly onSelectAll: () => void;
  readonly onClear: () => void;
  readonly onDeleteSelected: () => void;
  readonly onDone: () => void;
}

export function MediaSelectionToolbar({
  selectedCount,
  pageCount,
  isDeleting,
  onSelectAll,
  onClear,
  onDeleteSelected,
  onDone,
}: MediaSelectionToolbarProps): JSX.Element {
  const { t } = useTranslation();
  const allSelected = pageCount > 0 && selectedCount >= pageCount;

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-3"
      data-testid="media-selection-toolbar"
    >
      <p
        className="me-auto text-sm font-medium text-foreground"
        aria-live="polite"
        data-testid="media-selected-count"
      >
        {t('media:delete.selection.selectedCount', { count: selectedCount })}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onSelectAll}
        disabled={allSelected || isDeleting}
      >
        {t('media:delete.selection.selectAll')}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClear}
        disabled={selectedCount === 0 || isDeleting}
      >
        {t('media:delete.selection.clear')}
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onDeleteSelected}
        disabled={selectedCount === 0 || isDeleting}
      >
        {isDeleting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="size-4" aria-hidden />
        )}
        {isDeleting
          ? t('media:delete.deleting')
          : t('media:delete.selection.deleteSelected')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onDone}
        disabled={isDeleting}
      >
        {t('media:delete.selection.done')}
      </Button>
    </div>
  );
}
