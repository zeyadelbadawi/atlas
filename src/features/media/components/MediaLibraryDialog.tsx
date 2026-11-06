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
 *
 * PUBLIC ASSETS ONLY (D5-4). Every caller puts the picked asset's URL into a
 * public field — a logo, a course cover, a website image. A protected file
 * has no URL and must never land there, so the picker asks the server for
 * the public tier and drops anything without an address as well.
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
import { cn, formatBytes, isolateNumericExpression } from '@utils';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFailureReason } from '@forms';
import type { ApiError } from '@api';
import {
  useMediaAssets,
  useMediaDeletion,
  useUploadMediaAsset,
} from '../hooks';
import { MediaDeleteOutcome } from './MediaDeleteOutcome';
import { isPublicMediaAsset } from '../utils/media-protection';
import type { MediaAssetSummary, PublicMediaAsset } from '@types';

export interface MediaLibraryDialogProps {
  readonly academyId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSelect: (asset: PublicMediaAsset) => void;
  /** Restricts the file picker's accepted types. Defaults to images. */
  readonly accept?: string;
  /**
   * The largest file this picker takes. Defaults to the public media limit
   * (10 MB, `MEDIA_MAX_UPLOAD_BYTES`); a form with a smaller limit passes it.
   */
  readonly maxBytes?: number;
  /** URL the calling field currently holds, marked as the current file. */
  readonly selectedUrl?: string;
}

/** The public media upload limit (`MEDIA_MAX_UPLOAD_BYTES`, 10 MB). */
const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const TYPE_NAMES: Readonly<Record<string, string>> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/jpg': 'JPG',
  'image/webp': 'WebP',
  'image/gif': 'GIF',
  'image/svg+xml': 'SVG',
  'application/pdf': 'PDF',
};

/** "PNG, JPG, WebP" for an explicit list; `null` for a wildcard like `image/*`. */
export function acceptedTypeNames(accept: string): string[] | null {
  const types = accept
    .split(',')
    .map((type) => type.trim())
    .filter(Boolean);
  if (types.length === 0 || types.some((type) => type.endsWith('/*'))) {
    return null;
  }
  return [...new Set(types.map((type) => TYPE_NAMES[type] ?? type))];
}

/** Whether a file's MIME type fits the picker's `accept` list. */
export function matchesAccept(mimeType: string, accept: string): boolean {
  const types = accept
    .split(',')
    .map((type) => type.trim())
    .filter(Boolean);
  if (types.length === 0) return true;
  return types.some((type) =>
    type.endsWith('/*')
      ? mimeType.startsWith(type.slice(0, -1))
      : type === mimeType
  );
}

/** The server's refusal, in this picker's terms (its own types and limit). */
function serverFailureText(
  error: ApiError | null,
  helpers: {
    readonly t: (key: string, values?: Record<string, unknown>) => string;
    readonly typesText: string;
    readonly sizeText: (bytes: number) => string;
    readonly failureReason: (error: ApiError) => string;
  }
): string {
  if (!error) return '';
  if (
    error.messageKey === 'errors.media.unsupportedFileType' ||
    error.messageKey === 'errors.media.invalidDataUrl'
  ) {
    return helpers.t('media:dialog.errors.wrongType', {
      types: helpers.typesText,
    });
  }
  const maxBytes = error.details?.maxBytes;
  if (
    error.messageKey === 'errors.media.fileTooLarge' &&
    typeof maxBytes === 'number'
  ) {
    return helpers.t('errors:media.fileTooLargeWithLimit', {
      max: helpers.sizeText(maxBytes),
    });
  }
  return helpers.failureReason(error);
}

export function MediaLibraryDialog({
  academyId,
  open,
  onOpenChange,
  onSelect,
  accept = 'image/*',
  maxBytes = DEFAULT_MAX_UPLOAD_BYTES,
  selectedUrl,
}: MediaLibraryDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissions();
  // Gates the controls only; the backend authorises the caller's academy
  // role. Uploading and deleting are for the managing roles; an instructor
  // (no `academy.website.manage`) can still browse and pick a file
  // (B0-MED-08).
  const canDelete = hasPermission('academy.website.manage');
  const canUpload = canDelete;
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
      filters: { status: 'active', access: 'public' },
    },
  });
  const uploadAsset = useUploadMediaAsset({ inlineErrors: true });
  const filePicker = useFilePicker({ accept });
  const failureReason = useFailureReason();
  const language = i18n.language === 'ar' ? 'ar' : 'en';
  const sizeText = (bytes: number) => {
    const { value, unitKey } = formatBytes(bytes, language);
    return isolateNumericExpression(`${value} ${t(unitKey)}`);
  };
  const acceptedTypes = acceptedTypeNames(accept);
  const typesText = acceptedTypes
    ? acceptedTypes.join(', ')
    : t('media:dialog.anyImage');
  /**
   * B3 (UX audit, V10) — the file's problem in words, checked before any
   * upload: a wrong type or a file over the limit used to go to the server
   * and come back as "Unexpected error" plus a toast suggesting PDF.
   */
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    const file = filePicker.files?.[0];
    if (!file) return;
    uploadAsset.reset();
    if (!matchesAccept(file.type, accept)) {
      setFileError(t('media:dialog.errors.wrongType', { types: typesText }));
      filePicker.clearFiles();
      return;
    }
    if (file.size > maxBytes) {
      setFileError(
        t('media:dialog.errors.tooLarge', {
          size: sizeText(file.size),
          max: sizeText(maxBytes),
        })
      );
      filePicker.clearFiles();
      return;
    }
    setFileError(null);

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
    () => (assetsQuery.data?.items ?? []).filter(isPublicMediaAsset),
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
            {canUpload ? (
              <TabsTrigger value="upload">
                {t('media:dialog.uploadTab')}
              </TabsTrigger>
            ) : null}
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

            {uploadAsset.error?.code === 'ENTITLEMENT_LIMIT_REACHED' ? (
              <ErrorState
                titleKey="media:dialog.errors.limitReachedTitle"
                descriptionKey="media:dialog.errors.limitReachedDescription"
                onRetry={filePicker.openFilePicker}
              />
            ) : fileError || uploadAsset.error ? (
              <Alert variant="destructive" data-testid="media-upload-error">
                <AlertCircle className="size-4" aria-hidden />
                <AlertTitle>
                  {t('media:dialog.errors.uploadFailedTitle')}
                </AlertTitle>
                <AlertDescription>
                  {fileError ??
                    serverFailureText(uploadAsset.error, {
                      t,
                      typesText,
                      sizeText,
                      failureReason,
                    })}
                </AlertDescription>
              </Alert>
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
            <p className="text-xs text-muted-foreground">
              {acceptedTypes
                ? t('media:dialog.uploadRules', {
                    types: typesText,
                    max: sizeText(maxBytes),
                  })
                : t('media:dialog.uploadRulesAnyImage', {
                    max: sizeText(maxBytes),
                  })}
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
