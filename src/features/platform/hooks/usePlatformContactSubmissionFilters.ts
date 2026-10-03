/**
 * The Platform Owner contact inbox's view state, held in the URL.
 *
 * Same convention as the academy Messages page
 * (`useContactSubmissionFilters`): search, status, topic, received-date
 * range, sort, page and page size survive a refresh, Back and a shared
 * link. Every URL value is validated on the way in and anything
 * unrecognised falls back to its default rather than reaching the API as
 * a 400; defaults are never written back. Any change to what is being
 * looked at returns to page 1.
 */
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@constants';
import type { SortDirection } from '@types';
import type {
  PlatformContactSubmissionListQuery,
  PlatformContactSubmissionSortField,
  PlatformContactSubmissionStatus,
  PlatformContactSubmissionTopic,
} from '../services/PlatformContactSubmissionService';

export const PLATFORM_CONTACT_SORT_OPTIONS = [
  'createdAt:desc',
  'createdAt:asc',
  'name:asc',
  'name:desc',
  'email:asc',
] as const;

export type PlatformContactSortOption =
  (typeof PLATFORM_CONTACT_SORT_OPTIONS)[number];

export const PLATFORM_CONTACT_STATUSES: readonly PlatformContactSubmissionStatus[] =
  ['new', 'read', 'archived'];

export const PLATFORM_CONTACT_TOPICS: readonly PlatformContactSubmissionTopic[] =
  ['sales', 'support', 'partnership', 'other'];

const DEFAULT_SORT: PlatformContactSortOption = 'createdAt:desc';

const PARAM = {
  search: 'search',
  status: 'status',
  topic: 'topic',
  from: 'from',
  to: 'to',
  sortBy: 'sortBy',
  sortDirection: 'sortDirection',
  page: 'page',
  pageSize: 'pageSize',
} as const;

const FILTER_PARAMS = [
  PARAM.search,
  PARAM.status,
  PARAM.topic,
  PARAM.from,
  PARAM.to,
] as const;

export interface PlatformContactFilterState {
  readonly search: string;
  readonly status?: PlatformContactSubmissionStatus;
  readonly topic?: PlatformContactSubmissionTopic;
  readonly from?: string;
  readonly to?: string;
  readonly sort: PlatformContactSortOption;
  readonly page: number;
  readonly pageSize: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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

export function parsePlatformContactFilters(
  params: URLSearchParams
): PlatformContactFilterState {
  const status = PLATFORM_CONTACT_STATUSES.find(
    (value) => value === params.get(PARAM.status)
  );
  const topic = PLATFORM_CONTACT_TOPICS.find(
    (value) => value === params.get(PARAM.topic)
  );
  const rawSort = `${params.get(PARAM.sortBy) ?? ''}:${
    params.get(PARAM.sortDirection) ?? ''
  }`;
  const sort =
    PLATFORM_CONTACT_SORT_OPTIONS.find((option) => option === rawSort) ??
    DEFAULT_SORT;
  const pageSize = readPositiveInt(params.get(PARAM.pageSize));
  const from = readDate(params.get(PARAM.from));
  const to = readDate(params.get(PARAM.to));

  return {
    search: params.get(PARAM.search)?.trim() ?? '',
    ...(status ? { status } : {}),
    ...(topic ? { topic } : {}),
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

function splitSort(option: PlatformContactSortOption): {
  readonly field: PlatformContactSubmissionSortField;
  readonly direction: SortDirection;
} {
  const [field, direction] = option.split(':') as [
    PlatformContactSubmissionSortField,
    SortDirection,
  ];
  return { field, direction };
}

export function toPlatformContactListQuery(
  state: PlatformContactFilterState
): PlatformContactSubmissionListQuery {
  const filters = {
    ...(state.status ? { status: state.status } : {}),
    ...(state.topic ? { topic: state.topic } : {}),
    ...(state.from ? { from: state.from } : {}),
    ...(state.to ? { to: state.to } : {}),
  };
  return {
    pagination: { page: state.page, pageSize: state.pageSize },
    sort: splitSort(state.sort),
    ...(state.search ? { search: state.search } : {}),
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
  };
}

export function usePlatformContactSubmissionFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const serialized = searchParams.toString();

  const filters = useMemo(
    () => parsePlatformContactFilters(new URLSearchParams(serialized)),
    [serialized]
  );

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
    (status: PlatformContactSubmissionStatus | undefined) =>
      setOptional(PARAM.status, status),
    [setOptional]
  );
  const setTopic = useCallback(
    (topic: PlatformContactSubmissionTopic | undefined) =>
      setOptional(PARAM.topic, topic),
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
    (sort: PlatformContactSortOption) =>
      update((next) => {
        if (sort === DEFAULT_SORT) {
          next.delete(PARAM.sortBy);
          next.delete(PARAM.sortDirection);
          return;
        }
        const { field, direction } = splitSort(sort);
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
    filters.topic !== undefined ||
    filters.from !== undefined ||
    filters.to !== undefined;

  return {
    filters,
    hasFilters,
    setSearch,
    setStatus,
    setTopic,
    setFrom,
    setTo,
    setSort,
    setPage,
    setPageSize,
    clearFilters,
  };
}
