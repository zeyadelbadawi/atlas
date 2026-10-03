/**
 * A server-paged list's view state — search, filters, sort, page and page
 * size — held in the URL, so it survives Back from a detail page, a
 * refresh and a shared link.
 *
 * The generic form of the convention `usePlatformContactSubmissionFilters`
 * follows, for lists whose filter state is a flat record of strings (one
 * URL parameter per field, named after it). Every URL value is validated
 * on the way in — an enumerated field against its allowlist, a date field
 * as a real `YYYY-MM-DD` — and anything unrecognised falls back to its
 * default rather than reaching the API as a 400. Defaults are never
 * written back, every write is a `replace` (no history entry per
 * keystroke), and any change to what is being looked at returns to page 1.
 *
 * `config` must be stable (a module constant).
 */
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@constants';

/** A flat filter state: every field is a string (one URL parameter each). */
export type StringFields<T> = { readonly [K in keyof T]: string };

export interface UrlListStateConfig<TState extends StringFields<TState>> {
  readonly defaults: TState;
  /** Accepted values of each enumerated field. */
  readonly allowed?: { readonly [K in keyof TState]?: readonly string[] };
  /** `YYYY-MM-DD` fields. */
  readonly dates?: readonly (keyof TState & string)[];
}

export interface UrlListState<TState extends StringFields<TState>> {
  readonly state: TState;
  readonly page: number;
  readonly pageSize: number;
}

const PAGE = 'page';
const PAGE_SIZE = 'pageSize';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(raw: string): boolean {
  if (!ISO_DATE.test(raw)) return false;
  const parsed = new Date(`${raw}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === raw
  );
}

function readPositiveInt(raw: string | null): number | undefined {
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const value = Number(raw);
  return value >= 1 ? value : undefined;
}

function fieldsOf<TState extends StringFields<TState>>(
  config: UrlListStateConfig<TState>
): (keyof TState & string)[] {
  return Object.keys(config.defaults) as (keyof TState & string)[];
}

export function parseUrlListState<TState extends StringFields<TState>>(
  params: URLSearchParams,
  config: UrlListStateConfig<TState>
): UrlListState<TState> {
  const state: { -readonly [K in keyof TState]: TState[K] } = {
    ...config.defaults,
  };
  for (const key of fieldsOf(config)) {
    const raw = params.get(key);
    if (raw === null) continue;
    const allowed = config.allowed?.[key];
    const valid = allowed
      ? allowed.includes(raw)
      : config.dates?.includes(key)
        ? isIsoDate(raw)
        : true;
    if (valid) state[key] = raw as TState[typeof key];
  }
  const pageSize = readPositiveInt(params.get(PAGE_SIZE));
  return {
    state,
    page: readPositiveInt(params.get(PAGE)) ?? DEFAULT_PAGE,
    pageSize:
      pageSize !== undefined && PAGE_SIZE_OPTIONS.includes(pageSize)
        ? pageSize
        : DEFAULT_PAGE_SIZE,
  };
}

export function useUrlListState<TState extends StringFields<TState>>(
  config: UrlListStateConfig<TState>
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const serialized = searchParams.toString();

  const parsed = useMemo(
    () => parseUrlListState(new URLSearchParams(serialized), config),
    [serialized, config]
  );

  const update = useCallback(
    (edit: (next: URLSearchParams) => void) =>
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          edit(next);
          return next;
        },
        { replace: true }
      ),
    [setSearchParams]
  );

  /** Replaces the filter state and returns to page 1. */
  const setState = useCallback(
    (state: TState) =>
      update((next) => {
        for (const key of fieldsOf(config)) {
          if (state[key] === config.defaults[key]) next.delete(key);
          else next.set(key, state[key]);
        }
        next.delete(PAGE);
      }),
    [update, config]
  );

  const setPage = useCallback(
    (page: number) =>
      update((next) => {
        if (page <= DEFAULT_PAGE) next.delete(PAGE);
        else next.set(PAGE, String(page));
      }),
    [update]
  );

  const setPageSize = useCallback(
    (pageSize: number) =>
      update((next) => {
        if (pageSize === DEFAULT_PAGE_SIZE) next.delete(PAGE_SIZE);
        else next.set(PAGE_SIZE, String(pageSize));
        next.delete(PAGE);
      }),
    [update]
  );

  return { ...parsed, setState, setPage, setPageSize };
}
