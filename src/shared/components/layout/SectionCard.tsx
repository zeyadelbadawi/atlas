/**
 * Section card.
 *
 * The standard grouping surface for related content. Using one card component
 * platform-wide keeps padding, radius and elevation identical everywhere, which
 * is what prevents modules from drifting apart visually.
 */
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@utils";

export interface SectionCardProps {
  /** Translation key for the section heading. */
  readonly titleKey?: string;
  /** Translation key for supporting text below the heading. */
  readonly descriptionKey?: string;
  /** Interpolation values shared by the heading and description. */
  readonly values?: Record<string, string | number>;
  /** Actions aligned with the heading. */
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  /** Removes body padding, for content that manages its own edges. */
  readonly flushBody?: boolean;
  readonly className?: string;
}

export function SectionCard({
  titleKey,
  descriptionKey,
  values,
  actions,
  children,
  flushBody = false,
  className,
}: SectionCardProps): JSX.Element {
  const { t } = useTranslation();
  const hasHeader = Boolean(titleKey || descriptionKey || actions);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card shadow-xs",
        className,
      )}
    >
      {hasHeader ? (
        <div className="flex flex-col gap-2 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="min-w-0 space-y-1">
            {titleKey ? (
              <h2 className="font-display text-base font-semibold text-foreground">
                {t(titleKey, values ?? {})}
              </h2>
            ) : null}
            {descriptionKey ? (
              <p className="max-w-prose text-sm text-muted-foreground">
                {t(descriptionKey, values ?? {})}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
      ) : null}

      <div className={cn(!flushBody && "px-4 py-4 sm:px-6 sm:py-5")}>
        {children}
      </div>
    </section>
  );
}
