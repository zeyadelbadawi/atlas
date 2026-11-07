/**
 * B4 (UX audit) — the ONE toast a failed action shows (approve, remove,
 * publish, reorder…): the action's own title ("We couldn't remove this
 * team member") over the REAL reason ("The organization owner can't be
 * removed", "Atlas could not reach the server…"). Before, the action's
 * generic copy ("Please try again") was toasted and the app-wide reporter
 * added a second toast with the reason — two messages, sometimes
 * contradicting each other on a 409.
 *
 * The hooks behind these actions mark their errors inline
 * (`INLINE_ERRORS_META`), so this is the only message. One helper for the
 * whole app (it used to be three copies: course, academy, announcements).
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@app/providers';
import { errorMessageKey, normalizeUnknownError } from '@services';
import { isTranslatedString, toErrorsNamespaceKey } from '@utils';
import type { ApiError } from '@api';
import { resolveErrorTextKey } from './useErrorText';

export interface ActionFailureDescription {
  readonly descriptionKey: string;
  readonly values?: Record<string, string | number>;
}

/**
 * The reason line of a failed action. `specificKey` is a feature's own copy
 * for this failure (e.g. a roster refusal), used when it says more than the
 * generic fallback would.
 */
export function actionFailureDescription(
  error: Pick<ApiError, 'kind' | 'messageKey' | 'violations'>,
  exists: (key: string) => boolean,
  options: {
    readonly specificKey?: string | null;
    readonly online?: boolean;
    readonly thisField?: string;
  } = {}
): ActionFailureDescription {
  if (
    (error.kind === 'network' || error.kind === 'timeout') &&
    options.online === false
  ) {
    return {
      descriptionKey: 'common:connectivity.actionNeedsConnection.description',
    };
  }
  if (options.specificKey) return { descriptionKey: options.specificKey };
  if (error.kind === 'validation') {
    const first = error.violations?.find((violation) =>
      exists(toErrorsNamespaceKey(violation.messageKey))
    );
    if (first) {
      return {
        descriptionKey: toErrorsNamespaceKey(first.messageKey),
        values: {
          ...(options.thisField ? { field: options.thisField } : {}),
          ...(first.values ?? {}),
        },
      };
    }
  }
  return {
    descriptionKey: resolveErrorTextKey(
      error.messageKey,
      errorMessageKey(error.kind),
      exists
    ),
  };
}

export interface ActionFailureToastOptions {
  /** A feature's own reason for this failure, when it says more. */
  readonly specificKey?: string | null;
  /** A sentence that follows the reason, e.g. "The previous order has been restored." */
  readonly afterKey?: string;
}

export type ActionFailureToast = (
  error: unknown,
  titleKey: string,
  options?: ActionFailureToastOptions
) => void;

export function useActionFailureToast(): ActionFailureToast {
  const { notifyError } = useToast();
  const { t, i18n } = useTranslation();
  return useCallback<ActionFailureToast>(
    (error, titleKey, options = {}) => {
      const apiError = normalizeUnknownError(error);
      // A superseded request is not a failure the person needs to read.
      if (apiError.kind === 'cancelled') return;
      const { descriptionKey, values } = actionFailureDescription(
        apiError,
        (key) => isTranslatedString(i18n, key),
        {
          specificKey: options.specificKey,
          online:
            typeof navigator === 'undefined' || navigator.onLine !== false,
          thisField: t('validation:thisField'),
        }
      );
      if (!options.afterKey) {
        notifyError(titleKey, descriptionKey, values);
        return;
      }
      notifyError(titleKey, 'common:feedback.reasonThen', {
        reason: t(descriptionKey, values ?? {}),
        then: t(options.afterKey),
      });
    },
    [notifyError, i18n, t]
  );
}
