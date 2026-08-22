/**
 * Manages pagination state and derives the page numbers to render.
 *
 * Owning this logic in one hook keeps every paginated surface in Atlas
 * consistent and prevents off-by-one errors from being reimplemented.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  PAGINATION_SIBLING_COUNT,
} from '@constants';
import { clamp } from '@utils';

/** A gap in the page list, rendered as an ellipsis. */
export const PAGE_GAP = 'gap' as const;

export type PaginationEntry = number | typeof PAGE_GAP;

export interface UsePaginationOptions {
  readonly totalItems: number;
  readonly initialPage?: number;
  readonly initialPageSize?: number;
  /** Numbered pages rendered on each side of the current page. */
  readonly siblingCount?: number;
}

export interface PaginationState {
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly totalItems: number;
  /** Index of the first visible item, 1-based. Zero when empty. */
  readonly rangeStart: number;
  /** Index of the last visible item, 1-based. Zero when empty. */
  readonly rangeEnd: number;
  readonly canGoPrevious: boolean;
  readonly canGoNext: boolean;
  /** Page numbers and gaps to render. */
  readonly entries: readonly PaginationEntry[];
  readonly goToPage: (page: number) => void;
  readonly goToNextPage: () => void;
  readonly goToPreviousPage: () => void;
  readonly goToFirstPage: () => void;
  readonly goToLastPage: () => void;
  /** Changing page size returns to the first page to avoid an empty view. */
  readonly setPageSize: (pageSize: number) => void;
}

/** Builds an inclusive numeric range. */
function range(start: number, end: number): number[] {
  if (end < start) return [];
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

/**
 * Builds the page list with at most two gaps, so the control keeps a stable
 * width regardless of how many pages exist.
 */
function buildEntries(
  currentPage: number,
  totalPages: number,
  siblingCount: number
): PaginationEntry[] {
  // First page + last page + current + 2 gaps + siblings on both sides.
  const maxVisible = siblingCount * 2 + 5;

  if (totalPages <= maxVisible) return range(1, totalPages);

  const leftSibling = Math.max(currentPage - siblingCount, 1);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages);

  const showLeftGap = leftSibling > 2;
  const showRightGap = rightSibling < totalPages - 1;

  if (!showLeftGap && showRightGap) {
    return [...range(1, maxVisible - 2), PAGE_GAP, totalPages];
  }

  if (showLeftGap && !showRightGap) {
    return [1, PAGE_GAP, ...range(totalPages - (maxVisible - 3), totalPages)];
  }

  return [
    1,
    PAGE_GAP,
    ...range(leftSibling, rightSibling),
    PAGE_GAP,
    totalPages,
  ];
}

export function usePagination(options: UsePaginationOptions): PaginationState {
  const {
    totalItems,
    initialPage = DEFAULT_PAGE,
    initialPageSize = DEFAULT_PAGE_SIZE,
    siblingCount = PAGINATION_SIBLING_COUNT,
  } = options;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const safeTotalItems = Math.max(0, totalItems);
  const totalPages = Math.max(1, Math.ceil(safeTotalItems / pageSize));

  // Deleting the last row of the final page must not leave the user stranded.
  const currentPage = clamp(page, 1, totalPages);

  const goToPage = useCallback(
    (nextPage: number) => setPage(clamp(nextPage, 1, totalPages)),
    [totalPages]
  );

  const goToNextPage = useCallback(
    () => setPage((previous) => clamp(previous + 1, 1, totalPages)),
    [totalPages]
  );

  const goToPreviousPage = useCallback(
    () => setPage((previous) => clamp(previous - 1, 1, totalPages)),
    [totalPages]
  );

  const goToFirstPage = useCallback(() => setPage(1), []);
  const goToLastPage = useCallback(() => setPage(totalPages), [totalPages]);

  const setPageSize = useCallback((nextPageSize: number) => {
    setPageSizeState(Math.max(1, nextPageSize));
    setPage(DEFAULT_PAGE);
  }, []);

  const entries = useMemo(
    () => buildEntries(currentPage, totalPages, siblingCount),
    [currentPage, totalPages, siblingCount]
  );

  const rangeStart = safeTotalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd =
    safeTotalItems === 0 ? 0 : Math.min(currentPage * pageSize, safeTotalItems);

  return {
    page: currentPage,
    pageSize,
    totalPages,
    totalItems: safeTotalItems,
    rangeStart,
    rangeEnd,
    canGoPrevious: currentPage > 1,
    canGoNext: currentPage < totalPages,
    entries,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    setPageSize,
  };
}