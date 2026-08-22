/**
 * Status badge.
 *
 * Status is conveyed by colour *and* text, never colour alone, so it remains
 * readable for colour-blind users and in monochrome print.
 */
import { useTranslation } from "react-i18next";
import { cn } from "@utils";

/** Semantic tone of a status. */
export type StatusTone =
  | "neutral"
  | "success"
  | "warning"
  | "destructive"
  | "info";

/** Tone-specific surface and text pairings, all token-driven. */
const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success-surface text-success",
  warning: "bg-warning-surface text-warning",
  destructive: "bg-destructive-surface text-destructive",
  info: "bg-info-surface text-info",
};

export interface StatusBadgeProps {
  /** Translation key for the status label. */
  readonly labelKey: string;
  readonly tone?: StatusTone;
  /** Interpolation values for the label. */
  readonly values?: Record<string, string | number>;
  readonly className?: string;
}

export function StatusBadge({
  labelKey,
  tone = "neutral",
  values,
  className,
}: StatusBadgeProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      {/* A dot reinforces the tone without becoming the only signal. */}
      <span className="size-1.5 rounded-pill bg-current" aria-hidden />
      {t(labelKey, values ?? {})}
    </span>
  );
}
