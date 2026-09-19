/**
 * The per-viewer watermark drawn over protected video (§D.9, §E.3).
 *
 * A DETERRENT, AND THE PRODUCT SAYS SO (D1). It does not stop anyone with
 * a phone camera, and Atlas never claims it does. What it does is make a
 * casually re-shared recording trace back to the account it came from,
 * which is the actual threat model for paid course content: not a
 * determined pirate, but a learner who drops a screen capture into a
 * group chat.
 *
 * THE TEXT IS THE SERVER'S. `grant.watermark.text` is built from the
 * viewer's own identity server-side precisely so a client cannot blank it
 * by lying, which is also why this component renders what it is given and
 * has no fallback text of its own: an overlay showing a value this file
 * invented would be worse than no overlay, because it would look like
 * evidence.
 *
 * IT MOVES, AND THAT IS NOT DECORATION. A mark fixed in one corner is
 * cropped out in seconds. Drifting slowly between anchor positions means
 * a crop that removes it also removes part of the picture for part of the
 * time. Under `prefers-reduced-motion` the drift stops entirely — a
 * learner with vestibular sensitivity is not the threat this is aimed at,
 * and the mark is still there, still legible, still identifying.
 *
 * `aria-hidden`, deliberately. It is an anti-copying measure aimed at the
 * screen, not information the learner needs read to them, and announcing
 * a drifting account id over every video would be noise in the one place
 * a screen-reader user is trying to follow a lesson.
 */
import { cn } from '@utils';

export interface WatermarkOverlayProps {
  /** The server-composed text. Nothing is rendered when it is empty. */
  readonly text: string;
  readonly className?: string;
}

export function WatermarkOverlay({
  text,
  className,
}: WatermarkOverlayProps): JSX.Element | null {
  if (!text) return null;

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className
      )}
      data-testid="player-watermark"
    >
      <span
        className={cn(
          'absolute start-[8%] top-[12%] select-none whitespace-nowrap',
          'text-xs font-medium tracking-wide text-white/40',
          'mix-blend-difference',
          'animate-watermark-drift motion-reduce:animate-none'
        )}
      >
        {text}
      </span>
    </div>
  );
}
