/**
 * B4 (UX audit) — the ONE toast a failed publish or archive shows: the
 * action's title over the real reason (a lost connection, a server error,
 * the backend's own message). The announcement hooks mark their errors
 * inline (`INLINE_ERRORS_META`), so the app-wide reporter adds nothing.
 * Same rule as the academy feature's helper of the same name.
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@app/providers';
import { resolveErrorTextKey } from '@hooks';
import { errorMessageKey } from '@services';
import { isTranslatedString } from '@utils';
import type { ApiError } from '@api';

export function useActionFailureToast(): (
  error: ApiError,
  titleKey: string
) => void {
  const { notifyError } = useToast();
  const { i18n } = useTranslation();
  return useCallback(
    (error: ApiError, titleKey: string) => {
      if (error.kind === 'cancelled') return;
      const offline =
        (error.kind === 'network' || error.kind === 'timeout') &&
        typeof navigator !== 'undefined' &&
        navigator.onLine === false;
      notifyError(
        titleKey,
        offline
          ? 'common:connectivity.actionNeedsConnection.description'
          : resolveErrorTextKey(
              error.messageKey,
              errorMessageKey(error.kind),
              (key) => isTranslatedString(i18n, key)
            )
      );
    },
    [notifyError, i18n]
  );
}
