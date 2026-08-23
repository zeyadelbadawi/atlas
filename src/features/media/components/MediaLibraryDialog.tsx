/**
 * Media Library Dialog (Prompt 13).
 *
 * The one shared asset picker — browse & reuse an existing academy asset,
 * or upload a new one, from the same real `MediaService` contract. The
 * first consumer is `WebsiteImageField`, offered as an alternate path
 * alongside its existing direct-upload flow (never a replacement for it,
 * since a field-scoped image is still valid without ever being reused).
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
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
import { useFilePicker, useSearch } from '@hooks';
import { useMediaAssets, useUploadMediaAsset } from '../hooks';
import type { MediaAssetSummary } from '@types';

export interface MediaLibraryDialogProps {
  readonly academyId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSelect: (asset: MediaAssetSummary) => void;
  /** Restricts the file picker's accepted types. Defaults to images. */
  readonly accept?: string;
}

export function MediaLibraryDialog({
  academyId,
  open,
  onOpenChange,
  onSelect,
  accept = 'image/*',
}: MediaLibraryDialogProps): JSX.Element {
  const { t } = useTranslation();
  const { query: searchQuery, setQuery: setSearchQuery, debouncedQuery } = useSearch({ debounceMs: 300 });
  const [altText, setAltText] = useState('');

  const assetsQuery = useMediaAssets(academyId, {
    query: { search: debouncedQuery || undefined },
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

  const assets = useMemo(() => assetsQuery.data?.items ?? [], [assetsQuery.data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('media:dialog.title')}</DialogTitle>
          <DialogDescription>{t('media:dialog.description')}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="browse" className="space-y-4">
          <TabsList>
            <TabsTrigger value="browse">{t('media:dialog.browseTab')}</TabsTrigger>
            <TabsTrigger value="upload">{t('media:dialog.uploadTab')}</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('media:dialog.searchPlaceholder')}
              aria-label={t('media:dialog.searchPlaceholder')}
            />

            {assetsQuery.isLoading ? (
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="aspect-square" />
                ))}
              </div>
            ) : assetsQuery.error ? (
              <ErrorState onRetry={() => assetsQuery.refetch()} />
            ) : assets.length === 0 ? (
              <EmptyState titleKey="media:dialog.empty" />
            ) : (
              <div className="grid max-h-80 grid-cols-4 gap-3 overflow-y-auto">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className="aspect-square overflow-hidden rounded-md border border-border hover:ring-2 hover:ring-ring"
                    onClick={() => {
                      onSelect(asset);
                      onOpenChange(false);
                    }}
                  >
                    {asset.type === 'image' ? (
                      <img src={asset.url} alt={asset.altText ?? ''} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-muted text-xs text-muted-foreground">
                        {asset.fileName}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="media-alt-text">{t('media:dialog.altText')}</Label>
              <Input
                id="media-alt-text"
                value={altText}
                onChange={(event) => setAltText(event.target.value)}
                placeholder={t('media:dialog.altTextPlaceholder')}
              />
            </div>

            {uploadAsset.error ? <ErrorState onRetry={filePicker.openFilePicker} /> : null}

            <Button
              type="button"
              onClick={filePicker.openFilePicker}
              disabled={uploadAsset.isPending}
              className="w-full"
            >
              <Upload className="size-4" strokeWidth={2} aria-hidden />
              {uploadAsset.isPending ? t('media:dialog.uploading') : t('media:dialog.chooseFile')}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
