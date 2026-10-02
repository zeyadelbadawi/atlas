/**
 * The website Messages list's view state, held in the URL.
 *
 * FILTERS LIVE IN THE URL — the same convention as the Notifications,
 * Global Courses and Alerts pages — so "new messages from last week,
 * page 2" survives a refresh, the browser's Back button and being sent
 * to a colleague. Search, status, received-date range, sort, page and
 * page size are all here; the selected message is not (it is a drawer
 * over the list, not a place).
 *
 * The URL is user-editable text, so every value is validated on the way
 * in and anything unrecognised falls back to its default rather than
 * reaching the API as a 400. Defaults are never written back, so a plain
 * visit keeps a clean URL.
 *
 * Any change to what is being looked at (search, status, dates, sort,
 * page size) returns to page 1: page 4 of "all" is meaningless — and
 * usually empty — once "new" is applied.
 */
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@constants';
import type {
  ContactSubmissionListQuery,
  ContactSubmissionSortField,
  ContactSubmissionStatus,
  SortDirection,
} from '@types';

/** `sortBy:sortDirection` pairs offered by the sort control, default first. */
export const CONTACT_SUBMISSION_SORT_OPTIONS = [
  'createdAt:desc',
  'createdAt:asc',
  'name:asc',
  'name:desc',
  'email:asc',
] as const;

export type ContactSubmissionSortOption =
  (typeof CONTACT_SUBMISSION_SORT_OPTIONS)[number];

const DEFAULT_SORT: ContactSubmissionSortOption = 'createdAt:desc';

const STATUSES: readonly ContactSubmissionStatus[] = [
  'new',
  'read',
  'archived',
];

/** URL parameter names — identical to the API's own, so a URL reads like its request. */
const PARAM = {
  search: 'search',
  status: 'status',
  from: 'from',
  to: 'to',
  sortBy: 'sortBy',
  sortDirection: 'sortDirection',
  page: 'page',
  pageSize: 'pageSize',
} as const;

/** Parameters that narrow the result set (what "Clear filters" removes). */
const FILTER_PARAMS = [
  PARAM.search,
  PARAM.status,
  PARAM.from,
  PARAM.to,
] as const;

export interface ContactSubmissionFilterState {
  readonly search: string;
  readonly status?: ContactSubmissionStatus;
  /** `YYYY-MM-DD`, inclusive. */
  readonly from?: string;
  /** `YYYY-MM-DD`, inclusive. */
  readonly to?: string;
  readonly sort: ContactSubmissionSortOption;
  readonly page: number;
  readonly pageSize: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date in `YYYY-MM-DD` form (rejects `2026-02-31`). */
function readDate(raw: string | null): string | undefined {
  if (!raw || !ISO_DATE.test(raw)) return undefined;
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10) === raw ? raw : undefined;
}

function readPositiveInt(raw: string | null): number | undefined {
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const value = Number(raw);
  return value >= 1 ? value : undefined;
}

export function parseContactSubmissionFilters(
  params: URLSearchParams
): ContactSubmissionFilterState {
  const rawStatus = params.get(PARAM.status);
  const status = STATUSES.find((value) => value === rawStatus);

  const rawSort = `${params.get(PARAM.sortBy) ?? ''}:${
    params.get(PARAM.sortDirection) ?? ''
  }`;
  const sort =
    CONTACT_SUBMISSION_SORT_OPTIONS.find((option) => option === rawSort) ??
    DEFAULT_SORT;

  const pageSize = readPositiveInt(params.get(PARAM.pageSize));
  const from = readDate(params.get(PARAM.from));
  const to = readDate(params.get(PARAM.to));

  return {
    search: params.get(PARAM.search)?.trim() ?? '',
    ...(status ? { status } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    sort,
    page: readPositiveInt(params.get(PARAM.page)) ?? DEFAULT_PAGE,
    pageSize:
      pageSize !== undefined && PAGE_SIZE_OPTIONS.includes(pageSize)
        ? pageSize
        : DEFAULT_PAGE_SIZE,
  };
}

export function splitContactSubmissionSort(
  option: ContactSubmissionSortOption
): {
  readonly field: ContactSubmissionSortField;
  readonly direction: SortDirection;
} {
  const [field, direction] = option.split(':') as [
    ContactSubmissionSortField,
    SortDirection,
  ];
  return { field, direction };
}

/** The view state as the list endpoint's query. Unset filters are left out entirely. */
export function toContactSubmissionListQuery(
  state: ContactSubmissionFilterState
): ContactSubmissionListQuery {
  const filters = {
    ...(state.status ? { status: state.status } : {}),
    ...(state.from ? { from: state.from } : {}),
    ...(state.to ? { to: state.to } : {}),
  };
  return {
    pagination: { page: state.page, pageSize: state.pageSize },
    sort: splitContactSubmissionSort(state.sort),
    ...(state.search ? { search: state.search } : {}),
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
  };
}

export interface UseContactSubmissionFiltersResult {
  readonly filters: ContactSubmissionFilterState;
  /** Whether anything narrows the result set (search, status or dates). */
  readonly hasFilters: boolean;
  readonly setSearch: (search: string) => void;
  readonly setStatus: (status: ContactSubmissionStatus | undefined) => void;
  readonly setFrom: (from: string | undefined) => void;
  readonly setTo: (to: string | undefined) => void;
  readonly setSort: (sort: ContactSubmissionSortOption) => void;
  readonly setPage: (page: number) => void;
  readonly setPageSize: (pageSize: number) => void;
  /** Removes search, status and dates; keeps sort and page size. */
  readonly clearFilters: () => void;
}

export function useContactSubmissionFilters(): UseContactSubmissionFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const serialized = searchParams.toString();

  const filters = useMemo(
    () => parseContactSubmissionFilters(new URLSearchParams(serialized)),
    [serialized]
  );

  /**
   * Applies `edit` to a copy of the current URL params. `resetPage` drops
   * `page` (back to 1) — every change except paging itself does. `replace`
   * so adjusting a filter does not stack history entries the Back button
   * then has to walk through (the convention of every URL-filtered page).
   */
  const update = useCallback(
    (edit: (next: URLSearchParams) => void, resetPage = true) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          edit(next);
          if (resetPage) next.delete(PARAM.page);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setOptional = useCallback(
    (key: string, value: string | undefined) =>
      update((next) => {
        if (value) next.set(key, value);
        else next.delete(key);
      }),
    [update]
  );

  const setSearch = useCallback(
    (search: string) => setOptional(PARAM.search, search.trim() || undefined),
    [setOptional]
  );
  const setStatus = useCallback(
    (status: ContactSubmissionStatus | undefined) =>
      setOptional(PARAM.status, status),
    [setOptional]
  );
  const setFrom = useCallback(
    (from: string | undefined) =>
      setOptional(PARAM.from, readDate(from ?? null)),
    [setOptional]
  );
  const setTo = useCallback(
    (to: string | undefined) => setOptional(PARAM.to, readDate(to ?? null)),
    [setOptional]
  );

  const setSort = useCallback(
    (sort: ContactSubmissionSortOption) =>
      update((next) => {
        if (sort === DEFAULT_SORT) {
          next.delete(PARAM.sortBy);
          next.delete(PARAM.sortDirection);
          return;
        }
        const { field, direction } = splitContactSubmissionSort(sort);
        next.set(PARAM.sortBy, field);
        next.set(PARAM.sortDirection, direction);
      }),
    [update]
  );

  const setPage = useCallback(
    (page: number) =>
      update((next) => {
        if (page <= DEFAULT_PAGE) next.delete(PARAM.page);
        else next.set(PARAM.page, String(page));
      }, false),
    [update]
  );

  const setPageSize = useCallback(
    (pageSize: number) =>
      update((next) => {
        if (pageSize === DEFAULT_PAGE_SIZE) next.delete(PARAM.pageSize);
        else next.set(PARAM.pageSize, String(pageSize));
      }),
    [update]
  );

  const clearFilters = useCallback(
    () =>
      update((next) => {
        for (const key of FILTER_PARAMS) next.delete(key);
      }),
    [update]
  );

  const hasFilters =
    filters.search !== '' ||
    filters.status !== undefined ||
    filters.from !== undefined ||
    filters.to !== undefined;

  return {
    filters,
    hasFilters,
    setSearch,
    setStatus,
    setFrom,
    setTo,
    setSort,
    setPage,
    setPageSize,
    clearFilters,
  };
}
