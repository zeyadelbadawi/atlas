/**
 * The forensic watermark frame — every video Atlas plays is drawn inside one
 * (backend `docs/FORENSIC_WATERMARK.md`).
 *
 * MANDATORY. Academies cannot turn it off, the server refuses to sign a
 * video credential without a code, and this frame is the only place a
 * player puts its media. A deterrent and a trace — never described as
 * making a recording impossible.
 *
 * TWO LAYERS, BOTH THE SERVER'S TEXT:
 *   1. a readable label — the viewer's code plus a masked hint of their
 *      account — that jumps to a new random spot every 20–45 seconds, so a
 *      fixed crop or blur cannot cover it for long;
 *   2. a very faint, rotated tile of the same code over the whole picture,
 *      slowly drifting, so painting out the label still leaves the code
 *      everywhere in the recording.
 * Neither intercepts the pointer: the player's own controls stay usable.
 *
 * THE LAYERS ARE NOT REACT'S. They are built by this component directly
 * into a host element it appends to the stage. Someone deleting a layer —
 * or the whole host — in devtools must not be able to crash the page when
 * React later unmounts it, and React would (it removes the nodes it
 * rendered, and throws when one is no longer where it left it). Resuming
 * after a tamper simply builds a fresh host and drops the old one.
 *
 * FULLSCREEN IS THE FRAME, never the media (`useForensicFullscreen`): a
 * media element's own fullscreen would show the video without the layers.
 *
 * THE WATCHDOG (`useWatermarkWatchdog`) pauses playback and tells the
 * server once when a layer is removed or hidden; the viewer can resume,
 * which redraws the layers — and trips again if they are still hidden.
 *
 * `aria-hidden` layers: an anti-copying mark aimed at the screen, not
 * information to read aloud over every lesson. The caption under the
 * player (`ForensicWatermarkCaption`) is the accessible explanation.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Minimize2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@utils';
import type { ResolvedWatermark } from './watermark-display';
import { watermarkTamperService } from './watermark-tamper.service';
import { buildWatermarkPattern } from './watermark-pattern';
import { useForensicFullscreen } from './useForensicFullscreen';
import {
  useWatermarkWatchdog,
  type WatermarkTamperReason,
} from './useWatermarkWatchdog';

/** The label stays put between 20 and 45 seconds, then jumps. */
const MOVE_MIN_MS = 20_000;
const MOVE_SPREAD_MS = 25_000;
/** One tamper report per frame per 30 s — the server throttles too. */
const REPORT_INTERVAL_MS = 30_000;

/*
  Class lists for the imperatively built layers. Kept as whole literals so
  Tailwind's scanner generates every one of them.
*/
const PATTERN_CLASSES =
  'pointer-events-none absolute inset-0 select-none animate-watermark-pattern-drift motion-reduce:animate-none';
const LABEL_CLASSES =
  'pointer-events-none absolute z-[1] select-none whitespace-nowrap rounded px-1.5 py-0.5 font-mono font-semibold tracking-wider text-white/60 [font-size:clamp(10px,1.2vw,18px)] [text-shadow:0_0_2px_rgba(0,0,0,0.75),0_0_1px_rgba(0,0,0,0.9)] transition-opacity duration-300 motion-reduce:transition-none';
const LABEL_SECONDARY_CLASSES = 'font-sans font-medium tracking-normal';
/** The jump's dim stays well above the watchdog's "hidden" threshold. */
const LABEL_MOVING_OPACITY = '0.4';

interface LabelPosition {
  /** Percent of the stage width, from the inline start. */
  readonly inline: number;
  /** Percent of the stage height, from the top. */
  readonly block: number;
}

/** Anywhere the whole label still fits, away from the very edges. */
function randomPosition(previous?: LabelPosition): LabelPosition {
  const draw = () => ({
    inline: 4 + Math.random() * 58,
    block: 6 + Math.random() * 74,
  });
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const next = draw();
    // Visibly somewhere else, not a nudge.
    if (
      !previous ||
      Math.abs(next.inline - previous.inline) +
        Math.abs(next.block - previous.block) >
        30
    ) {
      return next;
    }
  }
  return draw();
}

export interface ForensicWatermarkFrameHandle {
  readonly toggleFullscreen: () => void;
  readonly isFullscreen: boolean;
}

export interface ForensicWatermarkFrameProps {
  readonly watermark: ResolvedWatermark;
  /** The media, sized by its own `AspectRatio`. */
  readonly children: ReactNode;
  /** The `<video>`, so its native (iOS) fullscreen can be redirected. */
  readonly mediaRef?: RefObject<HTMLElement>;
  /** Stop playback — a watermark layer was removed or hidden. */
  readonly onTamper?: (reason: WatermarkTamperReason) => void;
  /** Fullscreen state changes, for a caller drawing its own button. */
  readonly onFullscreenChange?: (active: boolean) => void;
  readonly className?: string;
}

export const ForensicWatermarkFrame = forwardRef<
  ForensicWatermarkFrameHandle,
  ForensicWatermarkFrameProps
>(function ForensicWatermarkFrame(
  { watermark, children, mediaRef, onTamper, onFullscreenChange, className },
  ref
) {
  const { t } = useTranslation();
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const patternRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<LabelPosition>(() =>
    randomPosition()
  );
  const [moving, setMoving] = useState(false);
  const [tampered, setTampered] = useState(false);
  // A fresh layer host on resume, undoing any DOM edit.
  const [generation, setGeneration] = useState(0);
  const lastReportRef = useRef(0);

  const fullscreen = useForensicFullscreen(frameRef, mediaRef);

  useImperativeHandle(
    ref,
    () => ({
      toggleFullscreen: fullscreen.toggle,
      isFullscreen: fullscreen.active,
    }),
    [fullscreen.toggle, fullscreen.active]
  );

  useEffect(() => {
    onFullscreenChange?.(fullscreen.active);
  }, [fullscreen.active, onFullscreenChange]);

  const secondary =
    watermark.kind === 'preview'
      ? [watermark.secondary, t('learning:watermark.previewTag')]
          .filter(Boolean)
          .join(' · ')
      : watermark.secondary;

  // Build the layers (again, on resume or when the server's text changes).
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const host = document.createElement('div');
    host.style.display = 'contents';
    host.setAttribute('data-forensic-layers', '');

    const pattern = document.createElement('div');
    pattern.className = PATTERN_CLASSES;
    pattern.setAttribute('aria-hidden', 'true');
    pattern.setAttribute('data-testid', 'forensic-watermark-pattern');
    pattern.style.backgroundImage = buildWatermarkPattern(watermark.primary);

    const label = document.createElement('span');
    label.className = LABEL_CLASSES;
    label.setAttribute('aria-hidden', 'true');
    label.setAttribute('data-testid', 'forensic-watermark-label');
    label.setAttribute('data-ltr-content', '');
    label.dir = 'ltr';
    label.append(document.createTextNode(watermark.primary));
    if (secondary) {
      const detail = document.createElement('span');
      detail.className = LABEL_SECONDARY_CLASSES;
      detail.textContent = ` · ${secondary}`;
      label.append(detail);
    }

    host.append(pattern, label);
    stage.appendChild(host);
    patternRef.current = pattern;
    labelRef.current = label;
    return () => {
      host.remove();
      if (patternRef.current === pattern) patternRef.current = null;
      if (labelRef.current === label) labelRef.current = null;
    };
  }, [generation, watermark.primary, secondary]);

  // Where the label is, and its dim while it jumps.
  useLayoutEffect(() => {
    const label = labelRef.current;
    if (!label) return;
    label.style.top = `${position.block}%`;
    label.style.insetInlineStart = `${position.inline}%`;
    label.style.opacity = moving ? LABEL_MOVING_OPACITY : '';
  }, [position, moving, generation, watermark.primary, secondary]);

  // The label's jumps: dim, move, brighten (instant under reduced motion).
  useEffect(() => {
    let timer: number;
    let fade: number;
    const schedule = () => {
      timer = window.setTimeout(
        () => {
          setMoving(true);
          fade = window.setTimeout(() => {
            setPosition((previous) => randomPosition(previous));
            setMoving(false);
            schedule();
          }, 350);
        },
        MOVE_MIN_MS + Math.random() * MOVE_SPREAD_MS
      );
    };
    schedule();
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(fade);
    };
  }, []);

  const handleTamper = useCallback(
    (reason: WatermarkTamperReason) => {
      setTampered(true);
      onTamper?.(reason);
      const now = Date.now();
      if (watermark.code && now - lastReportRef.current > REPORT_INTERVAL_MS) {
        lastReportRef.current = now;
        void watermarkTamperService
          .report(watermark.code)
          .catch(() => undefined);
      }
    },
    [onTamper, watermark.code]
  );

  useWatermarkWatchdog({
    frameRef,
    labelRef,
    patternRef,
    expectedText: watermark.primary,
    enabled: !tampered,
    onTamper: handleTamper,
  });

  return (
    <div
      ref={frameRef}
      data-forensic-frame
      data-fullscreen={fullscreen.active ? 'true' : undefined}
      className={cn(
        'relative overflow-hidden bg-black',
        fullscreen.active ? 'flex items-center justify-center' : 'rounded-lg',
        fullscreen.pseudo && 'fixed inset-0 z-[100] rounded-none',
        className
      )}
    >
      <div
        ref={stageRef}
        // The picture's own stage: letterboxed to 16:9 inside a fullscreen
        // frame, so the layers sit on the video and not on the black bars.
        className="relative w-full"
        style={
          fullscreen.active
            ? { width: 'min(100%, calc(100dvh * 16 / 9))' }
            : undefined
        }
      >
        {children}

        {tampered ? (
          <div
            role="alertdialog"
            aria-modal="false"
            aria-labelledby="forensic-tamper-title"
            aria-describedby="forensic-tamper-description"
            className="absolute inset-0 z-[3] flex flex-col items-center justify-center gap-3 bg-black/90 p-6 text-center text-white"
            data-testid="forensic-watermark-tamper"
          >
            <ShieldAlert className="size-8 text-warning" aria-hidden />
            <p id="forensic-tamper-title" className="text-base font-semibold">
              {t('learning:watermark.tamper.title')}
            </p>
            <p
              id="forensic-tamper-description"
              className="max-w-md text-sm text-white/80"
            >
              {t('learning:watermark.tamper.description')}
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setGeneration((value) => value + 1);
                setTampered(false);
              }}
            >
              {t('learning:watermark.tamper.resume')}
            </Button>
          </div>
        ) : null}
      </div>

      {fullscreen.active ? (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={fullscreen.exit}
          aria-label={t('learning:watermark.exitFullscreen')}
          className="absolute end-3 top-3 z-[4] size-9 bg-black/60 text-white opacity-70 hover:bg-black/80 hover:opacity-100 focus-visible:opacity-100"
        >
          <Minimize2 className="size-4" aria-hidden />
        </Button>
      ) : null}
    </div>
  );
});
