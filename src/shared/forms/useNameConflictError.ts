/**
 * W4 — duplicate-name refusals, shown on the field they are about.
 *
 * Organization names and academy names are unique platform-wide, and a
 * learner's name is unique inside each academy. The backend answers a clash
 * with a 409 `{ messageKey, violations: [{ field }] }` (and an empty-key name
 * with a 400 `errors.validation.nameInvalid`). `useServerValidation` only
 * places `validation` errors, so — exactly like the `emailNotAcceptable`
 * precedent in `RegistrationForm` — each affected form calls this hook to put
 * the message under its own input with `setError`, and focus it.
 *
 * The org-name message is deliberately generic ("isn't available"): it never
 * says that, or by whom, the name is held. A profile rename clash lists only
 * the user's OWN academies (`details.academies`).
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { isApiError } from '@api';
import { toTranslationKey } from '@utils';

export const NAME_CONFLICT_ERROR_KEYS = {
  organizationNameUnavailable: 'errors.organization.nameUnavailable',
  academyNameTaken: 'errors.academy.nameTaken',
  learnerNameTaken: 'errors.academy.learnerNameTaken',
  learnerNameTakenExistingAccount: 'errors.academy.learnerNameTakenExistingAccount',
  profileNameTakenInAcademy: 'errors.profile.nameTakenInAcademy',
  nameInvalid: 'errors.validation.nameInvalid',
} as const;

const KEYS: readonly string[] = Object.values(NAME_CONFLICT_ERROR_KEYS);

export interface NameConflict {
  /** The server's field name (`name`, `organizationName`, `academyName`, `email`). */
  readonly field: string;
  readonly messageKey: string;
  /** The caller's own academy names, for `errors.profile.nameTakenInAcademy`. */
  readonly academies: readonly string[];
}

/** The duplicate-name refusal an error carries, or `null` when it is something else. */
export function nameConflictFromError(error: unknown): NameConflict | null {
  if (!isApiError(error) || !KEYS.includes(error.messageKey)) return null;
  const field =
    error.violations?.find((violation) => violation.messageKey === error.messageKey)
      ?.field ??
    error.violations?.[0]?.field ??
    'name';
  const rawAcademies = error.details?.academies;
  const academies = Array.isArray(rawAcademies)
    ? rawAcademies.flatMap((row) =>
        row && typeof row === 'object' && !Array.isArray(row) && typeof row.name === 'string'
          ? [row.name]
          : []
      )
    : [];
  return { field, messageKey: error.messageKey, academies };
}

function formatList(language: string, items: readonly string[]): string {
  try {
    return new Intl.ListFormat(language, { style: 'long', type: 'conjunction' }).format(
      items
    );
  } catch {
    return items.join(', ');
  }
}

export interface UseNameConflictErrorOptions<TValues extends FieldValues> {
  /** Maps a server field to this form's field (e.g. `academyName` → `name`). */
  readonly fields?: Partial<Record<string, Path<TValues>>>;
  /** Used when the server field has no mapping and is not a field of this form. */
  readonly fallbackField?: Path<TValues>;
}

/**
 * Places a duplicate-name refusal on its form field. Call it AFTER
 * `useServerValidation`, so the specific message wins for `nameInvalid`.
 */
export function useNameConflictError<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  error: unknown,
  options: UseNameConflictErrorOptions<TValues> = {}
): NameConflict | null {
  const { t, i18n } = useTranslation();
  const conflict = nameConflictFromError(error);
  const { setError } = form;
  const mapped = conflict ? options.fields?.[conflict.field] : undefined;
  const target = (mapped ?? options.fallbackField ?? conflict?.field) as
    | Path<TValues>
    | undefined;
  const messageKey = conflict?.messageKey;
  const academies = conflict?.academies.join('\u0000');

  useEffect(() => {
    if (!messageKey || !target) return;
    const list = academies ? academies.split('\u0000') : [];
    // Like the `emailNotAcceptable` precedent, the message is the namespaced
    // translation KEY, which every form's error renderer translates. Only the
    // profile clash needs interpolation (the user's academy names), so that
    // one message is resolved here; its form renders `server` errors as-is.
    const message =
      list.length > 0
        ? t(toTranslationKey(messageKey), {
            academies: formatList(i18n.language, list),
            count: list.length,
          })
        : toTranslationKey(messageKey);
    setError(target, { type: 'server', message }, { shouldFocus: true });
    // `error` identity changes per attempt; the derived primitives decide.
  }, [error, messageKey, target, academies, setError, t, i18n.language]);

  return conflict;
}
