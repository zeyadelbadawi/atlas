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
import {
  displayableErrorKey,
  isTranslatedString,
  toErrorsNamespaceKey,
} from '@utils';

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
  return (
    displayableErrorKey(toErrorsNamespaceKey(messageKey), exists) ?? fallbackKey
  );
}

export function useErrorText(): ErrorTextResolver {
  const { t, i18n } = useTranslation();
  return useCallback<ErrorTextResolver>(
    (messageKey, fallbackKey, values) => {
      const text = t(
        resolveErrorTextKey(messageKey, fallbackKey, (key) =>
          isTranslatedString(i18n, key)
        ),
        values ?? {}
      );
      // B2 (UX audit) — a value the message needs was not provided
      // ("{{count}}"): the fallback says something true instead.
      return /\{\{\s*[\w.]+\s*\}\}/.test(text)
        ? t(fallbackKey, values ?? {})
        : text;
    },
    [t, i18n]
  );
}
