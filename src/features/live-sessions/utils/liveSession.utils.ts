/**
 * Live Session presentation helpers.
 *
 * Same tone-mapping pattern already used for Academy/Course/Learning and
 * tenant subscription status — one switch, no inline conditionals in JSX.
 */
import type { LiveSessionStatus } from '@types';

type BadgeTone = 'default' | 'secondary' | 'destructive' | 'outline';

export function getLiveSessionStatusTone(status: LiveSessionStatus): BadgeTone {
  switch (status) {
    case 'live':
      // The one state that should draw the eye.
      return 'default';
    case 'scheduled':
      return 'secondary';
    case 'cancelled':
    case 'failed':
      return 'destructive';
    case 'draft':
    case 'ended':
    default:
      return 'outline';
  }
}

/**
 * Human duration from seconds, e.g. `1h 24m` / `24m` / `45s`.
 *
 * Built from parts rather than string concatenation of raw numbers so the
 * caller can localize the unit labels; the numerals themselves are
 * formatted by `Intl` at the call site, which keeps Arabic digits and bidi
 * behaviour correct instead of producing reversed strings.
 */
export function splitDuration(totalSeconds: number): {
  hours: number;
  minutes: number;
  seconds: number;
} {
  const safe = Math.max(0, Math.round(totalSeconds));
  return {
    hours: Math.floor(safe / 3600),
    minutes: Math.floor((safe % 3600) / 60),
    seconds: safe % 60,
  };
}
