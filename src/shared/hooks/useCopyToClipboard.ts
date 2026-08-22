/**
 * Copies text and reports the outcome.
 *
 * The `hasCopied` flag resets automatically so a "copied" affordance returns to
 * its default state without the caller managing a timer.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { copyToClipboard } from '@utils';

/** How long the success state remains visible, in milliseconds. */
const COPIED_RESET_MS = 2_000;

export interface CopyToClipboardState {
  readonly hasCopied: boolean;
  readonly copy: (text: string) => Promise<boolean>;
}

export function useCopyToClipboard(): CopyToClipboardState {
  const [hasCopied, setHasCopied] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (timeoutRef.current !== undefined) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  const copy = useCallback(async (text: string): Promise<boolean> => {
    const succeeded = await copyToClipboard(text);
    if (!succeeded) return false;

    setHasCopied(true);
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(
      () => setHasCopied(false),
      COPIED_RESET_MS
    );

    return true;
  }, []);

  return { hasCopied, copy };
}