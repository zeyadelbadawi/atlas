/**
 * One asset, its real metadata, and the two things that can be done to it.
 *
 * EVERY FIELD SHOWN IS STORED. Type, MIME type, size, dimensions and upload
 * date all come from the `media_assets` row. Dimensions appear only for the
 * assets that have them — the backend extracts them asynchronously for
 * images and cannot for a PDF — so the row is omitted rather than shown
 * empty or guessed.
 *
 * THERE IS NO "UPLOADED BY". `media_assets` records no user, and a media
 * library that invented one would be worse than one that admits it does not
 * know. Same reasoning as the absent video support on the page itself.
 *
 * ONLY ALT TEXT IS EDITABLE. `PATCH .../media/:assetId` accepts `altText`
 * and nothing else — there is no rename contract, and offering a file-name
 * field that silently did nothing would be worse than not offering one. The
 * stored name is shown as a heading instead.
 *
 * ARCHIVE, NOT DELETE. The backend offers no hard delete for media — an
 * asset may be referenced by a published page, and removing the bytes under
 * a live site is not an undoable mistake. Archiving hides it from the
 * default view and leaves every existing reference working.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatBytes } from '@utils';
import type {
  LanguageCode,
  MediaAssetSummary,
  UpdateMediaAssetPayload,
} from '@types';

export interface MediaAssetDetailsDialogProps {
  readonly asset: MediaAssetSummary | null;
  readonly canManage: boolean;
  readonly isSaving: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (payload: UpdateMediaAssetPayload) => void | Promise<void>;
  readonly onArchive: () => void;
}

export function MediaAssetDetailsDialog({
  asset,
  canManage,
  isSaving,
  onOpenChange,
  onSave,
  onArchive,
}: MediaAssetDetailsDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const [altText, setAltText] = useState('');

  useEffect(() => {
    if (asset) setAltText(asset.altText ?? '');
  }, [asset]);

  const size = asset
    ? formatBytes(asset.sizeBytes, i18n.language as LanguageCode)
    : null;

  return (
    <Dialog open={asset !== null} onOpenChange={onOpenChange}>
      <DialogContent data-testid="media-asset-details">
        <DialogHeader>
          <DialogTitle className="truncate">
            {asset?.fileName ?? t('media:details.title')}
          </DialogTitle>
        </DialogHeader>

        {asset ? (
          <div className="space-y-4">
            {asset.type === 'image' ? (
              <img
                src={asset.url}
                alt={asset.altText ?? asset.fileName}
                className="max-h-64 w-full rounded-lg border border-border object-contain"
              />
            ) : null}

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">
                  {t('media:details.type')}
                </dt>
                <dd className="text-foreground">{asset.mimeType}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {t('media:details.size')}
                </dt>
                <dd className="text-foreground">
                  {size ? `${size.value} ${t(size.unitKey)}` : null}
                </dd>
              </div>
              {/* Only when the backend actually extracted them. */}
              {asset.dimensions ? (
                <div>
                  <dt className="text-muted-foreground">
                    {t('media:details.dimensions')}
                  </dt>
                  <dd className="text-foreground">
                    {asset.dimensions.width}×{asset.dimensions.height}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-muted-foreground">
                  {t('media:details.uploaded')}
                </dt>
                <dd className="text-foreground">
                  {new Date(asset.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>

            {canManage ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="media-alt-text">
                    {t('media:details.altText')}
                  </Label>
                  <Input
                    id="media-alt-text"
                    value={altText}
                    onChange={(event) => setAltText(event.target.value)}
                    placeholder={t('media:details.altTextPlaceholder')}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {canManage ? (
          <DialogFooter className="gap-2 sm:justify-between">
            {asset?.status === 'active' ? (
              <Button variant="outline" onClick={onArchive} disabled={isSaving}>
                {t('media:details.archive')}
              </Button>
            ) : (
              <span />
            )}
            <Button
              onClick={() =>
                void onSave({
                  // An emptied field clears the override rather than
                  // storing a blank string.
                  altText: altText.trim() || undefined,
                })
              }
              disabled={isSaving}
            >
              {t('media:details.save')}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
