/**
 * What a lesson video is doing, over the video itself (Task D): loading,
 * buffering, slow, or failed — with Retry. One component for every
 * provider (Atlas-hosted MP4/HLS, YouTube), fed by real readiness signals
 * (`useMediaReadiness`, the YouTube embed's own events).
 *
 * NO FLICKER, NO BLOCKED CONTROLS. A short rebuffer (a seek, a bitrate
 * switch) is over before a spinner could be read, so buffering is only
 * shown once it has lasted `BUFFERING_SHOW_AFTER_MS` — a display delay,
 * never a readiness decision. The spinner never takes pointer events, so
 * the native controls under it stay usable; only the slow and error
 * states, which carry a button, do.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MediaPhase } from '../hooks/useMediaReadiness';

export const BUFFERING_SHOW_AFTER_MS = 300;

export interface VideoStatusOverlayProps {
  readonly phase: MediaPhase;
  /** Loading/buffering has made no progress for a while. */
  readonly slow: boolean;
  readonly onRetry: () => void;
  /** Overrides the generic failure message (e.g. a decode error). */
  readonly errorMessage?: string;
}

export function VideoStatusOverlay({
  phase,
  slow,
  onRetry,
  errorMessage,
}: VideoStatusOverlayProps): JSX.Element | null {
  const { t } = useTranslation();
  const [showBuffering, setShowBuffering] = useState(false);

  useEffect(() => {
    if (phase !== 'buffering') {
      setShowBuffering(false);
      return;
    }
    const timer = window.setTimeout(
      () => setShowBuffering(true),
      BUFFERING_SHOW_AFTER_MS
    );
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === 'error') {
    return (
      <div
        role="alert"
        data-testid="video-status-error"
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-4 text-center text-white"
      >
        <AlertTriangle className="size-6" aria-hidden />
        <p className="max-w-sm text-sm">
          {errorMessage ?? t('learning:player.video.loadError')}
        </p>
        <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
          <RotateCcw className="size-4" aria-hidden />
          {t('learning:player.video.retry')}
        </Button>
      </div>
    );
  }

  const spinning =
    phase === 'loading' || (phase === 'buffering' && showBuffering);
  if (!spinning) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/30"
      data-testid="video-status-loading"
      data-phase={phase}
    >
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-2"
      >
        <Loader2
          className="size-8 animate-spin text-white motion-reduce:animate-none"
          aria-hidden
        />
        <span className={slow ? 'text-sm text-white' : 'sr-only'}>
          {slow
            ? t('learning:player.video.slow')
            : phase === 'buffering'
              ? t('learning:player.video.buffering')
              : t('learning:player.video.loading')}
        </span>
      </div>
      {slow ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="pointer-events-auto"
          onClick={onRetry}
        >
          <RotateCcw className="size-4" aria-hidden />
          {t('learning:player.video.retry')}
        </Button>
      ) : null}
    </div>
  );
}
