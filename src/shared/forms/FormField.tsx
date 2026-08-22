/**
 * Form field wrapper.
 *
 * Owns the accessibility contract every Atlas input must satisfy: a real label,
 * programmatic association with help text and errors, and `aria-invalid` when a
 * value is rejected. Placeholders are never used as labels.
 *
 * Errors are rendered beside the field they belong to, and a required field is
 * marked with both a visual indicator and text for assistive technology.
 */
import type { ReactNode } from "react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { cn } from "@utils";
import { resolveValidationMessage } from "./form.utils";

/** Render props supplying the ids a control must adopt. */
export interface FormFieldControlProps {
  readonly id: string;
  readonly "aria-describedby": string | undefined;
  readonly "aria-invalid": boolean;
  readonly "aria-required": boolean;
}

export interface FormFieldProps {
  /** Translation key for the visible label. */
  readonly labelKey: string;
  /** Translation key for guidance shown below the control. */
  readonly descriptionKey?: string;
  /** Validation message, usually a translation key from a schema. */
  readonly error?: string;
  readonly isRequired?: boolean;
  /** Interpolation values shared by the label, description and error. */
  readonly values?: Record<string, string | number>;
  /** Receives the ids and ARIA attributes the control must apply. */
  readonly children: (control: FormFieldControlProps) => ReactNode;
  readonly className?: string;
}

export function FormField({
  labelKey,
  descriptionKey,
  error,
  isRequired = false,
  values,
  children,
  className,
}: FormFieldProps): JSX.Element {
  const { t } = useTranslation();
  const reactId = useId();

  const controlId = `${reactId}-control`;
  const descriptionId = `${reactId}-description`;
  const errorId = `${reactId}-error`;

  const label = t(labelKey, values ?? {});
  const errorMessage = resolveValidationMessage(error, t, {
    field: label,
    ...(values ?? {}),
  });

  // Errors are announced first because they are the most urgent information.
  const describedBy =
    [errorMessage ? errorId : null, descriptionKey ? descriptionId : null]
      .filter((id): id is string => id !== null)
      .join(" ") || undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor={controlId}
        className="flex items-center gap-1 text-sm font-medium"
      >
        {label}
        {isRequired ? (
          <>
            <span aria-hidden className="text-destructive">
              *
            </span>
            <span className="sr-only">
              {t("common:form.requiredFieldIndicator")}
            </span>
          </>
        ) : null}
      </Label>

      {children({
        id: controlId,
        "aria-describedby": describedBy,
        "aria-invalid": Boolean(errorMessage),
        "aria-required": isRequired,
      })}

      {descriptionKey ? (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {t(descriptionKey, values ?? {})}
        </p>
      ) : null}

      {errorMessage ? (
        <p
          id={errorId}
          // `alert` ensures the message is announced as soon as it appears.
          role="alert"
          className="text-xs font-medium text-destructive"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
