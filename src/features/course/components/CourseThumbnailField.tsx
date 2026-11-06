/**
 * B3 (UX audit, V01) — the course image on the Details tab (and the
 * onboarding create form).
 *
 * THE BUG. The picked file was read into a base64 data URL and put in the
 * course's `thumbnail` field, so it travelled inside the course PATCH: a
 * 3 MB PNG made "Saving changes…" spin for minutes and froze the API for
 * everyone. A course list then carried the bytes of every thumbnail.
 *
 * THE FIX. The file is uploaded to the academy's media library first —
 * the same `MediaAsset` upload `WebsiteImageField` uses, and the store the
 * wizard's Media step already picks from — and the course keeps only the
 * returned URL. The type and the 5 MB limit are checked before uploading,
 * and the message names the limit. A failed upload says why and keeps the
 * previous image: it never looks like it worked.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFilePicker } from '@hooks';
import { useFailureReason } from '@forms';
import { isApiError } from '@api';
import { formatBytes, isolateNumericExpression } from '@utils';
import { useUploadMediaAsset } from '@features/media';
import {
  ALLOWED_COURSE_THUMBNAIL_TYPES,
  MAX_COURSE_THUMBNAIL_FILE_SIZE,
} from '../constants/course.constants';

export interface CourseThumbnailFieldProps {
  readonly id: string;
  readonly academyId: string;
  /** The stored image URL, if any. */
  readonly value?: string;
  readonly onChange: (url: string | undefined) => void;
  /** Reports an upload in progress, so the form can hold Save until the URL is known. */
  readonly onUploadingChange?: (uploading: boolean) => void;
  readonly describedBy?: string;
}

export function CourseThumbnailField({
  id,
  academyId,
  value,
  onChange,
  onUploadingChange,
  describedBy,
}: CourseThumbnailFieldProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language === 'ar' ? 'ar' : 'en';
  const failureReason = useFailureReason();
  const [error, setError] = useState<string>();
  const upload = useUploadMediaAsset({ inlineErrors: true });
  const isUploading = upload.isPending;
  const picker = useFilePicker({
    accept: ALLOWED_COURSE_THUMBNAIL_TYPES.join(','),
  });
  const errorId = `${id}-error`;

  const sizeText = (bytes: number) => {
    const { value: amount, unitKey } = formatBytes(bytes, language);
    return `${amount} ${t(unitKey)}`;
  };

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  useEffect(() => {
    const file = picker.files?.[0];
    if (!file) return;
    picker.clearFiles();

    if (!ALLOWED_COURSE_THUMBNAIL_TYPES.includes(file.type)) {
      setError(t('course:create.thumbnailInvalidType'));
      return;
    }
    if (file.size > MAX_COURSE_THUMBNAIL_FILE_SIZE) {
      setError(
        t('validation:imageTooLarge', {
          size: isolateNumericExpression(sizeText(file.size)),
          max: isolateNumericExpression(
            sizeText(MAX_COURSE_THUMBNAIL_FILE_SIZE)
          ),
        })
      );
      return;
    }

    setError(undefined);
    const reader = new FileReader();
    reader.onerror = () => setError(t('course:create.thumbnailReadFailed'));
    reader.onload = () => {
      upload
        .mutateAsync({
          academyId,
          payload: {
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            // The media endpoint takes the bytes as a data URL; only the
            // URL it returns is stored on the course.
            dataUrl: String(reader.result),
          },
        })
        .then((asset) => onChange(asset.url))
        .catch((uploadError: unknown) => {
          if (!isApiError(uploadError)) {
            setError(t('course:create.thumbnailUploadFailed'));
          } else if (
            uploadError.messageKey === 'errors.media.unsupportedFileType' ||
            uploadError.messageKey === 'errors.media.invalidDataUrl'
          ) {
            setError(t('course:create.thumbnailInvalidType'));
          } else if (uploadError.messageKey === 'errors.media.fileTooLarge') {
            setError(
              t('validation:imageTooLarge', {
                size: isolateNumericExpression(sizeText(file.size)),
                max: isolateNumericExpression(
                  sizeText(MAX_COURSE_THUMBNAIL_FILE_SIZE)
                ),
              })
            );
          } else {
            setError(
              `${t('course:create.thumbnailUploadFailed')} ${failureReason(uploadError)}`
            );
          }
        });
    };
    reader.readAsDataURL(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picker.files]);

  return (
    <div className="space-y-3">
      {value ? (
        <img
          src={value}
          alt=""
          data-testid={`${id}-preview`}
          className="h-24 w-auto rounded-lg border border-border"
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          id={id}
          type="button"
          variant="outline"
          size={value ? 'sm' : 'default'}
          onClick={picker.openFilePicker}
          disabled={isUploading}
          aria-describedby={
            [describedBy, error ? errorId : undefined]
              .filter(Boolean)
              .join(' ') || undefined
          }
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : value ? null : (
            <Upload className="size-4" strokeWidth={2} aria-hidden />
          )}
          {isUploading
            ? t('course:create.uploadingThumbnail')
            : value
              ? t('course:create.changeThumbnail')
              : t('course:create.uploadThumbnail')}
        </Button>
        {value && !isUploading ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setError(undefined);
              onChange(undefined);
            }}
          >
            <X className="size-3.5" aria-hidden />
            {t('course:create.removeThumbnail')}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
