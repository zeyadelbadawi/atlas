/**
 * Website Image Field.
 *
 * The one image-upload control every website form uses (dark logo, OG
 * image, hero image, gallery images, avatars, ...).
 *
 * Theme 1 plan §E.4 (the base64 fix): a direct upload goes through the
 * Academy's `MediaAsset` store and the field keeps only the returned URL,
 * so section JSON — and every public page payload — carries references,
 * not image bytes. The file is still read to a data URL in the browser
 * because that is what the media upload endpoint accepts. Legacy `data:`
 * values already saved keep rendering; nothing produces new ones while an
 * `academyId` is known (every caller today passes it).
 *
 * Prompt 13 adds an alternate "choose from library" path via
 * `MediaLibraryDialog` — reusing a previously-uploaded academy asset
 * instead of always uploading a fresh blob. The direct-upload flow above
 * is unchanged and still the default; the library is optional, gated by
 * `academyId` being known to the caller.
 */
import { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, ImageOff, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useFilePicker } from '@hooks';
import { isolateNumericExpression } from '@utils';
import { MediaLibraryDialog, useUploadMediaAsset } from '@features/media';
import { useImagePreview } from '../theme-assets/useImagePreview';
import {
  ALLOWED_WEBSITE_IMAGE_TYPES,
  MAX_WEBSITE_IMAGE_FILE_SIZE,
} from '../constants/website.constants';
import {
  WEBSITE_IMAGE_RECOMMENDATIONS,
  type WebsiteImagePurpose,
} from '../constants/image-recommendations.constants';

/**
 * The theme the edited Academy's public site renders under, for every image
 * field below — so a form can say it once instead of threading it through
 * each nested field. A field's own `themeKey` prop wins.
 */
export const WebsiteImageThemeContext = createContext<string | undefined>(
  undefined
);

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
  /**
   * The theme the Academy's public site renders under. A starter photograph
   * (`theme-asset:` reference) previews as that theme draws it — the same
   * picture the public site shows. Without it, the reference previews as
   * the photograph it names.
   */
  readonly themeKey?: string;
}

export function WebsiteImageField({
  id,
  labelKey,
  value,
  onChange,
  aspectClassName = 'aspect-video',
  academyId,
  purpose,
  themeKey,
}: WebsiteImageFieldProps): JSX.Element {
  const { t } = useTranslation();
  const [error, setError] = useState<string>();
  const contextThemeKey = useContext(WebsiteImageThemeContext);
  const preview = useImagePreview(value, themeKey ?? contextThemeKey);
  // The stored value whose file failed to load (deleted asset, offline):
  // the tile says so instead of showing the browser's broken-image icon.
  const [failedSrc, setFailedSrc] = useState<string>();
  const previewSrc =
    preview.status === 'url' || preview.status === 'theme-asset'
      ? preview.src
      : undefined;
  const unavailable =
    preview.status === 'unavailable' ||
    (previewSrc !== undefined && failedSrc === previewSrc);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const uploadAsset = useUploadMediaAsset();
  const isUploading = uploadAsset.isPending;
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
    reader.onload = () => {
      const dataUrl = reader.result as string;
      filePicker.clearFiles();
      if (!academyId) {
        onChange(dataUrl);
        return;
      }
      uploadAsset
        .mutateAsync({
          academyId,
          payload: {
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            dataUrl,
          },
        })
        .then((asset) => onChange(asset.url))
        // The field keeps its previous value: a failed upload must never
        // look like it worked.
        .catch(() => setError('website:common.imageUploadFailed'));
    };
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
          {isUploading || preview.status === 'pending' ? (
            <Loader2
              className="size-5 animate-spin text-muted-foreground"
              aria-hidden
            />
          ) : unavailable ? (
            <span
              className="flex flex-col items-center gap-1 px-2 text-center text-[11px] leading-tight text-muted-foreground"
              data-testid={`${id}-preview-unavailable`}
            >
              <ImageOff className="size-4" aria-hidden />
              {t('website:common.imagePreviewUnavailable')}
            </span>
          ) : previewSrc ? (
            <img
              src={previewSrc}
              alt=""
              data-testid={`${id}-preview`}
              className={`size-full ${preview.status === 'theme-asset' ? 'object-cover' : 'object-contain'}`}
              style={
                preview.status === 'theme-asset'
                  ? { objectPosition: preview.objectPosition }
                  : undefined
              }
              onError={() => setFailedSrc(previewSrc)}
            />
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
            disabled={isUploading}
          >
            {isUploading
              ? t('website:common.uploadingImage')
              : value
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
          {/*
            Both the size and the ratio are composed here rather than in the
            sentence, and both are bidi-isolated. `×` and `:` are neutral
            characters, so left to themselves the numbers on either side swap
            in Arabic — `1280×720` is read back as `720×1280` and a 16:9
            recommendation becomes a 9:16 one, which is a different shape.
          */}
          {t('website:common.imageRecommendation', {
            dimensions: isolateNumericExpression(
              `${recommendation.width}×${recommendation.height}`
            ),
            ratio: isolateNumericExpression(recommendation.ratio),
            formats: recommendation.formats.join(' / '),
          })}
          {recommendation.transparency
            ? ` ${t('website:common.imageTransparencyHint')}`
            : ''}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {t(error)}
        </p>
      ) : null}
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
