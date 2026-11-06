/**
 * B3 (UX audit, V05) — the `meta` of every course mutation whose caller
 * shows the failure itself (on a field, in one inline alert or in its own
 * toast with the real reason).
 *
 * `showErrorToast: false` alone silenced only `useApiMutation`'s toast;
 * the app-wide reporter still raised its own, so one failed save showed a
 * generic toast AND the page's message. With this flag the reporter stays
 * quiet and the customer reads exactly one message.
 */
import { INLINE_ERRORS_META } from '@services/query';

export const COURSE_INLINE_ERRORS_META = {
  [INLINE_ERRORS_META]: true,
} as const;
