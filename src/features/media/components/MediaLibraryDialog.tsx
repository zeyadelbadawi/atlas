/**
 * Media Library Dialog (Prompt 13).
 *
 * The one shared asset picker — browse & reuse an existing academy asset,
 * or upload a new one, from the same real `MediaService` contract. The
 * first consumer is `WebsiteImageField`, offered as an alternate path
 * alongside its existing direct-upload flow (never a replacement for it,
 * since a field-scoped image is still valid without ever being reused).
 *
 * Only active assets are offered — a deleted (archived) asset can never be
 * picked. Owners and managers (`academy.website.manage`, the same gate the
 * Academy Media page uses) can delete from here too. Deleting never
 * touches the value the calling form already holds: an asset a saved
 * lesson/course uses is refused by the backend with the usages named, and
 * an asset only picked in the unsaved form is reported, not silently
 * cleared.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ErrorState, EmptyState } from '@components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useFilePicker, usePermissions, useSearch } from '@hooks';
import { cn } from '@utils';
import {
  useMediaAssets,
  useMediaDeletion,
  useUploadMediaAsset,
} from '../hooks';
import { MediaDeleteOutcome } from './MediaDeleteOutcome';
import type { MediaAssetSummary } from '@types';

export interface MediaLibraryDialogProps {
  readonly academyId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSelect: (asset: MediaAssetSummary) => void;
  /** Restricts the file picker's accepted types. Defaults to images. */
  readonly accept?: string;
  /** URL the calling field currently holds, marked as the current file. */
  readonly selectedUrl?: string;
}

export function MediaLibraryDialog({
  academyId,
  open,
  onOpenChange,
  onSelect,
  accept = 'image/*',
  selectedUrl,
}: MediaLibraryDialogProps): JSX.Element {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  // Gates the control only; the backend authorises the caller's academy role.
  const canDelete = hasPermission('academy.website.manage');
  const deletion = useMediaDeletion(academyId);
  /** File name of a deleted asset the calling form still holds (never cleared silently). */
  const [deletedCurrent, setDeletedCurrent] = useState<string | null>(null);
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    debouncedQuery,
  } = useSearch({ debounceMs: 300 });
  const [altText, setAltText] = useState('');

  const assetsQuery = useMediaAssets(academyId, {
    query: {
      search: debouncedQuery || undefined,
      filters: { status: 'active' },
    },
  });
  const uploadAsset = useUploadMediaAsset();
  const filePicker = useFilePicker({ accept });

  useEffect(() => {
    const file = filePicker.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      uploadAsset.mutate(
        {
          academyId,
          payload: {
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            dataUrl: reader.result as string,
            altText: altText || undefined,
          },
        },
        {
          onSuccess: (asset) => {
            filePicker.clearFiles();
            setAltText('');
            onSelect(asset);
            onOpenChange(false);
          },
        }
      );
    };
    reader.readAsDataURL(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePicker.files]);

  const assets = useMemo(
    () => assetsQuery.data?.items ?? [],
    [assetsQuery.data]
  );

  const handleDelete = async (asset: MediaAssetSummary) => {
    setDeletedCurrent(null);
    const deleted = await deletion.deleteOne(asset);
    if (deleted && selectedUrl && asset.url === selectedUrl) {
      setDeletedCurrent(asset.fileName);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('media:dialog.title')}</DialogTitle>
          <DialogDescription>{t('media:dialog.description')}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="browse" className="space-y-4">
          <TabsList>
            <TabsTrigger value="browse">
              {t('media:dialog.browseTab')}
            </TabsTrigger>
            <TabsTrigger value="upload">
              {t('media:dialog.uploadTab')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('media:dialog.searchPlaceholder')}
              aria-label={t('media:dialog.searchPlaceholder')}
            />

            <MediaDeleteOutcome
              outcome={deletion.outcome}
              onDismiss={deletion.dismissOutcome}
            />
            {deletedCurrent ? (
              <p
                role="status"
                className="rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground"
              >
                {t('media:delete.pickerCurrentDeleted', {
                  fileName: deletedCurrent,
                })}
              </p>
            ) : null}

            {assetsQuery.isLoading ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="aspect-square" />
                ))}
              </div>
            ) : assetsQuery.error ? (
              <ErrorState onRetry={() => assetsQuery.refetch()} />
            ) : assets.length === 0 ? (
              <EmptyState titleKey="media:dialog.empty" />
            ) : (
              <div
                className="grid max-h-80 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4"
                data-testid="media-picker-grid"
              >
                {assets.map((asset) => {
                  const isCurrent = !!selectedUrl && asset.url === selectedUrl;
                  return (
                    <div key={asset.id} className="relative">
                      <button
                        type="button"
                        aria-current={isCurrent ? 'true' : undefined}
                        aria-label={asset.fileName}
                        className={cn(
                          'aspect-square w-full overflow-hidden rounded-md border border-border hover:ring-2 hover:ring-ring',
                          isCurrent && 'ring-2 ring-primary'
                        )}
                        onClick={() => {
                          onSelect(asset);
                          onOpenChange(false);
                        }}
                      >
                        {asset.type === 'image' ? (
                          <img
                            src={asset.url}
                            alt={asset.altText ?? ''}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center break-all bg-muted p-1 text-xs text-muted-foreground">
                            {asset.fileName}
                          </div>
                        )}
                      </button>
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="absolute end-1 top-1 size-7 text-destructive hover:text-destructive"
                          onClick={() => void handleDelete(asset)}
                          disabled={deletion.isDeleting}
                          aria-label={t('media:delete.actionFor', {
                            fileName: asset.fileName,
                          })}
                          title={t('media:delete.action')}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="media-alt-text">
                {t('media:dialog.altText')}
              </Label>
              <Input
                id="media-alt-text"
                value={altText}
                onChange={(event) => setAltText(event.target.value)}
                placeholder={t('media:dialog.altTextPlaceholder')}
              />
            </div>

            {uploadAsset.error ? (
              <ErrorState
                // Phase 2 — a storage-limit rejection has its own stable
                // `code`; everything else keeps the default kind-based
                // message `ErrorState` already renders.
                titleKey={
                  uploadAsset.error.code === 'ENTITLEMENT_LIMIT_REACHED'
                    ? 'media:dialog.errors.limitReachedTitle'
                    : undefined
                }
                descriptionKey={
                  uploadAsset.error.code === 'ENTITLEMENT_LIMIT_REACHED'
                    ? 'media:dialog.errors.limitReachedDescription'
                    : undefined
                }
                onRetry={filePicker.openFilePicker}
              />
            ) : null}

            <Button
              type="button"
              onClick={filePicker.openFilePicker}
              disabled={uploadAsset.isPending}
              className="w-full"
            >
              <Upload className="size-4" strokeWidth={2} aria-hidden />
              {uploadAsset.isPending
                ? t('media:dialog.uploading')
                : t('media:dialog.chooseFile')}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
