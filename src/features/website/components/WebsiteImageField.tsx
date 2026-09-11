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
import {
  WEBSITE_IMAGE_RECOMMENDATIONS,
  type WebsiteImagePurpose,
} from '../constants/image-recommendations.constants';

export interface WebsiteImageFieldProps {
  readonly id: string;
  readonly labelKey: string;
  readonly value?: string;
  readonly onChange: (value: string | undefined) => void;
  readonly aspectClassName?: string;
  /** When provided, a "Choose from library" action is offered alongside direct upload. */
  readonly academyId?: string;
  /**
   * What this image is FOR. Drives the recommended-size hint shown under
   * the control. Omitted only where the role genuinely is not known —
   * showing no hint is better than showing a wrong one.
   */
  readonly purpose?: WebsiteImagePurpose;
}

export function WebsiteImageField({
  id,
  labelKey,
  value,
  onChange,
  aspectClassName = 'aspect-video',
  academyId,
  purpose,
}: WebsiteImageFieldProps): JSX.Element {
  const { t } = useTranslation();
  const [error, setError] = useState<string>();
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const filePicker = useFilePicker({
    accept: ALLOWED_WEBSITE_IMAGE_TYPES.join(','),
  });
  const recommendation = purpose
    ? WEBSITE_IMAGE_RECOMMENDATIONS[purpose]
    : undefined;

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
            {value
              ? t('website:common.replaceImage')
              : t('website:common.chooseImage')}
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
      {/*
        The recommendation sits directly under the control, where someone
        about to pick a file will actually read it — not in a tooltip or a
        docs page. Sizes come from what the renderer really draws; see
        `image-recommendations.constants.ts`.
      */}
      {recommendation ? (
        <p
          className="text-xs text-muted-foreground"
          data-testid={`${id}-recommendation`}
        >
          {t('website:common.imageRecommendation', {
            width: recommendation.width,
            height: recommendation.height,
            ratio: recommendation.ratio,
            formats: recommendation.formats.join(' / '),
          })}
          {recommendation.transparency
            ? ` ${t('website:common.imageTransparencyHint')}`
            : ''}
        </p>
      ) : null}
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
