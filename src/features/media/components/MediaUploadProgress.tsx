/**
 * The visible half of an upload.
 *
 * It appears the instant a file is chosen and stays until the user has
 * seen the outcome, so there is never a moment where something is
 * happening and the screen does not say so.
 *
 * HONEST BY CONSTRUCTION. A determinate bar is rendered only when a real
 * percentage exists — reading the file and sending the bytes both report
 * measured progress. While the SERVER is working there is no signal to
 * report, so the bar becomes an indeterminate animation and the label says
 * what is being waited on. Nothing here ever animates toward a number it
 * cannot substantiate.
 *
 * It does not block the page: it is a strip above the library, not a modal.
 * A user who changes their mind can keep browsing their existing assets
 * while a large file uploads.
 */
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2, RefreshCw, X, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@utils';
import { toErrorsNamespaceKey } from '@utils';
import type { LanguageCode } from '@types';
import type { MediaUploadState } from '../hooks/useMediaUpload';

/**
 * The generic one-line fallback.
 *
 * `.description`, not `errors:generic`. The errors bundle uses two shapes:
 * the top-level kinds (`generic`, `validation`, …) are `{title,
 * description}` objects for `ErrorState`'s two-line card, while specific
 * reasons (`concurrency.staleVersion`, `media.unsupportedFileType`) are
 * plain strings. Asking i18next for the object returns the literal
 * diagnostic "key 'generic (en)' returned an object instead of string",
 * which is what this single-line strip would otherwise have shown a
 * customer.
 */
const GENERIC_FAILURE_KEY = 'errors:generic.description';

/**
 * What to show when an upload fails.
 *
 * WHY THIS IS NOT JUST `t(key)`. The backend names the reason precisely —
 * `errors.media.unsupportedFileType` for a file whose bytes are not what
 * its extension claims — but the errors bundle had no `media` section at
 * all, so the lookup missed and the strip rendered a file name, a size,
 * and a Retry button with NOTHING saying what went wrong. Verified in
 * production before the strings were added.
 *
 * The strings are there now, but the shape of the bug is the real problem:
 * a missing key produced silence, so the next unmapped `messageKey` would
 * fail exactly as invisibly. Asking i18next whether the key exists first
 * means an unmapped reason degrades to the generic message — still not
 * ideal, but the user is told the upload failed instead of being shown a
 * blank line. Same technique `CheckoutPage` already uses for backend
 * errors; see `specificDescriptionKey` there.
 */
function failureText(
  i18n: { exists: (key: string) => boolean },
  t: (key: string) => string,
  messageKey: string | undefined
): string {
  if (!messageKey) return t(GENERIC_FAILURE_KEY);
  const key = toErrorsNamespaceKey(messageKey);
  return i18n.exists(key) ? t(key) : t(GENERIC_FAILURE_KEY);
}

export interface MediaUploadProgressProps {
  readonly state: MediaUploadState;
  readonly onRetry: () => void;
  readonly onDismiss: () => void;
}

export function MediaUploadProgress({
  state,
  onRetry,
  onDismiss,
}: MediaUploadProgressProps): JSX.Element | null {
  const { t, i18n } = useTranslation();

  if (state.stage === 'idle') return null;

  const isBusy =
    state.stage === 'reading' ||
    state.stage === 'uploading' ||
    state.stage === 'processing';
  const failed = state.stage === 'failed';
  const succeeded = state.stage === 'succeeded';

  const size =
    state.fileSizeBytes !== undefined
      ? formatBytes(state.fileSizeBytes, i18n.language as LanguageCode)
      : undefined;

  return (
    <div
      data-testid="media-upload-progress"
      // `status` rather than `alert`: an upload starting is information, not
      // an interruption. `aria-live="polite"` lets a screen-reader user hear
      // the stage change without losing their place.
      role="status"
      aria-live="polite"
      className="space-y-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">
          {isBusy ? (
            <Loader2
              className="size-4 animate-spin text-muted-foreground"
              aria-hidden
            />
          ) : succeeded ? (
            <CheckCircle2 className="size-4 text-success" aria-hidden />
          ) : (
            <AlertCircle className="size-4 text-destructive" aria-hidden />
          )}
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-medium text-foreground">
            {state.fileName}
          </p>
          <p className="text-xs text-muted-foreground">
            {failed
              ? failureText(i18n, t, state.error?.messageKey)
              : t(`media:upload.stage.${state.stage}`)}
            {size ? ` · ${size.value} ${t(size.unitKey)}` : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {failed ? (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="size-3.5" aria-hidden />
              {t('media:upload.retry')}
            </Button>
          ) : null}
          {/* Dismissable only once there is nothing in flight to dismiss. */}
          {!isBusy ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              aria-label={t('media:upload.dismiss')}
            >
              <X className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>

      {isBusy ? (
        state.percent === undefined ? (
          /*
            No measurable progress for this stage. A moving stripe says
            "working" without claiming to know how far along it is — which
            is the truth while the server validates and stores the file.
          */
          <div
            className="relative h-2 w-full overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-label={t(`media:upload.stage.${state.stage}`)}
          >
            <div className="absolute inset-y-0 w-2/5 animate-progress-indeterminate rounded-full bg-primary" />
          </div>
        ) : (
          <div className="space-y-1">
            <Progress value={state.percent} aria-label={state.fileName} />
            <p
              className="text-end text-xs tabular-nums text-muted-foreground"
              data-atlas-numeric="true"
            >
              {t('media:upload.percent', { percent: state.percent })}
            </p>
          </div>
        )
      ) : null}
    </div>
  );
}
