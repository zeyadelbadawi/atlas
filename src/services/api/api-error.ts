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
 * Normalizes a response-based failure.
 *
 * @param status HTTP-like status code of the response.
 * @param payload Parsed response body, if any.
 */
export function normalizeResponseError(
  status: number,
  payload: unknown
): ApiError {
  const body: BackendErrorPayload =
    typeof payload === 'object' && payload !== null
      ? (payload as BackendErrorPayload)
      : {};

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
    // `fetch` rejects with a TypeError when the request never reached a server.
    return createApiError('network');
  }

  return createApiError('unknown');
}

/** Alias for normalizeUnknownError for backward compatibility. */
export const normalizeApiError = normalizeUnknownError;