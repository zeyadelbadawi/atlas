/**
 * Form actions.
 *
 * Standardises the submit/cancel row: the primary action names what will happen,
 * the pending state disables submission to prevent duplicate writes, and the
 * button order stays consistent across every form in the platform.
 */
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Spinner } from "@components/loading";
import { cn } from "@utils";

export interface FormActionsProps {
  /** Translation key naming the action, e.g. "Create academy". */
  readonly submitLabelKey?: string;
  readonly cancelLabelKey?: string;
  /** True while the submission is in flight. */
  readonly isSubmitting?: boolean;
  /** Disables submission, for example when the form is untouched. */
  readonly isSubmitDisabled?: boolean;
  /** Omit to render no cancel action. */
  readonly onCancel?: () => void;
  readonly className?: string;
}

export function FormActions({
  submitLabelKey = "common:actions.save",
  cancelLabelKey = "common:actions.cancel",
  isSubmitting = false,
  isSubmitDisabled = false,
  onCancel,
  className,
}: FormActionsProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end",
        className,
      )}
    >
      {onCancel ? (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t(cancelLabelKey)}
        </Button>
      ) : null}

      <Button type="submit" disabled={isSubmitting || isSubmitDisabled}>
        {isSubmitting ? (
          <Spinner size="sm" label={false} className="text-current" />
        ) : null}
        {t(isSubmitting ? "common:states.saving" : submitLabelKey)}
      </Button>
    </div>
  );
}
