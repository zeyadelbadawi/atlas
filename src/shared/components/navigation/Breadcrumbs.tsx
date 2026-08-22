/**
 * Breadcrumbs.
 *
 * Any page nested more than one level deep must show its position. Trails are
 * supplied as data by the page, which keeps this component free of any knowledge
 * about the module hierarchy.
 *
 * The separator is direction-aware: it mirrors in RTL so the trail always reads
 * from the start of the line toward the current page.
 */
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { BreadcrumbItem } from "@types";
import { cn } from "@utils";

export interface BreadcrumbsProps {
  /** Trail from the outermost ancestor to the current page. */
  readonly items: readonly BreadcrumbItem[];
  readonly className?: string;
}

export function Breadcrumbs({
  items,
  className,
}: BreadcrumbsProps): JSX.Element | null {
  const { t } = useTranslation();

  // A single-item trail conveys nothing the page title does not already say.
  if (items.length < 2) return null;

  return (
    <nav aria-label={t("navigation:breadcrumb.label")} className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          const label = item.label ?? t(item.labelKey);

          return (
            <li
              key={`${item.labelKey}-${index}`}
              className="flex items-center gap-1.5"
            >
              {index > 0 ? (
                <ChevronRight
                  className="size-3.5 shrink-0 text-border-strong rtl:-scale-x-100"
                  strokeWidth={2}
                  aria-hidden
                />
              ) : null}

              {isCurrent || !item.path ? (
                <span
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(isCurrent && "font-medium text-foreground")}
                >
                  {label}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="rounded-sm transition-colors duration-fast ease-standard hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
