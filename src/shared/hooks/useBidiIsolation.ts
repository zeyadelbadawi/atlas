/**
 * RTL sweep — the active language's `isolateTextIn` / `isolateValues`.
 *
 * For a component that interpolates user values (a name, a course or file
 * title) into a translated sentence: `t(key, { name: isolate(name) })`.
 * The sentence keeps the page's direction; in a right-to-left language
 * each value is sealed in a bidi isolate so a Latin name cannot reorder the
 * Arabic words around it. In a left-to-right language both functions
 * return their input unchanged (see `isolateTextIn`).
 *
 * Displayed text only — not for URLs, emails, filenames or anything sent
 * to the server.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  directionOf,
  isolateTextIn,
  isolateValues as isolateValuesIn,
  type TextDirection,
} from '@utils/bidi.utils';

export interface BidiIsolation {
  readonly direction: TextDirection;
  readonly isolate: (text: string) => string;
  readonly isolateValues: <T extends Record<string, unknown>>(values: T) => T;
}

export function useBidiIsolation(): BidiIsolation {
  const { i18n } = useTranslation();
  const direction: TextDirection = directionOf(i18n);
  return useMemo(
    () => ({
      direction,
      isolate: (text: string) => isolateTextIn(direction, text),
      isolateValues: <T extends Record<string, unknown>>(values: T) =>
        isolateValuesIn(values, direction),
    }),
    [direction]
  );
}
