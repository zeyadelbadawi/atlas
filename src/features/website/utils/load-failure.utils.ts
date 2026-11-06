/**
 * B9 (UX audit) V07 — why a public page's read failed, in words: only a real
 * network failure (no answer at all, or a timeout) mentions the connection;
 * anything the site answered with is the academy's side, in the theme's own
 * sentence.
 */
import { apiErrorKind } from '@api';

export function isConnectionFailure(error: unknown): boolean {
  const kind = apiErrorKind(error);
  return kind === 'network' || kind === 'timeout';
}

/** The theme's sentence for a failed read, or the connection one when that is the cause. */
export function loadFailureKey(error: unknown, themeKey: string): string {
  return isConnectionFailure(error)
    ? 'website:renderer.loadFailure.network'
    : themeKey;
}
