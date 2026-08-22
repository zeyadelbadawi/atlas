/**
 * Cross-cutting primitive types shared by every Atlas module.
 *
 * These types describe shapes, never business rules. Business domain types are
 * introduced by the feature that owns them.
 */

/** A value that may legitimately be absent. */
export type Nullable<T> = T | null;

/** A value that may not have been provided. */
export type Optional<T> = T | undefined;

/** A plain serialisable JSON value. */
export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

/** A dictionary keyed by string. */
export type Dictionary<TValue> = Record<string, TValue>;

/** Makes the listed keys required while leaving the rest untouched. */
export type WithRequired<TObject, TKey extends keyof TObject> = TObject &
  Required<Pick<TObject, TKey>>;

/** Extracts the resolved type of a promise-returning function. */
export type Awaited<TValue> = TValue extends Promise<infer TResolved>
  ? TResolved
  : TValue;

/** Sort direction shared by tables, lists and query parameters. */
export type SortDirection = 'asc' | 'desc';

/** A single sort instruction. */
export interface SortDescriptor {
  readonly field: string;
  readonly direction: SortDirection;
}

/** Zero-based cursor into a paginated collection. */
export interface PaginationDescriptor {
  readonly page: number;
  readonly pageSize: number;
}

/** Identity shape used by every persisted Atlas entity. */
export interface Identifiable {
  readonly id: string;
}

/** Audit fields maintained by the platform, expressed as ISO-8601 strings. */
export interface Timestamped {
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Base shape of an Atlas entity. Features extend it with their own fields. */
export interface BaseEntity extends Identifiable, Timestamped {}

/** A selectable option used by selects, radios and filters. */
export interface SelectOption<TValue extends string = string> {
  readonly value: TValue;
  /** Translation key. Never a literal user-facing string. */
  readonly labelKey: string;
  readonly disabled?: boolean;
}

/** Lifecycle of any asynchronous operation surfaced to the user. */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';