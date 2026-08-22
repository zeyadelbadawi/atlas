/**
 * Error state.
 *
 * The single error presentation used across Atlas. Every error state explains
 * what happened, offers a retry, and — for failures the user cannot resolve —
 * a route to support. Technical detail is never exposed: only the request id,
 * which support can use for traceability.
 */
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { errorMessageKey, errorTitleKey } from "@services";
import type { ApiErrorKind } from "@types";
import { cn } from "@utils";

export interface ErrorStateProps {
  /** Error category. Determines the default title and description. */
  readonly kind?: ApiErrorKind;
  /** Overrides the title translation key. */
  readonly titleKey?: string;
  /** Overrides the description translation key. */
  readonly descriptionKey?: string;
  /** Reference shown so support can trace the failure. */
  readonly requestId?: string;
  /** Invoked by the retry action. Omit when the action cannot be retried. */
  readonly onRetry?: () => void;
  /** Invoked by the support action. */
  readonly onContactSupport?: () => void;
  readonly className?: string;
}

export function ErrorState({
  kind = "unknown",
  titleKey,
  descriptionKey,
  requestId,
  onRetry,
  onContactSupport,
  className,
}: ErrorStateProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card px-6 py-10 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-pill bg-destructive-surface text-destructive">
        <AlertTriangle className="size-6" strokeWidth={1.75} aria-hidden />
      </span>

      <div className="space-y-1.5">
        <h3 className="font-display text-base font-semibold text-foreground">
          {t(titleKey ?? errorTitleKey(kind))}
        </h3>
        <p className="mx-auto max-w-prose text-sm text-muted-foreground">
          {t(descriptionKey ?? errorMessageKey(kind))}
        </p>
      </div>

      {(onRetry || onContactSupport) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onRetry ? (
            <Button type="button" onClick={onRetry}>
              {t("common:actions.retry")}
            </Button>
          ) : null}
          {onContactSupport ? (
            <Button type="button" variant="outline" onClick={onContactSupport}>
              {t("common:actions.contactSupport")}
            </Button>
          ) : null}
        </div>
      )}

      {requestId ? (
        <p className="font-mono text-xs text-muted-foreground">
          {t("errors:errorReference", { requestId })}
        </p>
      ) : null}
    </div>
  );
}
