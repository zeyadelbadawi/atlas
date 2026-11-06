/**
 * B2 (UX audit) — the per-language messages of a localized (`{ en, ar }`)
 * form field, for `LocalizedTextField`'s `errors`.
 *
 * The SEO forms rendered `<FormMessage />` under an object field, whose
 * own message is undefined: customers read the word "undefined" in red.
 * Each language's message (client or server, e.g. `metaTitle.en` too
 * long) now sits under that language's input.
 */
import { useTranslation } from 'react-i18next';
import type { FieldErrors, FieldValues } from 'react-hook-form';
import { fieldErrorText } from '@forms';
import type { LocalizedFieldErrors } from './LocalizedTextField';

export function useLocalizedFormErrors<T extends FieldValues>(
  errors: FieldErrors<T>,
  name: keyof T & string,
  labelKey: string
): LocalizedFieldErrors {
  const { t } = useTranslation();
  const field = errors[name] as
    | {
        readonly en?: { readonly message?: string };
        readonly ar?: { readonly message?: string };
      }
    | undefined;
  const label = t(labelKey);
  return {
    en: fieldErrorText(t, field?.en?.message, label),
    ar: fieldErrorText(t, field?.ar?.message, label),
  };
}
