/**
 * The forensic watermark's watchdog.
 *
 * Someone who controls their own browser can always edit the page — that is
 * not preventable, and the product never claims otherwise. What this does is
 * make the cheap edits (deleting the layer in devtools, a userstyle that
 * hides it, an extension that blanks it) cost the viewer their playback and
 * leave a trace: the video pauses, the player says why, and the server is
 * told once (`POST /learning/watermarks/tamper`, counted only on the
 * viewer's own code).
 *
 * CONSERVATIVE ON PURPOSE. A false alarm interrupts a paying learner, so it
 * only trips on unambiguous signals — a layer removed or moved out of the
 * frame, its code text changed, `display: none` / `visibility: hidden`,
 * effective opacity near zero, or shrunk to nothing — and never while the
 * frame itself is not laid out (a collapsed tab, a closed dialog, a test
 * environment). "Covered by something" is deliberately NOT checked: menus,
 * tooltips and dialogs legitimately sit over a player.
 */
import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export type WatermarkTamperReason = 'removed' | 'altered' | 'hidden' | 'shrunk';

/** How often the layers are re-checked even without a DOM mutation. */
const CHECK_INTERVAL_MS = 2_000;
/** Below this effective opacity a layer counts as hidden. */
const MIN_EFFECTIVE_OPACITY = 0.2;

function effectiveOpacity(element: HTMLElement, stopAt: HTMLElement): number {
  let opacity = 1;
  let node: HTMLElement | null = element;
  while (node && node !== stopAt.parentElement) {
    const value = Number.parseFloat(getComputedStyle(node).opacity);
    if (Number.isFinite(value)) opacity *= value;
    node = node.parentElement;
  }
  return opacity;
}

function isLaidOut(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/** The first problem found with one layer, or `null`. */
function inspectLayer(
  layer: HTMLElement | null,
  frame: HTMLElement,
  options: {
    readonly expectedText?: string;
    readonly minWidth: number;
    readonly minHeight: number;
    readonly expectBackground?: boolean;
  }
): WatermarkTamperReason | null {
  if (!layer || !layer.isConnected || !frame.contains(layer)) return 'removed';
  if (
    options.expectedText !== undefined &&
    !(layer.textContent ?? '').includes(options.expectedText)
  ) {
    return 'altered';
  }
  const style = getComputedStyle(layer);
  if (style.display === 'none' || style.visibility === 'hidden')
    return 'hidden';
  if (
    options.expectBackground &&
    !style.backgroundImage.includes('data:image/svg')
  ) {
    return 'altered';
  }
  if (layer.getClientRects().length === 0) return 'hidden';
  if (effectiveOpacity(layer, frame) < MIN_EFFECTIVE_OPACITY) return 'hidden';
  const rect = layer.getBoundingClientRect();
  if (rect.width < options.minWidth || rect.height < options.minHeight) {
    return 'shrunk';
  }
  return null;
}

export interface WatermarkWatchdogOptions {
  readonly frameRef: RefObject<HTMLElement>;
  readonly labelRef: RefObject<HTMLElement>;
  readonly patternRef: RefObject<HTMLElement>;
  /** The text the label must keep showing (the code). */
  readonly expectedText: string;
  /** Off while already tripped, until the viewer resumes. */
  readonly enabled: boolean;
  readonly onTamper: (reason: WatermarkTamperReason) => void;
}

export function useWatermarkWatchdog({
  frameRef,
  labelRef,
  patternRef,
  expectedText,
  enabled,
  onTamper,
}: WatermarkWatchdogOptions): void {
  const onTamperRef = useRef(onTamper);
  onTamperRef.current = onTamper;

  useEffect(() => {
    const frame = frameRef.current;
    if (!enabled || !frame) return undefined;

    let tripped = false;
    const check = () => {
      if (tripped || !frame.isConnected || !isLaidOut(frame)) return;
      // The pattern covers the picture's own stage (letterboxed inside the
      // frame in fullscreen), so it is measured against that stage.
      const stage = patternRef.current?.parentElement ?? frame;
      const stageRect = stage.getBoundingClientRect();
      const reason =
        inspectLayer(labelRef.current, frame, {
          expectedText,
          minWidth: 24,
          minHeight: 6,
        }) ??
        inspectLayer(patternRef.current, frame, {
          minWidth: stageRect.width * 0.9,
          minHeight: stageRect.height * 0.9,
          expectBackground: true,
        });
      if (reason) {
        tripped = true;
        onTamperRef.current(reason);
      }
    };

    // A busy subtree (the Zoom SDK repaints constantly) is checked at most
    // every 250 ms; the interval covers edits that mutate nothing in it
    // (an injected stylesheet).
    let pending: number | null = null;
    const scheduleCheck = () => {
      if (pending !== null) return;
      pending = window.setTimeout(() => {
        pending = null;
        check();
      }, 250);
    };

    const observer = new MutationObserver(scheduleCheck);
    observer.observe(frame, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      observer.disconnect();
      window.clearInterval(interval);
      if (pending !== null) window.clearTimeout(pending);
    };
  }, [enabled, expectedText, frameRef, labelRef, patternRef]);
}
