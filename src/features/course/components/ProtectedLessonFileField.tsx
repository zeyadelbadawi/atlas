/**
 * B0-MED-05 — the File lesson's file, uploaded to the protected tier.
 *
 * A File lesson used to store a public media-library URL: anyone the link
 * was forwarded to could download a paid course's PDF without signing in.
 * The file chosen here goes to `POST /academies/:id/media/protected` the
 * moment it is picked; the lesson dialog attaches it after the lesson
 * saves, and learners only ever receive a short-lived signed link.
 *
 * The server checks the real bytes (PDF or image) and who may upload
 * (academy owner or manager); its refusal is shown here as it comes.
 */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2, ShieldCheck, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiErrorMessage } from '@utils';
import type { ProtectedLessonFile } from '@types';

/** What the server's byte check accepts for a protected file. */
export const PROTECTED_LESSON_FILE_ACCEPT =
  'application/pdf,image/png,image/jpeg,image/gif,image/webp';

/**
 * The upload is a base64 data URL in a JSON body, which grows the file by a
 * third; the upload route's body limit is 30 MB, so 20 MB of file is the
 * most that reliably fits.
 */
export const MAX_PROTECTED_LESSON_FILE_BYTES = 20 * 1024 * 1024;

export interface ProtectedLessonFileFieldProps {
  /** The file chosen in this dialog, already uploaded. */
  readonly value?: { readonly mediaAssetId: string; readonly fileName: string };
  readonly onChange: (value: {
    readonly mediaAssetId: string;
    readonly fileName: string;
  }) => void;
  readonly onUpload: (file: File) => Promise<ProtectedLessonFile>;
  /** The lesson already delivers a protected file (edit mode). */
  readonly hasProtectedFile: boolean;
  /** The lesson still points at a public link (a legacy File lesson). */
  readonly hasPublicLink: boolean;
  readonly onUploadingChange?: (uploading: boolean) => void;
}

export function ProtectedLessonFileField({
  value,
  onChange,
  onUpload,
  hasProtectedFile,
  hasPublicLink,
  onUploadingChange,
}: ProtectedLessonFileFieldProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setBusy = (busy: boolean) => {
    setUploading(busy);
    onUploadingChange?.(busy);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.size > MAX_PROTECTED_LESSON_FILE_BYTES) {
      setError(t('course:builder.lessonDialog.protectedFile.tooLarge'));
      return;
    }
    setBusy(true);
    try {
      const uploaded = await onUpload(file);
      onChange({ mediaAssetId: uploaded.id, fileName: uploaded.fileName });
    } catch (caught) {
      setError(apiErrorMessage(t, i18n, caught));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const attached = !!value || hasProtectedFile;

  return (
    <div className="space-y-2" data-testid="protected-lesson-file">
      <p className="text-sm font-medium leading-none" id="protected-file-label">
        {t('course:builder.lessonDialog.protectedFile.label')}
      </p>

      {value ? (
        <p
          className="flex items-start gap-2 text-sm text-foreground"
          role="status"
        >
          <ShieldCheck
            className="mt-0.5 size-4 shrink-0 text-success"
            aria-hidden
          />
          <span>
            {t('course:builder.lessonDialog.protectedFile.uploaded', {
              fileName: value.fileName,
            })}
          </span>
        </p>
      ) : hasProtectedFile ? (
        <p className="flex items-start gap-2 text-sm text-foreground">
          <ShieldCheck
            className="mt-0.5 size-4 shrink-0 text-success"
            aria-hidden
          />
          <span>{t('course:builder.lessonDialog.protectedFile.attached')}</span>
        </p>
      ) : hasPublicLink ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription>
            {t('course:builder.lessonDialog.protectedFile.publicLink')}
          </AlertDescription>
        </Alert>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        accept={PROTECTED_LESSON_FILE_ACCEPT}
        data-testid="protected-lesson-file-input"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        disabled={uploading}
        aria-describedby="protected-file-help"
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Upload className="size-4" aria-hidden />
        )}
        {t(
          uploading
            ? 'course:builder.lessonDialog.protectedFile.uploading'
            : attached
              ? 'course:builder.lessonDialog.protectedFile.replace'
              : 'course:builder.lessonDialog.protectedFile.upload'
        )}
      </Button>
      <p id="protected-file-help" className="text-xs text-muted-foreground">
        {t('course:builder.lessonDialog.protectedFile.help')}
      </p>
      {error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
