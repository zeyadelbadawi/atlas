/**
 * Full screen for a quiz that requires it (P4).
 *
 * THE DOCUMENT goes full screen, not the quiz container: dialogs (the
 * submit confirmation, integrity warnings) render in a portal on
 * `document.body`, which would be invisible outside a full-screen
 * container.
 *
 * `request()` must be called synchronously from a user gesture (a click):
 * browsers refuse `requestFullscreen()` otherwise. It never throws; the
 * result says what happened, so the caller can record it and offer the
 * next step. Whether the attempt requires full screen is the SERVER's
 * decision (the attempt's settings snapshot), never this hook's.
 */
import { useCallback, useEffect, useState } from 'react';

export type FullscreenRequestResult = 'entered' | 'refused' | 'unsupported';

/** The Fullscreen API is present and allowed here (not, e.g., iPhone Safari or a frame without `allowfullscreen`). */
export function isFullscreenSupported(doc: Document = document): boolean {
  return (
    doc.fullscreenEnabled === true &&
    typeof doc.documentElement.requestFullscreen === 'function'
  );
}

export interface QuizFullscreenControl {
  readonly supported: boolean;
  readonly active: boolean;
  /** The outcome of the last request, `null` before any. */
  readonly lastResult: FullscreenRequestResult | null;
  /** Call from a click handler, before any `await`. */
  readonly request: () => Promise<FullscreenRequestResult>;
  readonly exit: () => void;
}

export function useQuizFullscreen(): QuizFullscreenControl {
  const [supported] = useState(() => isFullscreenSupported());
  const [active, setActive] = useState(() => !!document.fullscreenElement);
  const [lastResult, setLastResult] = useState<FullscreenRequestResult | null>(
    null
  );

  useEffect(() => {
    const onChange = () => setActive(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const request = useCallback((): Promise<FullscreenRequestResult> => {
    const settle = (result: FullscreenRequestResult) => {
      setLastResult(result);
      return result;
    };
    if (!isFullscreenSupported()) return Promise.resolve(settle('unsupported'));
    if (document.fullscreenElement) return Promise.resolve(settle('entered'));
    // Called synchronously here, inside the caller's gesture.
    return document.documentElement.requestFullscreen().then(
      () => settle('entered'),
      () => settle('refused')
    );
  }, []);

  const exit = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) {
      void document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  return { supported, active, lastResult, request, exit };
}

export type FullscreenView =
  /** Not required, or in full screen: the attempt shows normally. */
  | 'none'
  /** The browser cannot do full screen: a notice, and the attempt continues. */
  | 'unsupported'
  /** Required and not in full screen: the questions wait behind the gate. */
  | 'gate'
  /** The browser refused: the gate also offers to continue without it. */
  | 'gate-refused';

/**
 * The exit policy, as one decision (P4):
 * - not required → nothing;
 * - unsupported → a notice; never blocked (recorded for the reviewer);
 * - in full screen, or the learner chose to continue after a refusal → normal;
 * - otherwise the questions are hidden until the learner returns (answers
 *   and the timer are kept); after a refusal the gate offers to continue
 *   without full screen (recorded).
 */
export function fullscreenView(input: {
  readonly required: boolean;
  readonly supported: boolean;
  readonly active: boolean;
  readonly lastResult: FullscreenRequestResult | null;
  readonly continuedWithout: boolean;
}): FullscreenView {
  if (!input.required) return 'none';
  if (!input.supported) return 'unsupported';
  if (input.active || input.continuedWithout) return 'none';
  return input.lastResult === 'refused' ? 'gate-refused' : 'gate';
}
