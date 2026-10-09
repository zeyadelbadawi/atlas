/**
 * The request lists' view state (search, status, type, sort — plus the
 * assignee for the Platform Owner console), held in the URL through
 * `useUrlListState`: it survives Back from a detail page, a refresh and a
 * shared link; unrecognised values fall back to their defaults instead of
 * reaching the API as a 400; any change returns to page 1.
 */
import { useCallback, useMemo } from 'react';
import { useUrlListState } from '@/shared/hooks';
import type { UrlListStateConfig } from '@/shared/hooks';
import {
  CUSTOMER_REQUEST_SORT_OPTIONS,
  CUSTOMER_REQUEST_STATUSES,
  CUSTOMER_REQUEST_TYPES,
  DEFAULT_CUSTOMER_REQUEST_SORT,
  splitCustomerRequestSort,
  type CustomerRequestSortOption,
} from '../constants/customer-request.constants';
import type {
  CustomerRequestFilters,
  CustomerRequestListQuery,
  CustomerRequestStatusFilter,
  CustomerRequestType,
  PlatformCustomerRequestFilters,
  PlatformCustomerRequestListQuery,
} from '../types/customer-request.types';

/** `all` = no filter. */
export const ALL_FILTER = 'all';
/** The assignee filter value for "nobody yet" (the API's own word). */
export const UNASSIGNED_FILTER = 'unassigned';

export interface CustomerRequestListUrlState {
  readonly search: string;
  readonly status: string;
  readonly type: string;
  readonly sort: string;
}

export interface PlatformCustomerRequestListUrlState extends CustomerRequestListUrlState {
  readonly assignee: string;
}

const STATUS_VALUES: readonly string[] = [
  ALL_FILTER,
  'open',
  ...CUSTOMER_REQUEST_STATUSES,
];
const TYPE_VALUES: readonly string[] = [ALL_FILTER, ...CUSTOMER_REQUEST_TYPES];

const ACADEMY_CONFIG: UrlListStateConfig<CustomerRequestListUrlState> = {
  defaults: {
    search: '',
    status: ALL_FILTER,
    type: ALL_FILTER,
    sort: DEFAULT_CUSTOMER_REQUEST_SORT,
  },
  allowed: {
    status: STATUS_VALUES,
    type: TYPE_VALUES,
    sort: CUSTOMER_REQUEST_SORT_OPTIONS,
  },
};

const PLATFORM_CONFIG: UrlListStateConfig<PlatformCustomerRequestListUrlState> =
  {
    defaults: { ...ACADEMY_CONFIG.defaults, assignee: ALL_FILTER },
    allowed: ACADEMY_CONFIG.allowed,
  };

function toFilters(state: CustomerRequestListUrlState): CustomerRequestFilters {
  return {
    ...(state.status !== ALL_FILTER
      ? { status: state.status as CustomerRequestStatusFilter }
      : {}),
    ...(state.type !== ALL_FILTER
      ? { type: state.type as CustomerRequestType }
      : {}),
  };
}

function toQuery<TFilters extends CustomerRequestFilters>(
  state: CustomerRequestListUrlState,
  filters: TFilters,
  page: number,
  pageSize: number
): CustomerRequestListQuery<TFilters> {
  const search = state.search.trim();
  return {
    pagination: { page, pageSize },
    sort: splitCustomerRequestSort(state.sort as CustomerRequestSortOption),
    ...(search ? { search } : {}),
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
  };
}

function useListControls<TState extends CustomerRequestListUrlState>(
  state: TState,
  setState: (next: TState) => void,
  defaults: TState
) {
  const set = useCallback(
    <K extends keyof TState>(key: K, value: TState[K]) =>
      setState({ ...state, [key]: value }),
    [state, setState]
  );
  const clearFilters = useCallback(
    () => setState({ ...defaults, sort: state.sort }),
    [defaults, setState, state.sort]
  );
  const hasFilters = (Object.keys(defaults) as (keyof TState)[]).some(
    (key) => key !== 'sort' && state[key] !== defaults[key]
  );
  return { set, clearFilters, hasFilters };
}

/** The academy's My Requests list. */
export function useCustomerRequestListState() {
  const { state, page, pageSize, setState, setPage, setPageSize } =
    useUrlListState(ACADEMY_CONFIG);
  const query = useMemo<CustomerRequestListQuery>(
    () => toQuery(state, toFilters(state), page, pageSize),
    [state, page, pageSize]
  );
  const controls = useListControls(state, setState, ACADEMY_CONFIG.defaults);
  return { state, page, pageSize, query, setPage, setPageSize, ...controls };
}

/** The Platform Owner console list. */
export function usePlatformCustomerRequestListState() {
  const { state, page, pageSize, setState, setPage, setPageSize } =
    useUrlListState(PLATFORM_CONFIG);
  const query = useMemo<PlatformCustomerRequestListQuery>(() => {
    const assignee = state.assignee.trim().slice(0, 64);
    const filters: PlatformCustomerRequestFilters = {
      ...toFilters(state),
      ...(assignee && assignee !== ALL_FILTER
        ? { assigneeUserId: assignee }
        : {}),
    };
    return toQuery(state, filters, page, pageSize);
  }, [state, page, pageSize]);
  const controls = useListControls(state, setState, PLATFORM_CONFIG.defaults);
  return { state, page, pageSize, query, setPage, setPageSize, ...controls };
}
