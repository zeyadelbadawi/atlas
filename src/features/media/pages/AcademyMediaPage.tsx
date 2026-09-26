/**
 * Academy Media — the library for the Academy currently being managed.
 *
 * WHY "ACADEMY MEDIA" AND NOT "MEDIA". The name is the scope. Atlas media
 * has been academy-owned since it was built — `media_assets.academy_id`,
 * storage keys under `academies/{academyId}/`, and RLS on the academy — so
 * a sidebar entry called "Media" would promise an organization-wide library
 * that does not exist and should not: an Organization with three Academies
 * has three separate sets of brand assets, and mixing them is how the wrong
 * logo ends up on the wrong site. Switching the active Academy switches
 * this page's contents, because the academy id is in the route.
 *
 * NO GLOBAL LIBRARY WAS ADDED. The existing academy-scoped backend is
 * reused exactly as it is. This page is the management surface that was
 * missing — until now the only way to reach an asset was
 * `MediaLibraryDialog`, a picker opened from inside a field, which meant
 * assets could be created but never reviewed, renamed, or tidied up.
 *
 * WHAT IS DELIBERATELY NOT HERE, because the backend does not support it
 * and inventing it would be a lie in the UI:
 *   - VIDEO. `MediaAssetType` has a `video` member, but the upload
 *     validator accepts JPEG, PNG, GIF, WebP and PDF only, by magic-byte
 *     sniffing. No video ever reaches storage, so no video filter is
 *     offered and the picker does not accept one.
 *   - UPLOADER. `media_assets` records no user, so "uploaded by" cannot be
 *     shown without making it up. The upload DATE is real and is shown.
 *
 * DELETE. Single (per item, or from the details dialog) and bulk (Select
 * mode). "Delete" is the backend's archive: the item leaves the library now
 * and its file is destroyed after a 30-day grace period. Media still in use
 * is refused with the places using it, which the outcome banner names.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckSquare, Grid2x2, List, Trash2, Upload } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { NumericExpression, StatusBadge } from '@components/data-display';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useFilePicker, usePermissions, useSearch } from '@hooks';
import { cn, formatBytes } from '@utils';
import { useMediaAssets, useMediaDeletion } from '../hooks';
import { useMediaUpload } from '../hooks/useMediaUpload';
import { MediaUploadProgress } from '../components/MediaUploadProgress';
import { useUpdateMediaAsset } from '../hooks/useUpdateMediaAsset';
import { MediaAssetDetailsDialog } from '../components/MediaAssetDetailsDialog';
import { MediaDeleteOutcome } from '../components/MediaDeleteOutcome';
import { MediaSelectionToolbar } from '../components/MediaSelectionToolbar';

import type { LanguageCode, MediaAssetStatus, MediaAssetSummary } from '@types';

/**
 * Exactly what the backend's magic-byte validator accepts — not a wider
 * hint. A picker that offered `video/*` would let someone choose a file the
 * server is certain to reject, which is a worse experience than not
 * offering it.
 */
const ACCEPTED_UPLOAD_TYPES =
  'image/jpeg,image/png,image/gif,image/webp,application/pdf';

type ViewMode = 'grid' | 'list';

export default function AcademyMediaPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { academyId } = useParams<{ academyId: string }>();
  const { hasPermission } = usePermissions();

  /*
    Gates the CONTROLS only; every write below is independently authorised
    server-side against the caller's real `academy_members` role.

    `academy.website.manage` and not an invented `academy.media.manage`:
    Atlas issues no media-specific permission, so a string like that would
    simply never be present and the upload button would never appear for
    anyone. This one is granted to exactly the org roles — owner and
    manager — whose academy membership the media service's own
    `MANAGING_ROLES` check accepts, and it is already the permission
    guarding the CMS surfaces media is uploaded from.
  */
  const canManage = hasPermission('academy.website.manage');

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [status, setStatus] = useState<MediaAssetStatus>('active');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MediaAssetSummary | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const {
    query: searchTerm,
    setQuery: setSearchTerm,
    debouncedQuery,
  } = useSearch({
    debounceMs: 300,
  });

  const assetsQuery = useMediaAssets(academyId, {
    query: {
      search: debouncedQuery || undefined,
      pagination: { page, pageSize: 24 },
      filters: { status },
    },
  });

  const deletion = useMediaDeletion(academyId);
  const updateAsset = useUpdateMediaAsset();
  const filePicker = useFilePicker({ accept: ACCEPTED_UPLOAD_TYPES });
  const {
    state: uploadState,
    upload,
    retry: retryUpload,
    reset: dismissUpload,
    isBusy: isUploading,
  } = useMediaUpload(academyId ?? '');

  const assets = useMemo(
    () => assetsQuery.data?.items ?? [],
    [assetsQuery.data]
  );
  const totalPages = assetsQuery.data?.pagination?.totalPages ?? 1;

  /* Deleting an archived ("deleted") item again would do nothing, so the controls live on active items only. */
  const canDelete = canManage && status === 'active';

  /** `formatBytes` returns a value plus a unit KEY, so the unit stays translatable. */
  const renderSize = (bytes: number) => {
    const formatted = formatBytes(bytes, i18n.language as LanguageCode);
    return `${formatted.value} ${t(formatted.unitKey)}`;
  };

  /*
    Starts the upload as soon as a file is chosen, and the progress strip
    below reports every stage of it. `upload` ignores a second call while
    one is in flight, so an impatient second click cannot create a
    duplicate.
  */
  useEffect(() => {
    const file = filePicker.files?.[0];
    if (!file) return;
    filePicker.clearFiles();
    void upload(file).then((asset) => {
      if (asset) void assetsQuery.refetch();
    });
    // Deliberately keyed on the picked file alone — see
    // `MediaLibraryDialog`'s own upload effect for the same reasoning:
    // re-running on any other identity change would re-upload the file.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePicker.files]);

  // A selection belongs to the page it was made on.
  useEffect(() => {
    setCheckedIds(new Set());
  }, [page, status, debouncedQuery]);

  // Deleting the last items on a later page steps back instead of showing
  // an empty page with a "Previous" button as the only way out.
  useEffect(() => {
    if (
      page > 1 &&
      !assetsQuery.isLoading &&
      !assetsQuery.isFetching &&
      assetsQuery.data &&
      assets.length === 0
    ) {
      setPage((current) => Math.max(1, current - 1));
    }
  }, [
    assets.length,
    assetsQuery.data,
    assetsQuery.isFetching,
    assetsQuery.isLoading,
    page,
  ]);

  const toggleChecked = useCallback((assetId: string) => {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  }, []);

  const uncheck = useCallback((ids: readonly string[]) => {
    if (ids.length === 0) return;
    setCheckedIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const handleDeleteOne = async (asset: MediaAssetSummary) => {
    setSelected(null);
    const deleted = await deletion.deleteOne(asset);
    if (deleted) uncheck([asset.id]);
  };

  const handleDeleteSelected = async () => {
    const chosen = assets.filter((asset) => checkedIds.has(asset.id));
    const deleted = await deletion.deleteMany(chosen);
    uncheck(deleted);
  };

  const exitSelectMode = () => {
    setIsSelecting(false);
    setCheckedIds(new Set());
  };

  if (assetsQuery.error) {
    return (
      <PageContainer>
        <PageHeader titleKey="media:page.title" />
        <ErrorState onRetry={() => assetsQuery.refetch()} />
      </PageContainer>
    );
  }

  const renderDeleteButton = (asset: MediaAssetSummary, className?: string) => (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className={cn(
        'size-8 text-destructive hover:text-destructive',
        className
      )}
      onClick={() => void handleDeleteOne(asset)}
      disabled={deletion.isDeleting}
      aria-label={t('media:delete.actionFor', { fileName: asset.fileName })}
      title={t('media:delete.action')}
    >
      <Trash2 className="size-4" aria-hidden />
    </Button>
  );

  const renderCheckbox = (asset: MediaAssetSummary, className?: string) => (
    <Checkbox
      className={cn('size-5 bg-background', className)}
      checked={checkedIds.has(asset.id)}
      onCheckedChange={() => toggleChecked(asset.id)}
      disabled={deletion.isDeleting}
      aria-label={t('media:delete.selection.selectItem', {
        fileName: asset.fileName,
      })}
    />
  );

  return (
    <PageContainer>
      <PageHeader
        titleKey="media:page.title"
        descriptionKey="media:page.subtitle"
        actions={
          canManage ? (
            <Button onClick={filePicker.openFilePicker} disabled={isUploading}>
              <Upload className="size-4" strokeWidth={2} aria-hidden />
              {t('media:page.uploadButton')}
            </Button>
          ) : undefined
        }
      />

      <MediaUploadProgress
        state={uploadState}
        onRetry={() =>
          void retryUpload().then((a) => a && assetsQuery.refetch())
        }
        onDismiss={dismissUpload}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setPage(1);
          }}
          placeholder={t('media:page.searchPlaceholder')}
          className="w-full sm:max-w-xs"
          aria-label={t('media:page.searchPlaceholder')}
        />

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as MediaAssetStatus);
            setPage(1);
            exitSelectMode();
          }}
        >
          <SelectTrigger
            className="w-40"
            aria-label={t('media:page.statusFilter')}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">{t('media:status.active')}</SelectItem>
            <SelectItem value="archived">
              {t('media:status.archived')}
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="ms-auto flex items-center gap-1">
          {canDelete && assets.length > 0 && !isSelecting ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSelecting(true)}
            >
              <CheckSquare className="size-4" aria-hidden />
              {t('media:delete.selection.select')}
            </Button>
          ) : null}
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            aria-label={t('media:page.gridView')}
            aria-pressed={viewMode === 'grid'}
          >
            <Grid2x2 className="size-4" aria-hidden />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            aria-label={t('media:page.listView')}
            aria-pressed={viewMode === 'list'}
          >
            <List className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      {canDelete && isSelecting && assets.length > 0 ? (
        <MediaSelectionToolbar
          selectedCount={checkedIds.size}
          pageCount={assets.length}
          isDeleting={deletion.isDeleting}
          onSelectAll={() =>
            setCheckedIds(new Set(assets.map((asset) => asset.id)))
          }
          onClear={() => setCheckedIds(new Set())}
          onDeleteSelected={() => void handleDeleteSelected()}
          onDone={exitSelectMode}
        />
      ) : null}

      <MediaDeleteOutcome
        outcome={deletion.outcome}
        onDismiss={deletion.dismissOutcome}
      />

      {assetsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <EmptyState
          titleKey={
            debouncedQuery ? 'media:page.noResults' : 'media:page.empty'
          }
          descriptionKey={
            debouncedQuery
              ? 'media:page.noResultsDescription'
              : canManage
                ? 'media:page.emptyDescription'
                : 'media:page.emptyReadOnlyDescription'
          }
        />
      ) : viewMode === 'grid' ? (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="media-grid"
        >
          {assets.map((asset) => {
            const isChecked = checkedIds.has(asset.id);
            const selecting = canDelete && isSelecting;
            return (
              <div
                key={asset.id}
                className={cn(
                  'group relative overflow-hidden rounded-lg border border-border transition-colors hover:border-primary',
                  selecting && isChecked && 'border-primary ring-2 ring-primary'
                )}
              >
                <button
                  type="button"
                  // In Select mode the whole card toggles, so a finger does
                  // not have to find the checkbox; the checkbox remains the
                  // one control assistive technology is offered.
                  tabIndex={selecting ? -1 : undefined}
                  onClick={() =>
                    selecting ? toggleChecked(asset.id) : setSelected(asset)
                  }
                  className="block w-full text-start"
                >
                  <div className="flex h-32 items-center justify-center bg-muted">
                    {asset.type === 'image' ? (
                      <img
                        src={asset.url}
                        alt={asset.altText ?? asset.fileName}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xs font-medium uppercase text-muted-foreground">
                        {asset.mimeType.split('/')[1]}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="truncate text-sm font-medium text-foreground">
                      {asset.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {renderSize(asset.sizeBytes)}
                    </p>
                  </div>
                </button>
                {selecting
                  ? renderCheckbox(asset, 'absolute start-2 top-2')
                  : canDelete
                    ? renderDeleteButton(asset, 'absolute end-2 top-2')
                    : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2" data-testid="media-list">
          {assets.map((asset) => {
            const selecting = canDelete && isSelecting;
            return (
              <Card key={asset.id}>
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  {selecting ? renderCheckbox(asset) : null}
                  <button
                    type="button"
                    tabIndex={selecting ? -1 : undefined}
                    onClick={() =>
                      selecting ? toggleChecked(asset.id) : setSelected(asset)
                    }
                    className="min-w-0 flex-1 text-start"
                  >
                    <p className="truncate text-sm font-medium text-foreground">
                      {asset.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {asset.mimeType} · {renderSize(asset.sizeBytes)}
                      {asset.dimensions ? (
                        <>
                          {' · '}
                          <NumericExpression>
                            {asset.dimensions.width}×{asset.dimensions.height}
                          </NumericExpression>
                        </>
                      ) : null}
                    </p>
                  </button>
                  <StatusBadge
                    labelKey={`media:status.${asset.status}`}
                    tone={asset.status === 'active' ? 'success' : 'neutral'}
                  />
                  {canDelete && !selecting ? renderDeleteButton(asset) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
          >
            {t('common:pagination.previousPage')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('common:pagination.page', { page, totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            disabled={page >= totalPages}
          >
            {t('common:pagination.nextPage')}
          </Button>
        </div>
      ) : null}

      <MediaAssetDetailsDialog
        asset={selected}
        canManage={canManage}
        isSaving={updateAsset.isPending}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onSave={async (payload) => {
          if (!academyId || !selected) return;
          try {
            await updateAsset.mutateAsync({
              academyId,
              assetId: selected.id,
              payload,
            });
            setSelected(null);
            toast({ title: t('media:page.saveSuccess') });
          } catch {
            toast({ title: t('media:page.saveError'), variant: 'destructive' });
          }
        }}
        onDelete={() => {
          if (selected) void handleDeleteOne(selected);
        }}
      />
    </PageContainer>
  );
}
