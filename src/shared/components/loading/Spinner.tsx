/**
 * Spinner.
 *
 * Used only where a skeleton cannot express the pending state — inside a button,
 * or beside an inline action. Page and section loading must use skeletons so the
 * layout stays stable.
 */
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@utils";

/** Diameter presets, aligned with the icon size tokens. */
const SPINNER_SIZE_CLASS = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
} as const;

export type SpinnerSize = keyof typeof SPINNER_SIZE_CLASS;

export interface SpinnerProps {
  readonly size?: SpinnerSize;
  readonly className?: string;
  /**
   * Announced to assistive technology. Defaults to the shared loading message.
   * Pass `false` when a parent element already announces the pending state.
   */
  readonly label?: string | false;
}

export function Spinner({
  size = "md",
  className,
  label,
}: SpinnerProps): JSX.Element {
  const { t } = useTranslation();
  const accessibleLabel =
    label === false ? undefined : (label ?? t("common:states.loading"));

  return (
    <span
      role={accessibleLabel ? "status" : undefined}
      aria-live={accessibleLabel ? "polite" : undefined}
      className={cn("inline-flex items-center justify-center", className)}
    >
      <Loader2
        className={cn("animate-spin text-current", SPINNER_SIZE_CLASS[size])}
        strokeWidth={2}
        aria-hidden
      />
      {accessibleLabel ? (
        <span className="sr-only">{accessibleLabel}</span>
      ) : null}
    </span>
  );
}
