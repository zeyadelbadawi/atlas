/**
 * Data table.
 *
 * The single table implementation for the platform, built on TanStack Table.
 * Every listing screen composes this component instead of hand-rolling markup,
 * which is what keeps sorting, empty states, loading behaviour and keyboard
 * semantics identical across modules.
 *
 * Sorting is presentational and local; pagination is *not* owned here. Paging is
 * driven by the caller's `usePagination` state so the same control works for
 * server-side listings, which is the case Atlas is built for.
 */
import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@components/feedback";
import type { EmptyStateAction } from "@components/feedback";
import { SkeletonTable } from "@components/loading";
import { Pagination } from "@components/data-display";
import type { PaginationState } from "@hooks";
import { cn } from "@utils";

export interface DataTableProps<TData> {
  /** Column definitions. Headers must already be localized by the caller. */
  readonly columns: ReadonlyArray<ColumnDef<TData, unknown>>;
  readonly data: readonly TData[];
  /** Shows a skeleton table sized to the current column count. */
  readonly isLoading?: boolean;
  /** Pagination state from `usePagination`. Omit for unpaged tables. */
  readonly pagination?: PaginationState;
  /** Translation key for the empty-state heading. */
  readonly emptyTitleKey?: string;
  /** Translation key for the empty-state explanation. */
  readonly emptyDescriptionKey?: string;
  /** Action offered when the table is empty, e.g. a create button. */
  readonly emptyAction?: EmptyStateAction;
  /** Stable row identity. Recommended whenever rows can be reordered. */
  readonly getRowId?: (row: TData, index: number) => string;
  /** Makes rows activatable. Rows become focusable when provided. */
  readonly onRowSelect?: (row: TData) => void;
  readonly className?: string;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  pagination,
  emptyTitleKey = "common:states.empty.title",
  emptyDescriptionKey = "common:states.empty.description",
  emptyAction,
  getRowId,
  onRowSelect,
  className,
}: DataTableProps<TData>): JSX.Element {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: data as TData[],
    columns: columns as ColumnDef<TData, unknown>[],
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Paging is server-driven: the table renders exactly the rows it is given.
    manualPagination: true,
    getRowId,
  });

  if (isLoading) {
    return (
      <div className={className}>
        <SkeletonTable columns={columns.length} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          titleKey={emptyTitleKey}
          descriptionKey={emptyDescriptionKey}
          primaryAction={emptyAction}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Horizontal scrolling is contained so a wide table never stretches
          the page shell. */}
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDirection = header.column.getIsSorted();

                  return (
                    <TableHead
                      key={header.id}
                      // Announced by screen readers as the column's sort state.
                      aria-sort={
                        !canSort || sortDirection === false
                          ? undefined
                          : sortDirection === "asc"
                            ? "ascending"
                            : "descending"
                      }
                      className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 rounded-sm transition-colors duration-fast ease-standard hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {sortDirection === "asc" ? (
                            <ArrowUp
                              className="size-3.5"
                              strokeWidth={2}
                              aria-hidden
                            />
                          ) : sortDirection === "desc" ? (
                            <ArrowDown
                              className="size-3.5"
                              strokeWidth={2}
                              aria-hidden
                            />
                          ) : (
                            <ChevronsUpDown
                              className="size-3.5 opacity-50"
                              strokeWidth={2}
                              aria-hidden
                            />
                          )}
                          <span className="sr-only">
                            {t(
                              sortDirection === "asc"
                                ? "common:table.sortDescending"
                                : "common:table.sortAscending",
                            )}
                          </span>
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                // Activatable rows must be reachable and operable by keyboard.
                tabIndex={onRowSelect ? 0 : undefined}
                role={onRowSelect ? "button" : undefined}
                onClick={
                  onRowSelect ? () => onRowSelect(row.original) : undefined
                }
                onKeyDown={
                  onRowSelect
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowSelect(row.original);
                        }
                      }
                    : undefined
                }
                className={cn(
                  onRowSelect &&
                    "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="align-middle text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 ? (
        <Pagination pagination={pagination} />
      ) : null}
    </div>
  );
}
