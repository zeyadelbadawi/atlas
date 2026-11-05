/**
 * B1 (UX audit) — validation messages that carry their own values.
 *
 * Schemas store a translation key as the error message
 * (`'validation:maxLength'` → "{{field}} must be {{count}} characters or
 * fewer"). React Hook Form keeps only that string, so the number was lost
 * and customers read "{{field}} must be {{count}} characters or fewer".
 * `validationMessage` packs the values into the message; the renderers
 * (`resolveValidationMessage`, the shadcn `FormMessage`) unpack them.
 *
 * Dependency-free on purpose: schema files import it.
 */
const SEPARATOR = '|';

export type ValidationValues = Readonly<Record<string, string | number>>;

/** `'validation:maxLength'` + `{ count: 100 }` → `'validation:maxLength|{"count":100}'`. */
export function validationMessage(
  key: string,
  values?: ValidationValues
): string {
  return values && Object.keys(values).length > 0
    ? `${key}${SEPARATOR}${JSON.stringify(values)}`
    : key;
}

/** The inverse of {@link validationMessage}; plain messages pass through. */
export function parseValidationMessage(message: string): {
  key: string;
  values: Record<string, string | number>;
} {
  const at = message.indexOf(SEPARATOR);
  if (at === -1) return { key: message, values: {} };
  try {
    const parsed = JSON.parse(message.slice(at + 1)) as unknown;
    return {
      key: message.slice(0, at),
      values:
        parsed && typeof parsed === 'object'
          ? (parsed as Record<string, string | number>)
          : {},
    };
  } catch {
    return { key: message, values: {} };
  }
}
