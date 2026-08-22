/**
 * Transport-agnostic API contracts.
 *
 * Atlas deliberately does not describe REST, GraphQL or any specific backend.
 * These types describe the *shape* the Service Layer guarantees to callers,
 * which lets the transport be replaced without touching a single feature.
 */
import type { JsonValue, PaginationDescriptor, SortDescriptor } from './common.types';

/** HTTP-like verbs understood by the API client. */
export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Query string values accepted by the request builder. */
export type QueryParamValue =
  | string
  | number
  | boolean
  | readonly string[]
  | readonly number[]
  | null
  | undefined;

export type QueryParams = Record<string, QueryParamValue>;

/** Describes one request handed to the API client by a service. */
export interface ApiRequest<TBody = unknown> {
  readonly method: RequestMethod;
  /** Resource path relative to the configured API base URL. */
  readonly path: string;
  readonly params?: QueryParams;
  readonly body?: TBody;
  readonly headers?: Record<string, string>;
  /** Overrides the default timeout for slow operations such as uploads. */
  readonly timeoutMs?: number;
  /** Allows a caller to cancel an in-flight request. */
  readonly signal?: AbortSignal;
}

/** Normalised successful response returned to services. */
export interface ApiResponse<TData> {
  readonly data: TData;
  readonly status: number;
  readonly requestId?: string;
}

/** Metadata accompanying a paginated collection. */
export interface PaginationMeta {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

/** A page of results as exposed by the Service Layer. */
export interface PaginatedResult<TItem> {
  readonly items: readonly TItem[];
  readonly pagination: PaginationMeta;
}

/** Standard collection query accepted by list-style service methods. */
export interface CollectionQuery {
  readonly pagination?: PaginationDescriptor;
  readonly sort?: SortDescriptor;
  readonly search?: string;
  readonly filters?: Record<string, JsonValue>;
}

/** Categories every Atlas error is normalised into. */
export const API_ERROR_KINDS = [
  'network',
  'timeout',
  'cancelled',
  'validation',
  'unauthorized',
  'forbidden',
  'notFound',
  'conflict',
  'rateLimited',
  'server',
  'unknown',
] as const;

export type ApiErrorKind = (typeof API_ERROR_KINDS)[number];

/** A single field-level validation failure reported by the backend. */
export interface FieldViolation {
  readonly field: string;
  /** Translation key describing the violation. */
  readonly messageKey: string;
  /** Interpolation values for the message key. */
  readonly values?: Record<string, string | number>;
}

/**
 * The normalised error shape every Atlas consumer can rely on, regardless of
 * which backend or transport produced the failure.
 */
export interface NormalizedApiError {
  readonly kind: ApiErrorKind;
  /** Translation key for the user-facing message. */
  readonly messageKey: string;
  /** Stable machine-readable code, when the backend supplies one. */
  readonly code?: string;
  readonly status?: number;
  readonly violations?: readonly FieldViolation[];
  readonly requestId?: string;
  /** True when repeating the same request may succeed. */
  readonly retryable: boolean;
}