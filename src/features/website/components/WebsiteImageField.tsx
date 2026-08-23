/**
 * Website Image Field.
 *
 * The one image-upload control every website form uses (dark logo, OG
 * image, hero image, gallery images, avatars, ...). Reuses the existing
 * `useFilePicker` + base64 pattern (no upload endpoint exists anywhere in
 * Atlas — the same convention Course thumbnails and Academy branding
 * already use), never a bespoke upload mechanism.
 *
 * Prompt 13 adds an alternate "choose from library" path via
 * `MediaLibraryDialog` — reusing a previously-uploaded academy asset
 * instead of always uploading a fresh blob. The direct-upload flow above
 * is unchanged and still the default; the library is optional, gated by
 * `academyId` being known to the caller.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useFilePicker } from '@hooks';
import { MediaLibraryDialog } from '@features/media';
import {
  ALLOWED_WEBSITE_IMAGE_TYPES,
  MAX_WEBSITE_IMAGE_FILE_SIZE,
} from '../constants/website.constants';

export interface WebsiteImageFieldProps {
  readonly id: string;
  readonly labelKey: string;
  readonly value?: string;
  readonly onChange: (value: string | undefined) => void;
  readonly aspectClassName?: string;
  /** When provided, a "Choose from library" action is offered alongside direct upload. */
  readonly academyId?: string;
}

export function WebsiteImageField({
  id,
  labelKey,
  value,
  onChange,
  aspectClassName = 'aspect-video',
  academyId,
}: WebsiteImageFieldProps): JSX.Element {
  const { t } = useTranslation();
  const [error, setError] = useState<string>();
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const filePicker = useFilePicker({ accept: ALLOWED_WEBSITE_IMAGE_TYPES.join(',') });

  useEffect(() => {
    const file = filePicker.files?.[0];
    if (!file) return;

    if (file.size > MAX_WEBSITE_IMAGE_FILE_SIZE) {
      setError('website:common.imageTooLarge');
      filePicker.clearFiles();
      return;
    }
    if (!ALLOWED_WEBSITE_IMAGE_TYPES.includes(file.type)) {
      setError('website:common.imageInvalidType');
      filePicker.clearFiles();
      return;
    }

    setError(undefined);
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePicker.files]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t(labelKey)}</Label>
      <div className="flex items-center gap-3">
        <div
          className={`flex ${aspectClassName} w-32 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted`}
        >
          {value ? (
            <img src={value} alt="" className="size-full object-contain" />
          ) : (
            <Upload className="size-5 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            id={id}
            type="button"
            variant="outline"
            size="sm"
            onClick={filePicker.openFilePicker}
          >
            {value ? t('website:common.replaceImage') : t('website:common.chooseImage')}
          </Button>
          {academyId ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsLibraryOpen(true)}
            >
              <FolderOpen className="size-3.5" aria-hidden />
              {t('website:common.chooseFromLibrary')}
            </Button>
          ) : null}
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(undefined)}
            >
              <X className="size-3.5" aria-hidden />
              {t('website:common.removeImage')}
            </Button>
          ) : null}
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{t(error)}</p> : null}
      {academyId ? (
        <MediaLibraryDialog
          academyId={academyId}
          open={isLibraryOpen}
          onOpenChange={setIsLibraryOpen}
          onSelect={(asset) => onChange(asset.url)}
          accept={ALLOWED_WEBSITE_IMAGE_TYPES.join(',')}
        />
      ) : null}
    </div>
  );
}
