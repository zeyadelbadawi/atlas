/**
 * The phone number field for a react-hook-form form: label, the
 * country + number control, hint and error — wired to two form fields
 * (`phoneCountry`, `phoneNumber`). The label, hint and error follow the
 * page's direction; only the number control is left-to-right.
 */
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors, FieldValues, Path } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { PhoneNumberInput } from './PhoneNumberInput';
import type { CountryCode } from './phone-number';

export interface PhoneFieldProps<T extends FieldValues> {
  readonly control: Control<T>;
  readonly errors: FieldErrors<T>;
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly disabled?: boolean;
  readonly autoFocus?: boolean;
  readonly countryName?: Path<T>;
  readonly numberName?: Path<T>;
}

/** A server message arrives already translated; a client one is a key. */
function errorText(
  t: (key: string) => string,
  error: { readonly type?: unknown; readonly message?: unknown } | undefined
): string | null {
  if (!error || typeof error.message !== 'string' || !error.message) {
    return null;
  }
  return error.type === 'server' ? error.message : t(error.message);
}

export function PhoneField<T extends FieldValues>({
  control,
  errors,
  id,
  label,
  hint,
  disabled,
  autoFocus,
  countryName = 'phoneCountry' as Path<T>,
  numberName = 'phoneNumber' as Path<T>,
}: PhoneFieldProps<T>): JSX.Element {
  const { t } = useTranslation();
  const message =
    errorText(t, errors[numberName] as never) ??
    errorText(t, errors[countryName] as never);
  const errorId = message ? `${id}-error` : undefined;
  // The error replaces the hint, so only what is on screen describes the field.
  const hintId = hint && !message ? `${id}-hint` : undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Controller
        control={control}
        name={countryName}
        render={({ field: countryField }) => (
          <Controller
            control={control}
            name={numberName}
            render={({ field: numberField }) => (
              <PhoneNumberInput
                ref={numberField.ref}
                id={id}
                country={countryField.value as CountryCode}
                number={(numberField.value as string | undefined) ?? ''}
                onCountryChange={countryField.onChange}
                onNumberChange={numberField.onChange}
                onBlur={numberField.onBlur}
                invalid={!!message}
                disabled={disabled}
                autoFocus={autoFocus}
                describedBy={
                  [errorId, hintId].filter(Boolean).join(' ') || undefined
                }
              />
            )}
          />
        )}
      />
      {message ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
