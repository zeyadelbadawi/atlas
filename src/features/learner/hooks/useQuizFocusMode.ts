/**
 * Quiz focus mode (B0-LRN-11) — see `quiz-focus.utils.ts` in `@utils`.
 *
 * The one case it covers: the quiz requires full screen and this browser
 * cannot do it (`fullscreenView` says `unsupported`; every browser on
 * iPhone). The attempt still continues and the reviewer still sees
 * `fullscreen_unavailable`; focus mode only changes the layout around the
 * quiz. Browsers that can go full screen are never put in focus mode.
 */
import { useEffect } from 'react';
import { QUIZ_FOCUS_ATTRIBUTE } from '@utils';
import type { FullscreenView } from './useQuizFullscreen';

/** Whether the running attempt takes the focus layout. */
export function quizFocusMode(view: FullscreenView): boolean {
  return view === 'unsupported';
}

/** Marks `<body>` while `active`; the mark goes when it stops or the caller unmounts. */
export function useQuizFocusMode(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    document.body.setAttribute(QUIZ_FOCUS_ATTRIBUTE, '');
    return () => document.body.removeAttribute(QUIZ_FOCUS_ATTRIBUTE);
  }, [active]);
}
