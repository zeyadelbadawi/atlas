/**
 * B9 (UX audit) V15 — which image source failed to load, so a caller can
 * draw its designed fallback instead of the browser's broken-image icon.
 *
 * `onError` covers a failure after hydration. An SSR page's image can fail
 * before React attaches that listener; the ref sees it on mount: an image
 * already `complete` with no pixels. A new `src` is tried afresh.
 */
import { useCallback, useState } from 'react';

export interface ImageFailure {
  /** True once the current `src` has failed. */
  readonly failed: boolean;
  readonly ref: (image: HTMLImageElement | null) => void;
  readonly onError: () => void;
}

export function useImageFailure(src: string | undefined): ImageFailure {
  const [failedSrc, setFailedSrc] = useState<string>();
  const onError = useCallback(() => setFailedSrc(src), [src]);
  const ref = useCallback(
    (image: HTMLImageElement | null) => {
      if (src && image?.complete && image.naturalWidth === 0) {
        setFailedSrc(src);
      }
    },
    [src]
  );
  return { failed: !!src && failedSrc === src, ref, onError };
}
