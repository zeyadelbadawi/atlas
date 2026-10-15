/**
 * B0-MED-11 — a Video lesson's Atlas-hosted video: upload one, or pick one
 * the academy already uploaded. Shown only while `hostedVideoAuthoring` is
 * on (the Normal tier enabled in production, B0-OC-34).
 *
 * The video is protected: learners reach it only through a short-lived,
 * signed grant, with the device rules and the forensic watermark. Upload
 * and quota refusals from the server are shown as they come.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Film, Loader2, ShieldCheck, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiErrorMessage } from '@utils';
import type { HostedVideoAsset } from '@types';
import {
  HOSTED_VIDEO_ACCEPT,
  MAX_HOSTED_VIDEO_BYTES,
  isHostedVideoUploadError,
  type HostedVideoUploadOptions,
  type HostedVideoUploadPhase,
  type UploadedHostedVideo,
} from '../utils/hosted-video-upload';

const NS = 'course:builder.lessonDialog.hostedVideo';

export interface HostedVideoValue {
  readonly mediaAssetId: string;
  /** Empty when only the id is known (an existing lesson being edited). */
  readonly fileName: string;
}

export interface HostedVideoFieldProps {
  /** `null` = explicitly removed in this dialog; `undefined` = none. */
  readonly value: HostedVideoValue | null | undefined;
  readonly onChange: (value: HostedVideoValue | null) => void;
  readonly onUpload: (
    file: File,
    onProgress: (percent: number) => void,
    options: HostedVideoUploadOptions
  ) => Promise<UploadedHostedVideo>;
  readonly loadLibrary: () => Promise<readonly HostedVideoAsset[]>;
  readonly onUploadingChange?: (uploading: boolean) => void;
}

export function HostedVideoField({
  value,
  onChange,
  onUpload,
  loadLibrary,
  onUploadingChange,
}: HostedVideoFieldProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [phase, setPhase] = useState<HostedVideoUploadPhase>('uploading');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Aborts the transfer on Cancel, and when the dialog closes mid-upload —
  // either way the upload helper releases the server-side reservation.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);
  const [library, setLibrary] = useState<readonly HostedVideoAsset[] | null>(
    null
  );
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  const uploading = progress !== null;
  const setBusy = (busy: boolean) => {
    setProgress(busy ? 0 : null);
    onUploadingChange?.(busy);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setNotice(null);
    if (file.type && file.type !== HOSTED_VIDEO_ACCEPT) {
      setError(t(`${NS}.wrongType`));
      return;
    }
    if (file.size > MAX_HOSTED_VIDEO_BYTES) {
      setError(t(`${NS}.tooLarge`));
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('uploading');
    setBusy(true);
    try {
      const uploaded = await onUpload(file, setProgress, {
        signal: controller.signal,
        onPhase: setPhase,
      });
      onChange({ mediaAssetId: uploaded.id, fileName: uploaded.fileName });
    } catch (caught) {
      if (isHostedVideoUploadError(caught)) {
        // The storage leg has no server message: say what happened.
        if (caught.reason === 'cancelled') setNotice(t(`${NS}.cancelled`));
        else setError(t(`${NS}.uploadFailed`));
      } else {
        setError(apiErrorMessage(t, i18n, caught));
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const openLibrary = async () => {
    setError(null);
    setLoadingLibrary(true);
    try {
      setLibrary(await loadLibrary());
    } catch (caught) {
      setError(apiErrorMessage(t, i18n, caught));
    } finally {
      setLoadingLibrary(false);
    }
  };

  // Only videos whose upload finished can be attached (the server refuses
  // pending/failed ones too).
  const choices = (library ?? []).filter(
    (asset) =>
      asset.processingStatus === 'ready' ||
      asset.processingStatus === 'processing'
  );

  return (
    <div className="space-y-2" data-testid="hosted-video-field">
      <p className="text-sm font-medium leading-none">{t(`${NS}.label`)}</p>

      {value ? (
        <div className="flex items-start justify-between gap-2" role="status">
          <p className="flex items-start gap-2 text-sm text-foreground">
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0 text-success"
              aria-hidden
            />
            <span dir="auto">
              {value.fileName
                ? t(`${NS}.attachedNamed`, { fileName: value.fileName })
                : t(`${NS}.attached`)}
            </span>
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            data-testid="hosted-video-remove"
            onClick={() => onChange(null)}
          >
            <X className="size-4" aria-hidden />
            {t(`${NS}.remove`)}
          </Button>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        accept={HOSTED_VIDEO_ACCEPT}
        data-testid="hosted-video-input"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          data-testid="hosted-video-upload"
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="size-4" aria-hidden />
          )}
          {uploading
            ? phase === 'processing'
              ? t(`${NS}.processing`)
              : t(`${NS}.uploading`, { percent: progress ?? 0 })
            : value
              ? t(`${NS}.replace`)
              : t(`${NS}.upload`)}
        </Button>
        {uploading && phase === 'uploading' ? (
          <Button
            type="button"
            variant="ghost"
            data-testid="hosted-video-cancel"
            onClick={() => abortRef.current?.abort()}
          >
            <X className="size-4" aria-hidden />
            {t(`${NS}.cancel`)}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          disabled={uploading || loadingLibrary}
          data-testid="hosted-video-library"
          onClick={() => void openLibrary()}
        >
          {loadingLibrary ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Film className="size-4" aria-hidden />
          )}
          {t(`${NS}.chooseExisting`)}
        </Button>
      </div>

      {uploading ? (
        <div
          className="h-1.5 w-full overflow-hidden rounded bg-muted"
          role="progressbar"
          aria-label={t(`${NS}.progressLabel`)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress ?? 0}
        >
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${progress ?? 0}%` }}
          />
        </div>
      ) : null}

      {library !== null ? (
        choices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t(`${NS}.libraryEmpty`)}
          </p>
        ) : (
          <Select
            onValueChange={(id) => {
              const asset = choices.find((entry) => entry.id === id);
              if (asset)
                onChange({ mediaAssetId: asset.id, fileName: asset.fileName });
            }}
          >
            <SelectTrigger
              aria-label={t(`${NS}.libraryLabel`)}
              data-testid="hosted-video-select"
            >
              <SelectValue placeholder={t(`${NS}.libraryPlaceholder`)} />
            </SelectTrigger>
            <SelectContent>
              {choices.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  <span dir="auto">{asset.fileName}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      ) : null}

      <p className="text-xs text-muted-foreground">{t(`${NS}.help`)}</p>
      {notice ? (
        <p
          role="status"
          className="text-sm text-muted-foreground"
          data-testid="hosted-video-notice"
        >
          {notice}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="text-sm text-destructive"
          data-testid="hosted-video-error"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
