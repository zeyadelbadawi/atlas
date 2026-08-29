/**
 * Error normalization.
 *
 * Every failure reaching a feature has the same shape, regardless of whether it
 * originated from the network, a timeout, a cancellation or a backend response.
 * This is what allows the backend to be replaced without touching any feature.
 *
 * User-facing text is never taken from the backend: only translation keys are
 * exposed, so error messages stay localized and never leak internal details.
 */
import axios from 'axios';
import { API_ERROR_KINDS } from '@types';
import type {
  ApiErrorKind,
  FieldViolation,
  NormalizedApiError,
} from '@types';

/** Translation key namespace holding every error message. */
const ERROR_NAMESPACE = 'errors';

/** Failures that may succeed if the same request is repeated. */
const RETRYABLE_KINDS: readonly ApiErrorKind[] = [
  'network',
  'timeout',
  'rateLimited',
  'server',
];

/** Maps an HTTP status code to an Atlas error kind. */
function kindFromStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return 'validation';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rateLimited';
  if (status >= 500) return 'server';
  return 'unknown';
}

/** Returns the translation key for an error kind's message. */
export function errorMessageKey(kind: ApiErrorKind): string {
  return `${ERROR_NAMESPACE}:${kind}.description`;
}

/** Returns the translation key for an error kind's title. */
export function errorTitleKey(kind: ApiErrorKind): string {
  return `${ERROR_NAMESPACE}:${kind}.title`;
}

/**
 * The error type thrown by the API client and propagated through services.
 *
 * Extending `Error` keeps stack traces and `instanceof` checks intact while the
 * normalized payload remains available to every consumer.
 */
export class ApiError extends Error implements NormalizedApiError {
  public readonly kind: ApiErrorKind;
  public readonly messageKey: string;
  public readonly code?: string;
  public readonly status?: number;
  public readonly violations?: readonly FieldViolation[];
  public readonly requestId?: string;
  public readonly retryable: boolean;

  constructor(normalized: NormalizedApiError) {
    // The technical message aids debugging; the UI always renders messageKey.
    super(`[${normalized.kind}] ${normalized.messageKey}`);
    this.name = 'ApiError';
    this.kind = normalized.kind;
    this.messageKey = normalized.messageKey;
    this.code = normalized.code;
    this.status = normalized.status;
    this.violations = normalized.violations;
    this.requestId = normalized.requestId;
    this.retryable = normalized.retryable;
  }

  /** Returns the translation key for this error's title. */
  public get titleKey(): string {
    return errorTitleKey(this.kind);
  }
}

/** Builds a normalized error from a kind, filling in derived fields. */
export function createApiError(
  kind: ApiErrorKind,
  details: Partial<Omit<NormalizedApiError, 'kind' | 'retryable'>> = {}
): ApiError {
  return new ApiError({
    kind,
    messageKey: details.messageKey ?? errorMessageKey(kind),
    code: details.code,
    status: details.status,
    violations: details.violations,
    requestId: details.requestId,
    retryable: RETRYABLE_KINDS.includes(kind),
  });
}

/** Type guard narrowing an unknown value to {@link ApiError}. */
export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** Narrows an arbitrary string to a known error kind. */
function toErrorKind(value: unknown): ApiErrorKind | undefined {
  return typeof value === 'string' &&
    (API_ERROR_KINDS as readonly string[]).includes(value)
    ? (value as ApiErrorKind)
    : undefined;
}

/** Shape a backend may use to describe a failure. Every field is optional. */
interface BackendErrorPayload {
  readonly code?: unknown;
  readonly kind?: unknown;
  readonly requestId?: unknown;
  readonly errors?: unknown;
  readonly violations?: unknown;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Extracts field-level violations from a backend payload.
 *
 * Only entries carrying both a field and a message key are kept, so a
 * malformed payload can never produce a broken form error.
 */
function readViolations(payload: BackendErrorPayload): readonly FieldViolation[] | undefined {
  const raw = payload.violations ?? payload.errors;
  if (!Array.isArray(raw)) return undefined;

  const violations = raw.reduce<FieldViolation[]>((collected, entry) => {
    if (typeof entry !== 'object' || entry === null) return collected;

    const candidate = entry as Record<string, unknown>;
    const field = readString(candidate.field);
    const messageKey = readString(candidate.messageKey);

    if (field && messageKey) {
      collected.push({ field, messageKey });
    }

    return collected;
  }, []);

  return violations.length > 0 ? violations : undefined;
}

/** Reads the request id a backend may attach for support traceability. */
function readRequestId(payload: BackendErrorPayload): string | undefined {
  return readString(payload.requestId);
}

/**
 * Unwraps a raw HTTP body into the flat shape {@link normalizeResponseError}
 * reads from.
 *
 * `AllExceptionsFilter` (atlas backend `src/common/filters/`) always nests
 * the normalized error one level under an `error` key —
 * `{ error: { kind, messageKey, code, status, violations, requestId,
 * retryable } }` — never flat. A flat top-level shape is still accepted so
 * this stays forward-compatible with a future endpoint that doesn't nest,
 * rather than assuming the current backend is the only one this will ever
 * talk to.
 */
function unwrapErrorBody(payload: unknown): BackendErrorPayload {
  if (typeof payload !== 'object' || payload === null) return {};

  const root = payload as { readonly error?: unknown };
  if (typeof root.error === 'object' && root.error !== null) {
    return root.error as BackendErrorPayload;
  }

  return payload as BackendErrorPayload;
}

/**
 * Normalizes a response-based failure.
 *
 * @param status HTTP-like status code of the response.
 * @param payload Parsed response body, if any.
 */
export function normalizeResponseError(
  status: number,
  payload: unknown
): ApiError {
  const body = unwrapErrorBody(payload);
  const kind = toErrorKind(body.kind) ?? kindFromStatus(status);

  return createApiError(kind, {
    status,
    code: readString(body.code),
    requestId: readRequestId(body),
    violations: kind === 'validation' ? readViolations(body) : undefined,
  });
}

/** Normalizes any thrown value into an {@link ApiError}. */
export function normalizeUnknownError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (error instanceof DOMException && error.name === 'AbortError') {
    return createApiError('cancelled');
  }

  if (error instanceof TypeError) {
    // A raw (non-Axios) `fetch` rejects with a TypeError when the request
    // never reached a server. Kept for any caller that isn't going through
    // the Axios-backed `HttpClient` — see `normalizeAxiosError` for that path.
    return createApiError('network');
  }

  return createApiError('unknown');
}

/** Alias for normalizeUnknownError for backward compatibility. */
export const normalizeApiError = normalizeUnknownError;

/**
 * Normalizes a failure thrown by the Axios-backed `HttpClient`.
 *
 * This is the actual transport in use (`http-client.ts` wraps `axios`, not
 * the raw `fetch` API), and an `AxiosError` is neither a `DOMException`
 * `AbortError` nor a `TypeError` — so routing it through
 * {@link normalizeUnknownError} alone always fell through to the generic
 * `'unknown'` kind, discarding the backend's actual status and structured
 * body (kind/messageKey/violations) on every single failed request. This is
 * the one place that distinction is made:
 *
 * - A response was received (`error.response` set): the backend did answer,
 *   so its real status and body are authoritative — {@link normalizeResponseError}.
 * - The request was cancelled (`AbortController`/`CancelToken`): `'cancelled'`.
 * - No response and the client aborted the wait itself: `'timeout'`.
 * - No response for any other reason (DNS/CORS/offline/refused): `'network'`.
 * - Anything else (a non-Axios throw) falls back to {@link normalizeUnknownError}.
 */
export function normalizeAxiosError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (axios.isAxiosError(error)) {
    // `error.code === 'ERR_CANCELED'` alone identifies a cancelled Axios
    // request (v1's `CanceledError`) — deliberately not also combined with
    // `axios.isCancel(error)` here: two type predicates OR'd together in
    // one guard clause makes TypeScript narrow `error` to `never` for the
    // rest of this block (`Exclude<AxiosError, Cancel>` collapses to
    // nothing), which then fails to compile on every property access below.
    if (error.code === 'ERR_CANCELED') {
      return createApiError('cancelled');
    }

    if (error.response) {
      return normalizeResponseError(error.response.status, error.response.data);
    }

    if (error.code === 'ECONNABORTED') {
      return createApiError('timeout');
    }

    return createApiError('network');
  }

  return normalizeUnknownError(error);
}