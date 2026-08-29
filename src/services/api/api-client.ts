/**
 * API client.
 *
 * The single entry point services use to reach the transport layer. It exposes
 * intent-shaped methods (`get`, `post`, …) and unwraps the transport envelope so
 * services deal with domain data only.
 *
 * Nothing above this layer may import the HTTP client directly.
 */
import { httpClient } from './http-client';
import type { HttpClient } from './http-client';
import type { ApiRequest, QueryParams } from '@types';

/** Options accepted by read operations. */
export interface ReadOptions {
  readonly params?: QueryParams;
  readonly headers?: Record<string, string>;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  /** See `ApiRequest['responseType']`. */
  readonly responseType?: 'json' | 'blob';
}

/** Options accepted by write operations. */
export type WriteOptions = ReadOptions;

export class ApiClient {
  constructor(private readonly transport: HttpClient) {}

  /** Retrieves a resource. */
  public async get<TData>(path: string, options?: ReadOptions): Promise<TData> {
    return this.send<TData>({ method: 'GET', path, ...options });
  }

  /** Creates a resource. */
  public async post<TData, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: WriteOptions
  ): Promise<TData> {
    return this.send<TData, TBody>({ method: 'POST', path, body, ...options });
  }

  /** Replaces a resource. */
  public async put<TData, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: WriteOptions
  ): Promise<TData> {
    return this.send<TData, TBody>({ method: 'PUT', path, body, ...options });
  }

  /** Partially updates a resource. */
  public async patch<TData, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: WriteOptions
  ): Promise<TData> {
    return this.send<TData, TBody>({ method: 'PATCH', path, body, ...options });
  }

  /** Deletes a resource. */
  public async delete<TData = void>(
    path: string,
    options?: WriteOptions
  ): Promise<TData> {
    return this.send<TData>({ method: 'DELETE', path, ...options });
  }

  /**
   * Uploads files as multipart form data.
   * The transport omits `Content-Type` so the browser sets the boundary.
   */
  public async upload<TData>(
    path: string,
    formData: FormData,
    options?: WriteOptions
  ): Promise<TData> {
    return this.send<TData, FormData>({
      method: 'POST',
      path,
      body: formData,
      ...options,
    });
  }

  /**
   * Exposes the transport for infrastructure concerns only, such as attaching
   * authentication headers. Services must never call this.
   */
  public get transportLayer(): HttpClient {
    return this.transport;
  }

  private async send<TData, TBody = unknown>(
    request: ApiRequest<TBody>
  ): Promise<TData> {
    const response = await this.transport.request<TData, TBody>(request);
    return response.data;
  }
}

/** The API client instance shared by every Atlas service. */
export const apiClient = new ApiClient(httpClient);