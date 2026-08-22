/**
 * HTTP client.
 *
 * The transport layer. Wraps axios and provides infrastructure-managed headers,
 * error normalization, retries and cancellation. Every API request goes through
 * this client; features never call axios directly.
 */
import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { ENV } from '@config';
import { tokenService } from '@services/identity';
import type { ApiRequest, ApiResponse } from '@types';
import { normalizeApiError, ApiError } from './api-error';

/** Default timeout for API requests, in milliseconds. */
const DEFAULT_TIMEOUT_MS = 30_000;

/** Maximum number of retry attempts for transient failures. */
const MAX_RETRIES = 3;

/** Delay between retries, in milliseconds. */
const RETRY_DELAY_MS = 1_000;

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
      });

      return {
        data: response.data,
        status: response.status,
        requestId: response.headers['x-request-id'],
      };
    } catch (error) {
      throw normalizeApiError(error);
    }
  }

  /**
   * Sets up request and response interceptors.
   */
  private setupInterceptors(): void {
    // Request interceptor: attach authentication and infrastructure headers.
    this.instance.interceptors.request.use(
      (config) => {
        // Attach access token if available.
        const tokens = tokenService.retrieve();
        if (tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }

        // Attach correlation ID for request tracing.
        config.headers['X-Correlation-ID'] = this.generateCorrelationId();

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
        const originalRequest = error.config;

        // Handle 401 Unauthorized: token may have expired.
        if (error.response?.status === 401 && originalRequest) {
          const tokens = tokenService.retrieve();

          // If we have a refresh token, attempt refresh.
          if (tokens?.refreshToken && !originalRequest.headers['X-Retry-After-Refresh']) {
            try {
              // Use shared refresh promise to deduplicate concurrent refresh requests.
              if (!this.refreshPromise) {
                this.refreshPromise = this.performRefresh(tokens.refreshToken);
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

        // Handle transient failures with retry.
        if (this.shouldRetry(error) && originalRequest) {
          const retryCount = (originalRequest.headers['X-Retry-Count'] as number) ?? 0;

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
  private async performRefresh(refreshToken: string): Promise<void> {
    // Import sessionService dynamically to avoid circular dependency.
    const { sessionService } = await import('@services/identity');
    await sessionService.refresh(refreshToken);

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