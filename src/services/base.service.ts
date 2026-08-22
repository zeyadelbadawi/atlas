/**
 * Base service.
 *
 * Every Atlas service extends this class, which guarantees a uniform contract
 * for resource access: the same parameter names, the same pagination shape and
 * the same normalized errors across every module of the platform.
 *
 * Business rules never live here. Subclasses add operations that express intent
 * (`publish`, `archive`, `enroll`) and keep their backend details private.
 */
import { apiClient } from './api/api-client';
import type { ApiClient, ReadOptions, WriteOptions } from './api/api-client';
import {
  buildPaginationMeta,
  resourcePath,
  toCollectionParams,
} from './api/request.utils';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@constants';
import type { CollectionQuery, PaginatedResult } from '@types';

/**
 * Envelope a backend may use for a collection. Field names are unknown at this
 * stage, so the reader below accepts several conventional shapes and never
 * assumes one specific backend.
 */
interface CollectionEnvelope<TItem> {
  readonly items?: readonly TItem[];
  readonly data?: readonly TItem[];
  readonly results?: readonly TItem[];
  readonly total?: number;
  readonly totalItems?: number;
  readonly page?: number;
  readonly pageSize?: number;
}

export abstract class BaseService {
  /** Resource path segment owned by the concrete service. */
  protected abstract readonly resource: string;

  constructor(protected readonly client: ApiClient = apiClient) {}

  /** Builds a path within this service's resource. */
  protected path(...segments: readonly string[]): string {
    return resourcePath(this.resource, ...segments);
  }

  /** Retrieves a page of entities. */
  protected async fetchCollection<TItem>(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<TItem>> {
    const response = await this.client.get<
      CollectionEnvelope<TItem> | readonly TItem[]
    >(this.path(), {
      ...options,
      params: { ...toCollectionParams(query), ...options?.params },
    });

    return this.normalizeCollection(response, query);
  }

  /** Retrieves a single entity by id. */
  protected async fetchOne<TItem>(
    id: string,
    options?: ReadOptions
  ): Promise<TItem> {
    return this.client.get<TItem>(this.path(id), options);
  }

  /** Creates an entity. */
  protected async createOne<TItem, TPayload>(
    payload: TPayload,
    options?: WriteOptions
  ): Promise<TItem> {
    return this.client.post<TItem, TPayload>(this.path(), payload, options);
  }

  /** Applies a partial update to an entity. */
  protected async updateOne<TItem, TPayload>(
    id: string,
    payload: TPayload,
    options?: WriteOptions
  ): Promise<TItem> {
    return this.client.patch<TItem, TPayload>(this.path(id), payload, options);
  }

  /** Replaces an entity. */
  protected async replaceOne<TItem, TPayload>(
    id: string,
    payload: TPayload,
    options?: WriteOptions
  ): Promise<TItem> {
    return this.client.put<TItem, TPayload>(this.path(id), payload, options);
  }

  /** Deletes an entity. */
  protected async deleteOne(id: string, options?: WriteOptions): Promise<void> {
    await this.client.delete<void>(this.path(id), options);
  }

  /**
   * Normalizes a collection response into the Atlas paginated shape.
   *
   * A bare array is treated as a single complete page, which keeps consumers
   * working even when a backend does not paginate a small collection.
   */
  private normalizeCollection<TItem>(
    response: CollectionEnvelope<TItem> | readonly TItem[],
    query?: CollectionQuery
  ): PaginatedResult<TItem> {
    const requestedPage = query?.pagination?.page ?? DEFAULT_PAGE;
    const requestedPageSize = query?.pagination?.pageSize ?? DEFAULT_PAGE_SIZE;

    if (Array.isArray(response)) {
      const items = response as readonly TItem[];
      return {
        items,
        pagination: buildPaginationMeta(
          DEFAULT_PAGE,
          Math.max(items.length, 1),
          items.length
        ),
      };
    }

    const envelope = response as CollectionEnvelope<TItem>;
    const items = envelope.items ?? envelope.data ?? envelope.results ?? [];
    const totalItems = envelope.totalItems ?? envelope.total ?? items.length;

    return {
      items,
      pagination: buildPaginationMeta(
        envelope.page ?? requestedPage,
        envelope.pageSize ?? requestedPageSize,
        totalItems
      ),
    };
  }
}