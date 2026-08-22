/**
 * Pagination control.
 *
 * Reports the visible range in words as well as offering page controls, because
 * "Showing 21–40 of 312" tells the user more than a page number alone. Directional
 * icons mirror in RTL so "next" always points forward in the reading direction.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS } from "@constants";
import { PAGE_GAP } from "@hooks";
import type { PaginationState, PaginationEntry } from "@hooks";
import { useLanguage } from "@hooks";
import { formatNumber } from "@utils";
import { cn } from "@utils";

export interface PaginationProps {
  readonly pagination: PaginationState;
  /** Hides the rows-per-page selector on space-constrained surfaces. */
  readonly hidePageSize?: boolean;
  readonly className?: string;
}

export function Pagination({
  pagination,
  hidePageSize = false,
  className,
}: PaginationProps): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const {
    page,
    pageSize,
    totalPages,
    totalItems,
    rangeStart,
    rangeEnd,
    canGoPrevious,
    canGoNext,
    entries,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    setPageSize,
  } = pagination;

  return (
    <nav
      aria-label={t("common:pagination.page", { page, totalPages })}
      className={cn(
        "flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground" data-atlas-numeric="true">
        {t("common:pagination.summary", {
          from: formatNumber(rangeStart, language),
          to: formatNumber(rangeEnd, language),
          total: formatNumber(totalItems, language),
        })}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {!hidePageSize ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="whitespace-nowrap">
              {t("common:pagination.pageSize")}
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(next) => setPageSize(Number(next))}
            >
              <SelectTrigger className="h-9 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {formatNumber(option, language)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ) : null}

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={goToPreviousPage}
            disabled={!canGoPrevious}
            aria-label={t("common:pagination.previousPage")}
          >
            <ChevronLeft
              className="size-4 rtl:-scale-x-100"
              strokeWidth={2}
              aria-hidden
            />
          </Button>

          {entries.map((entry: PaginationEntry, index: number) =>
            entry === PAGE_GAP ? (
              <span
                key={`gap-${index}`}
                aria-hidden
                className="px-1.5 text-sm text-muted-foreground"
              >
                …
              </span>
            ) : (
              <Button
                key={entry}
                type="button"
                variant={entry === page ? "default" : "ghost"}
                size="icon"
                onClick={() => goToPage(entry as number)}
                aria-label={t("common:pagination.goToPage", { page: entry })}
                aria-current={entry === page ? "page" : undefined}
                className="tabular-nums"
              >
                {formatNumber(entry as number, language)}
              </Button>
            ),
          )}

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={goToNextPage}
            disabled={!canGoNext}
            aria-label={t("common:pagination.nextPage")}
          >
            <ChevronRight
              className="size-4 rtl:-scale-x-100"
              strokeWidth={2}
              aria-hidden
            />
          </Button>
        </div>
      </div>
    </nav>
  );
}
