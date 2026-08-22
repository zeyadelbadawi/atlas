/**
 * Empty state.
 *
 * An empty page must teach the interface rather than show nothing. Every empty
 * state acknowledges the emptiness, explains the value of the missing content,
 * and offers a way to create it.
 */
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@utils";

/** A call to action rendered inside an empty state. */
export interface EmptyStateAction {
  /** Translation key. Must name the action, e.g. "Create academy". */
  readonly labelKey: string;
  readonly onAction: () => void;
  readonly icon?: LucideIcon;
}

export interface EmptyStateProps {
  /** Translation key acknowledging the empty view. */
  readonly titleKey?: string;
  /** Translation key explaining what will appear here and why it matters. */
  readonly descriptionKey?: string;
  readonly icon?: LucideIcon;
  readonly primaryAction?: EmptyStateAction;
  readonly secondaryAction?: EmptyStateAction;
  /** Interpolation values shared by the title and description. */
  readonly values?: Record<string, string | number>;
  readonly className?: string;
}

export function EmptyState({
  titleKey = "common:states.empty.title",
  descriptionKey = "common:states.empty.description",
  icon: Icon = Inbox,
  primaryAction,
  secondaryAction,
  values,
  className,
}: EmptyStateProps): JSX.Element {
  const { t } = useTranslation();
  const PrimaryIcon = primaryAction?.icon;
  const SecondaryIcon = secondaryAction?.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-surface/40 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-pill bg-accent text-accent-foreground">
        <Icon className="size-6" strokeWidth={1.75} aria-hidden />
      </span>

      <div className="space-y-1.5">
        <h3 className="font-display text-base font-semibold text-foreground">
          {t(titleKey, values ?? {})}
        </h3>
        <p className="mx-auto max-w-prose text-sm text-muted-foreground">
          {t(descriptionKey, values ?? {})}
        </p>
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {primaryAction ? (
            <Button type="button" onClick={primaryAction.onAction}>
              {PrimaryIcon ? (
                <PrimaryIcon
                  className="size-4"
                  strokeWidth={1.75}
                  aria-hidden
                />
              ) : null}
              {t(primaryAction.labelKey)}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button
              type="button"
              variant="outline"
              onClick={secondaryAction.onAction}
            >
              {SecondaryIcon ? (
                <SecondaryIcon
                  className="size-4"
                  strokeWidth={1.75}
                  aria-hidden
                />
              ) : null}
              {t(secondaryAction.labelKey)}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
