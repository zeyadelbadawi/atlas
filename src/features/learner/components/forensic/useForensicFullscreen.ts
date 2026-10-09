/**
 * Fullscreen that keeps the forensic watermark on screen.
 *
 * THE GAP THIS CLOSES. A `<video>`'s own fullscreen (its native button, a
 * double-click, Safari's controls, iOS's native player) puts THE ELEMENT on
 * screen — and only the element: the watermark layers drawn over it by the
 * page are left behind. So fullscreen here is always the FRAME (video plus
 * watermark), never the media.
 *
 * - `enter()` asks for fullscreen on the frame; where the Fullscreen API
 *   cannot do that (iPhone Safari only fullscreens `<video>`), the frame
 *   fills the viewport instead ("pseudo" fullscreen) — same picture, same
 *   watermark, Escape or the exit button to leave.
 * - If the MEDIA itself ends up fullscreen anyway (a browser that ignores
 *   `controlsList="nofullscreen"`), it is taken out at once and the frame
 *   is shown filling the viewport instead. A fresh fullscreen request would
 *   need a user gesture this handler does not have, hence the pseudo mode.
 * - iOS `webkitbeginfullscreen` on the video gets the same treatment.
 */
import { useCallback, useEffect, useState } from 'react';
import type { RefObject } from 'react';

type WebkitDocument = Document & {
  readonly webkitFullscreenElement?: Element | null;
  readonly webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type WebkitVideo = HTMLVideoElement & {
  webkitExitFullscreen?: () => void;
  readonly webkitDisplayingFullscreen?: boolean;
};

function fullscreenElement(): Element | null {
  const doc = document as WebkitDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function exitNativeFullscreen(): void {
  const doc = document as WebkitDocument;
  try {
    if (doc.exitFullscreen) void doc.exitFullscreen().catch(() => undefined);
    else void doc.webkitExitFullscreen?.();
  } catch {
    // Already out.
  }
}

export interface ForensicFullscreen {
  /** The frame is native-fullscreen or filling the viewport. */
  readonly active: boolean;
  /** Filling the viewport without the Fullscreen API. */
  readonly pseudo: boolean;
  readonly enter: () => void;
  readonly exit: () => void;
  readonly toggle: () => void;
}

export function useForensicFullscreen(
  frameRef: RefObject<HTMLElement>,
  mediaRef?: RefObject<HTMLElement>
): ForensicFullscreen {
  const [native, setNative] = useState(false);
  const [pseudo, setPseudo] = useState(false);

  const enter = useCallback(() => {
    const frame = frameRef.current as WebkitElement | null;
    if (!frame) return;
    const doc = document as WebkitDocument;
    const canNative =
      (doc.fullscreenEnabled &&
        typeof frame.requestFullscreen === 'function') ||
      (doc.webkitFullscreenEnabled &&
        typeof frame.webkitRequestFullscreen === 'function');
    if (!canNative) {
      setPseudo(true);
      return;
    }
    try {
      const request = frame.requestFullscreen
        ? frame.requestFullscreen()
        : frame.webkitRequestFullscreen?.();
      void Promise.resolve(request).catch(() => setPseudo(true));
    } catch {
      setPseudo(true);
    }
  }, [frameRef]);

  const exit = useCallback(() => {
    if (fullscreenElement() === frameRef.current) exitNativeFullscreen();
    setPseudo(false);
  }, [frameRef]);

  const toggle = useCallback(() => {
    if (native || pseudo) exit();
    else enter();
  }, [native, pseudo, enter, exit]);

  // Track the frame's own fullscreen; redirect the media's.
  useEffect(() => {
    const onChange = () => {
      const frame = frameRef.current;
      const current = fullscreenElement();
      setNative(!!frame && current === frame);
      if (frame && current && current !== frame && frame.contains(current)) {
        exitNativeFullscreen();
        setPseudo(true);
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, [frameRef]);

  // iOS: the native player would show the video without the watermark.
  useEffect(() => {
    const media = mediaRef?.current as WebkitVideo | null | undefined;
    if (!media) return undefined;
    const onBegin = () => {
      try {
        media.webkitExitFullscreen?.();
      } catch {
        // Not in it after all.
      }
      setPseudo(true);
    };
    media.addEventListener('webkitbeginfullscreen', onBegin);
    return () => media.removeEventListener('webkitbeginfullscreen', onBegin);
  }, [mediaRef]);

  // Pseudo fullscreen: Escape leaves, and the page behind does not scroll.
  useEffect(() => {
    if (!pseudo) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPseudo(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [pseudo]);

  // Leaving the page while fullscreen leaves fullscreen too.
  useEffect(
    () => () => {
      if (fullscreenElement() === frameRef.current) exitNativeFullscreen();
    },
    [frameRef]
  );

  return { active: native || pseudo, pseudo, enter, exit, toggle };
}
