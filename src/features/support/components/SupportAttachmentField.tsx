/**
 * P53 — choosing (and un-choosing) the optional image on a ticket message.
 *
 * ONE COMPONENT FOR BOTH SURFACES. The new-ticket dialog and the reply
 * composer need identical behaviour, so the picker, the preview, the
 * client-side checks and every string live here once rather than being
 * written twice and drifting.
 *
 * THE CLIENT CHECKS ARE UX, NOT SECURITY, and the comments say so on
 * purpose. `MediaService`'s magic-byte sniff and `MEDIA_MAX_UPLOAD_BYTES`
 * on the server remain the only authority — a picked file that passes here
 * can still be refused there, and that refusal is surfaced by the caller.
 * What these checks buy is not safety but honesty: telling someone their
 * 30 MB photo is too large before they wait for a base64 upload to fail.
 *
 * THE PREVIEW IS A LOCAL OBJECT URL, never a round-trip. Nothing is
 * uploaded until the message is sent, which is what makes "remove" and
 * "replace" free and means an abandoned dialog leaves no orphaned object
 * in storage.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFilePicker } from '@hooks';
import { formatBytes, isAcceptedType, isWithinSizeLimit } from '@utils';
import type { LanguageCode, SupportAttachmentInput } from '@types';

/**
 * Mirrors the server's image allowlist (`detectFileKind`, minus PDF —
 * support attachments are images only). Kept in sync by intent, never
 * trusted: the server re-derives the real kind from the bytes.
 */
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/** Mirrors `MEDIA_MAX_UPLOAD_BYTES`' default. The server enforces the real ceiling. */
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export interface SupportAttachmentFieldProps {
  /** The chosen image, or `undefined` when none is selected. */
  readonly value: SupportAttachmentInput | undefined;
  readonly onChange: (value: SupportAttachmentInput | undefined) => void;
  /** Disables picking while a message is being sent. */
  readonly disabled?: boolean;
}

type LocalError = 'type' | 'size' | 'read' | undefined;

export function SupportAttachmentField({
  value,
  onChange,
  disabled = false,
}: SupportAttachmentFieldProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [error, setError] = useState<LocalError>();
  const filePicker = useFilePicker({ accept: ACCEPTED_IMAGE_TYPES.join(',') });

  /*
    `useFilePicker` reports the picked File through state, so the actual
    read happens in an effect keyed on it. The ref stops the same File
    being processed twice if the component re-renders for another reason —
    reading it again would create a second object URL and orphan the first.
  */
  const processedFileRef = useRef<File | null>(null);
  const previewUrlRef = useRef<string | undefined>();
  previewUrlRef.current = previewUrl;

  const clear = useCallback(() => {
    processedFileRef.current = null;
    filePicker.clearFiles();
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return undefined;
    });
    onChange(undefined);
  }, [filePicker, onChange]);

  useEffect(() => {
    const file = filePicker.files?.[0];
    if (!file || processedFileRef.current === file) return;
    processedFileRef.current = file;

    // `isAcceptedType`/`isWithinSizeLimit` are the codebase's existing file
    // predicates — reused rather than re-expressed as inline comparisons.
    if (!isAcceptedType(file, ACCEPTED_IMAGE_TYPES)) {
      setError('type');
      onChange(undefined);
      return;
    }
    if (!isWithinSizeLimit(file, MAX_ATTACHMENT_BYTES)) {
      setError('size');
      onChange(undefined);
      return;
    }

    setError(undefined);

    const reader = new FileReader();
    reader.onload = () => {
      // Replacing an image revokes the previous preview here rather than in
      // `clear`, so picking a second file never leaves the first one's
      // object URL alive.
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      setPreviewUrl(URL.createObjectURL(file));
      onChange({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        dataUrl: reader.result as string,
      });
    };
    reader.onerror = () => {
      setError('read');
      onChange(undefined);
    };
    reader.readAsDataURL(file);
  }, [filePicker.files, onChange]);

  // Revoke on unmount — a dialog that is closed with an image still
  // selected must not leave its Blob pinned for the rest of the session.
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  const formattedSize = formatBytes(
    value?.sizeBytes ?? 0,
    i18n.language as LanguageCode
  );

  return (
    <div className="space-y-2">
      {value && previewUrl ? (
        <div
          className="flex items-start gap-3 rounded-md border border-border p-2"
          data-testid="support-attachment-preview"
        >
          <img
            src={previewUrl}
            alt={value.fileName}
            className="size-16 shrink-0 rounded object-cover"
          />
          <div className="min-w-0 flex-1 space-y-1">
            {/* `break-all` because a file name has no spaces to wrap at, and
                `dir="auto"` so an Arabic file name reads correctly. */}
            <p className="break-all text-sm font-medium" dir="auto">
              {value.fileName}
            </p>
            {/* `formatBytes` is the codebase's own size formatter: a
                locale-formatted number plus a TRANSLATED unit key, so
                Arabic gets Arabic-Indic digits and an Arabic unit rather
                than a hardcoded "MB". */}
            <p className="text-xs text-muted-foreground">
              {formattedSize.value} {t(formattedSize.unitKey)}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => filePicker.openFilePicker()}
              data-testid="support-attachment-replace"
            >
              <RefreshCw className="size-4" aria-hidden />
              <span className="sr-only">{t('support:attachment.replace')}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={clear}
              data-testid="support-attachment-remove"
            >
              <X className="size-4" aria-hidden />
              <span className="sr-only">{t('support:attachment.remove')}</span>
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => filePicker.openFilePicker()}
          data-testid="support-attachment-add"
        >
          <ImagePlus className="size-4" aria-hidden />
          {t('support:attachment.add')}
        </Button>
      )}

      {error ? (
        <p className="text-sm text-destructive" data-testid="support-attachment-error">
          {t(`support:attachment.errors.${error}`)}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t('support:attachment.help')}
        </p>
      )}
    </div>
  );
}
