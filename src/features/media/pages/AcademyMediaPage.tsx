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
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Grid2x2, List, Upload } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { NumericExpression, StatusBadge } from '@components/data-display';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useConfirmDialog } from '@app/providers';
import { useFilePicker, usePermissions, useSearch } from '@hooks';
import { formatBytes } from '@utils';
import { useMediaAssets, useArchiveMediaAsset } from '../hooks';
import { useMediaUpload } from '../hooks/useMediaUpload';
import { MediaUploadProgress } from '../components/MediaUploadProgress';
import { useUpdateMediaAsset } from '../hooks/useUpdateMediaAsset';
import { MediaAssetDetailsDialog } from '../components/MediaAssetDetailsDialog';

import type { LanguageCode, MediaAssetStatus, MediaAssetSummary } from '@types';

/**
 * Exactly what the backend's magic-byte validator accepts — not a wider
 * hint. A picker that offered `video/*` would let someone choose a file the
 * server is certain to reject, which is a worse experience than not
 * offering it.
 */
const ACCEPTED_UPLOAD_TYPES = 'image/jpeg,image/png,image/gif,image/webp,application/pdf';

type ViewMode = 'grid' | 'list';

export default function AcademyMediaPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { academyId } = useParams<{ academyId: string }>();
  const { hasPermission } = usePermissions();
  const { confirm } = useConfirmDialog();

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
  const { query: searchTerm, setQuery: setSearchTerm, debouncedQuery } = useSearch({
    debounceMs: 300,
  });

  const assetsQuery = useMediaAssets(academyId, {
    query: {
      search: debouncedQuery || undefined,
      pagination: { page, pageSize: 24 },
      filters: { status },
    },
  });

  const archiveAsset = useArchiveMediaAsset();
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

  const handleArchive = async (asset: MediaAssetSummary) => {
    const confirmed = await confirm({
      titleKey: 'media:page.archiveDialog.title',
      descriptionKey: 'media:page.archiveDialog.description',
      confirmLabelKey: 'media:page.archiveDialog.confirmLabel',
      cancelLabelKey: 'media:page.archiveDialog.cancelLabel',
      intent: 'destructive',
    });
    if (!confirmed || !academyId) return;

    try {
      await archiveAsset.mutateAsync({ academyId, assetId: asset.id });
      setSelected(null);
      toast({ title: t('media:page.archiveSuccess') });
    } catch {
      toast({ title: t('media:page.archiveError'), variant: 'destructive' });
    }
  };

  if (assetsQuery.error) {
    return (
      <PageContainer>
        <PageHeader titleKey="media:page.title" />
        <ErrorState onRetry={() => assetsQuery.refetch()} />
      </PageContainer>
    );
  }

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
        onRetry={() => void retryUpload().then((a) => a && assetsQuery.refetch())}
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
          className="max-w-xs"
          aria-label={t('media:page.searchPlaceholder')}
        />

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as MediaAssetStatus);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40" aria-label={t('media:page.statusFilter')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">{t('media:status.active')}</SelectItem>
            <SelectItem value="archived">{t('media:status.archived')}</SelectItem>
          </SelectContent>
        </Select>

        <div className="ms-auto flex items-center gap-1">
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
          {assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => setSelected(asset)}
              className="group overflow-hidden rounded-lg border border-border text-start transition-colors hover:border-primary"
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
          ))}
        </div>
      ) : (
        <div className="space-y-2" data-testid="media-list">
          {assets.map((asset) => (
            <Card key={asset.id}>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <button
                  type="button"
                  onClick={() => setSelected(asset)}
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
              </CardContent>
            </Card>
          ))}
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
            {t('common:pagination.previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('common:pagination.pageOf', { page, totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages}
          >
            {t('common:pagination.next')}
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
        onArchive={() => {
          if (selected) void handleArchive(selected);
        }}
      />
    </PageContainer>
  );
}
