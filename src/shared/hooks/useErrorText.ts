/**
 * B1 (UX audit) — the text of a backend error, never an empty box.
 *
 * Backend failures carry a dotted key (`errors.auth.accountLocked`). Calling
 * `t()` on it directly has two failure modes, both seen in the dashboard:
 * the dotted form resolves in the wrong namespace (fixed by
 * `toErrorsNamespaceKey`), and a key the catalogue does not hold renders as
 * an EMPTY STRING in production (`parseMissingKeyHandler`), so a red error
 * box appeared with nothing in it. This resolves the specific message when it
 * exists and otherwise the caller's fallback, so the customer always reads
 * something true.
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toErrorsNamespaceKey } from '@utils';

export type ErrorTextResolver = (
  messageKey: string | null | undefined,
  fallbackKey: string,
  values?: Record<string, string | number>
) => string;

/** Pure form of the rule, for tests and non-React callers. */
export function resolveErrorTextKey(
  messageKey: string | null | undefined,
  fallbackKey: string,
  exists: (key: string) => boolean
): string {
  if (!messageKey) return fallbackKey;
  const namespaced = toErrorsNamespaceKey(messageKey);
  return exists(namespaced) ? namespaced : fallbackKey;
}

export function useErrorText(): ErrorTextResolver {
  const { t, i18n } = useTranslation();
  return useCallback<ErrorTextResolver>(
    (messageKey, fallbackKey, values) =>
      t(
        resolveErrorTextKey(
          messageKey,
          fallbackKey,
          (key) => typeof i18n?.exists === 'function' && i18n.exists(key)
        ),
        values ?? {}
      ),
    [t, i18n]
  );
}
