/**
 * HTTP client.
 *
 * The transport layer. Wraps axios and provides infrastructure-managed headers,
 * error normalization, retries and cancellation. Every API request goes through
 * this client; features never call axios directly.
 */
import { withDevHostAcademy } from './dev-host-academy';
import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { ENV } from '@config';
import { tokenService } from '@services/identity';
import type { ApiRequest, ApiResponse } from '@types';
import { normalizeAxiosError, ApiError } from './api-error';

/**
 * HTTP methods whose repetition has the same effect as a single call
 * (RFC 9110 §9.2.2). Only these may be replayed after an AMBIGUOUS failure.
 */
const IDEMPOTENT_METHODS = new Set(['get', 'head', 'options', 'put', 'delete']);

/**
 * Whether automatically replaying a failed request is safe.
 *
 * THE DEFECT THIS PREVENTS. Every method used to be retried up to three
 * times on a network error, a 5xx or a 429. A network error or a 5xx is
 * AMBIGUOUS for a write: the server may have committed it before the
 * connection dropped or the proxy answered 502, and a replayed `POST`
 * then creates a second submission, invitation, announcement or payment.
 *
 * The rule:
 *   - idempotent methods — always replayable;
 *   - any method on 429 — the rate limiter refused it before any handler
 *     ran, so nothing was written;
 *   - a write whose JSON body carries an `idempotencyKey` — the server
 *     dedupes on it (checkouts, course orders, refunds, provisioning), so a
 *     replay returns the original outcome instead of a duplicate;
 *   - every other write — never replayed; the caller sees the error and
 *     the user decides.
 */
export function isReplaySafe(
  config: { method?: string; data?: unknown },
  error: Pick<AxiosError, 'response'>
): boolean {
  const method = (config.method ?? 'get').toLowerCase();
  if (IDEMPOTENT_METHODS.has(method)) return true;
  if (error.response?.status === 429) return true;
  return carriesIdempotencyKey(config.data);
}

function carriesIdempotencyKey(data: unknown): boolean {
  let body = data;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return false;
    }
  }
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { idempotencyKey?: unknown }).idempotencyKey === 'string' &&
    (body as { idempotencyKey: string }).idempotencyKey.length > 0
  );
}

/**
 * Server rendering of the public Academy website
 * (Reports/SSR_ARCHITECTURE_ANALYSIS.md): the renderer calls the same
 * public API over the internal network. Its per-request context gives the
 * absolute origin and the headers to forward (the visitor's `X-Real-IP`),
 * and marks the request as anonymous: no token, no refresh, no retry.
 * Never set in the browser.
 */
export interface ServerRequestContext {
  readonly apiOrigin: string;
  readonly headers: Readonly<Record<string, string>>;
  /** Per-request timeout, in milliseconds. */
  readonly timeoutMs: number;
  /**
   * The largest response body accepted, in bytes. A larger one aborts the
   * download and fails the request. The renderer passes its page budget:
   * the page embeds every response it renders from, so one response over
   * the budget already means the page would be.
   */
  readonly maxResponseBytes?: number;
  /** Called when a response was refused for exceeding `maxResponseBytes`. */
  readonly onResponseTooLarge?: () => void;
}

let serverRequestContext: (() => ServerRequestContext | undefined) | undefined;

/** Installed once by the server renderer (an AsyncLocalStorage lookup). */
export function setServerRequestContextProvider(
  provider: () => ServerRequestContext | undefined
): void {
  serverRequestContext = provider;
}

/** Default timeout for API requests, in milliseconds. */
const DEFAULT_TIMEOUT_MS = 30_000;

/** Maximum number of retry attempts for transient failures. */
const MAX_RETRIES = 3;

/** Delay between retries, in milliseconds. */
const RETRY_DELAY_MS = 1_000;

/**
 * The auth-lifecycle endpoints, which must never trigger the 401
 * refresh-and-retry below.
 *
 * THE DEADLOCK THIS PREVENTS. `performRefresh` issues `POST /auth/refresh`
 * through this same axios instance, so its response passes back through
 * this same interceptor. When the refresh token is itself already revoked
 * — which is exactly the state account deletion leaves every session in —
 * that request answers 401 too, re-enters the branch, finds
 * `refreshPromise` already set, and awaits it. But `refreshPromise` can
 * only settle once this very request settles. Neither side can move: a
 * true circular await, with no rejection and no timeout, because it is
 * the interceptor's own promise that is stuck rather than any socket.
 *
 * The visible symptom was the whole application freezing the moment a
 * user deleted their account, and staying frozen after a reload —
 * `restore()` hit the same deadlock through `/auth/validate`, so
 * `isRestoring` never went false and `RouteGuard` rendered its pending
 * fallback forever.
 *
 * Refreshing a session is meaningless for these routes anyway: they are
 * how a session is established, checked or ended. A 401 from any of them
 * is a final answer, so it is returned as one. `/auth/academy-join` (smart
 * academy signup) is a password check exactly like sign-in: its 401 means
 * "wrong credentials", never "your session expired". The Google completion
 * and its steps are the same: a 401 there is a spent/expired flow or a
 * wrong password. (`/auth/google/authorize` is NOT listed: for the
 * Account-settings `link` intent it is a signed-in call like any other.)
 */
const AUTH_LIFECYCLE_PATHS = [
  '/auth/refresh',
  '/auth/sign-out',
  '/auth/sign-in',
  '/auth/validate',
  '/auth/academy-join',
  '/auth/google/complete',
  '/auth/google/link',
  '/auth/google/create-account',
  '/auth/google/activate',
] as const;

/** True when the request is one of the auth-lifecycle routes above. */
function isAuthLifecycleRequest(url: string | undefined): boolean {
  if (!url) return false;
  return AUTH_LIFECYCLE_PATHS.some((path) => url.includes(path));
}

export class HttpClient {
  private readonly instance: AxiosInstance;
  private refreshPromise: Promise<void> | null = null;

  constructor(baseURL: string) {
    this.instance = axios.create({
      baseURL,
      timeout: DEFAULT_TIMEOUT_MS,
      // Do not set default Content-Type here.
      // JSON requests will set it explicitly in request().
      // FormData requests must not have Content-Type (browser sets boundary).
    });

    this.setupInterceptors();
  }

  /**
   * Sends an HTTP request.
   *
   * @param request Request descriptor.
   * @returns Normalized response.
   */
  public async request<TData, TBody = unknown>(
    request: ApiRequest<TBody>
  ): Promise<ApiResponse<TData>> {
    try {
      // Prepare headers.
      // For FormData, do NOT set Content-Type (browser sets boundary).
      // For other requests, default to application/json.
      const headers: Record<string, string> = { ...request.headers };

      if (request.body instanceof FormData) {
        // Explicitly ensure Content-Type is not set for FormData.
        delete headers['Content-Type'];
      } else if (!headers['Content-Type']) {
        // Set Content-Type for non-FormData requests.
        headers['Content-Type'] = 'application/json';
      }

      const response = await this.instance.request<TData>({
        method: request.method,
        url: request.path,
        params: request.params,
        data: request.body,
        headers,
        timeout: request.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        signal: request.signal,
        responseType: request.responseType,
        // Real byte progress from the browser. Only attached when a caller
        // actually wants it, so ordinary requests pay nothing.
        onUploadProgress: request.onUploadProgress
          ? (event) =>
              request.onUploadProgress?.({
                loaded: event.loaded,
                // `undefined` rather than a guess when the browser cannot
                // determine the size — the UI shows an indeterminate state
                // instead of a percentage derived from nothing.
                total: event.total,
              })
          : undefined,
      });

      return {
        data: response.data,
        status: response.status,
        requestId: response.headers['x-request-id'],
      };
    } catch (error) {
      throw normalizeAxiosError(error);
    }
  }

  /**
   * Sets up request and response interceptors.
   */
  private setupInterceptors(): void {
    // Request interceptor: attach authentication and infrastructure headers.
    this.instance.interceptors.request.use(
      (config) => {
        const server = serverRequestContext?.();
        if (server) {
          // Server render: the internal origin, the forwarded headers, and
          // nothing that could carry an identity.
          config.baseURL = `${server.apiOrigin}${config.baseURL ?? ''}`;
          config.timeout = server.timeoutMs;
          if (server.maxResponseBytes !== undefined) {
            config.maxContentLength = server.maxResponseBytes;
          }
          for (const [name, value] of Object.entries(server.headers)) {
            config.headers[name] = value;
          }
          delete config.headers.Authorization;
          return config;
        }

        // Attach access token if available.
        const tokens = tokenService.retrieve();
        if (tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }

        // Attach correlation ID for request tracing.
        config.headers['X-Correlation-ID'] = this.generateCorrelationId();

        // Local development: name the dev-preview Academy on the routes that
        // resolve it from the host (no-op in a production build).
        config.params = withDevHostAcademy(config.url, config.params);

        // Attach client metadata.
        config.headers['X-Client-Version'] = ENV.version ?? '1.0.0';

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: handle authentication failures and retries.
    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // A server render never refreshes a session or replays a request:
        // it has no session, and its time budget is short.
        const server = serverRequestContext?.();
        if (server) {
          if (
            error.code === 'ERR_BAD_RESPONSE' &&
            error.message.startsWith('maxContentLength')
          ) {
            server.onResponseTooLarge?.();
          }
          return Promise.reject(error);
        }

        const originalRequest = error.config;

        // Handle 401 Unauthorized: token may have expired.
        if (error.response?.status === 401 && originalRequest) {
          // The refresh token is an HttpOnly cookie script cannot see; try a
          // refresh whenever this browser may hold a session here.
          if (
            tokenService.mayHaveSession() &&
            !originalRequest.headers['X-Retry-After-Refresh'] &&
            !isAuthLifecycleRequest(originalRequest.url)
          ) {
            try {
              // Use shared refresh promise to deduplicate concurrent refresh requests.
              if (!this.refreshPromise) {
                this.refreshPromise = this.performRefresh();
              }

              await this.refreshPromise;

              // Retry the original request with the new token.
              originalRequest.headers['X-Retry-After-Refresh'] = 'true';
              return this.instance.request(originalRequest);
            } catch {
              // Refresh failed; clear tokens and propagate error.
              tokenService.clear();
              return Promise.reject(error);
            } finally {
              // Clear the shared promise after completion.
              this.refreshPromise = null;
            }
          }
        }

        // Handle transient failures with retry — only when replaying the
        // request cannot duplicate a write (see `isReplaySafe`).
        if (
          originalRequest &&
          this.shouldRetry(error) &&
          isReplaySafe(originalRequest, error)
        ) {
          const retryCount =
            (originalRequest.headers['X-Retry-Count'] as number) ?? 0;

          if (retryCount < MAX_RETRIES) {
            originalRequest.headers['X-Retry-Count'] = retryCount + 1;

            await this.delay(RETRY_DELAY_MS * (retryCount + 1));
            return this.instance.request(originalRequest);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Reports whether an error should trigger a retry.
   *
   * @param error The error to check.
   */
  private shouldRetry(error: AxiosError): boolean {
    // Network errors.
    if (!error.response) {
      return true;
    }

    // Server errors (5xx).
    if (error.response.status >= 500) {
      return true;
    }

    // Rate limiting (429).
    if (error.response.status === 429) {
      return true;
    }

    return false;
  }

  /**
   * Delays execution for the specified duration.
   *
   * @param ms Duration in milliseconds.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Performs token refresh and notifies IdentityProvider of the change.
   * This ensures both tokenService storage and IdentityProvider state stay synchronized.
   */
  private async performRefresh(): Promise<void> {
    // Import sessionService dynamically to avoid circular dependency.
    const { sessionService } = await import('@services/identity');
    await sessionService.refresh();

    // Notify IdentityProvider by dispatching a custom event.
    // IdentityProvider will listen for this event and update its state.
    window.dispatchEvent(new CustomEvent('atlas:token-refreshed'));
  }

  /**
   * Generates a unique correlation ID for request tracing.
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

export const httpClient = new HttpClient(ENV.apiBaseUrl);
