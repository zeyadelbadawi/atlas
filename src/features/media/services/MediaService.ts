/**
 * Media Service (Prompt 13).
 *
 * Nested under `academies/:academyId/media`, the same
 * `resource = 'academies'` + private path-builder pattern
 * `DomainService`/`WebsiteConfigurationService` already established.
 * Every method is a real HTTP call through `BaseService`/`apiClient` —
 * there is no fake storage backend behind any of it.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import { buildPaginationMeta, toCollectionParams } from '@api';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@constants';
import type {
  CollectionQuery,
  MediaAssetDetail,
  MediaAssetSummary,
  PaginatedResult,
  UpdateMediaAssetPayload,
  UploadMediaAssetPayload,
} from '@types';

/** Envelope a backend may use for this nested collection — mirrors `BaseService`'s own tolerant reader. */
interface MediaCollectionEnvelope {
  readonly items?: readonly MediaAssetSummary[];
  readonly data?: readonly MediaAssetSummary[];
  readonly results?: readonly MediaAssetSummary[];
  readonly total?: number;
  readonly totalItems?: number;
  readonly page?: number;
  readonly pageSize?: number;
}

export class MediaService extends BaseService {
  protected readonly resource = 'academies';

  private mediaPath(academyId: string, ...segments: readonly string[]): string {
    return this.path(academyId, 'media', ...segments);
  }

  async getAssets(
    academyId: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<MediaAssetSummary>> {
    const response = await this.client.get<MediaCollectionEnvelope | readonly MediaAssetSummary[]>(
      this.mediaPath(academyId),
      { ...options, params: { ...toCollectionParams(query), ...options?.params } }
    );

    const requestedPage = query?.pagination?.page ?? DEFAULT_PAGE;
    const requestedPageSize = query?.pagination?.pageSize ?? DEFAULT_PAGE_SIZE;

    if (Array.isArray(response)) {
      const items = response as readonly MediaAssetSummary[];
      return {
        items,
        pagination: buildPaginationMeta(DEFAULT_PAGE, Math.max(items.length, 1), items.length),
      };
    }

    const envelope = response as MediaCollectionEnvelope;
    const items = envelope.items ?? envelope.data ?? envelope.results ?? [];
    const totalItems = envelope.totalItems ?? envelope.total ?? items.length;

    return {
      items,
      pagination: buildPaginationMeta(envelope.page ?? requestedPage, envelope.pageSize ?? requestedPageSize, totalItems),
    };
  }

  async getAsset(academyId: string, assetId: string, options?: ReadOptions): Promise<MediaAssetDetail> {
    return this.client.get<MediaAssetDetail>(this.mediaPath(academyId, assetId), options);
  }

  async uploadAsset(
    academyId: string,
    payload: UploadMediaAssetPayload,
    options?: WriteOptions
  ): Promise<MediaAssetDetail> {
    return this.client.post<MediaAssetDetail, UploadMediaAssetPayload>(
      this.mediaPath(academyId),
      payload,
      options
    );
  }

  async updateAsset(
    academyId: string,
    assetId: string,
    payload: UpdateMediaAssetPayload,
    options?: WriteOptions
  ): Promise<MediaAssetDetail> {
    return this.client.patch<MediaAssetDetail, UpdateMediaAssetPayload>(
      this.mediaPath(academyId, assetId),
      payload,
      options
    );
  }

  async archiveAsset(academyId: string, assetId: string, options?: WriteOptions): Promise<MediaAssetDetail> {
    return this.client.post<MediaAssetDetail, Record<string, never>>(
      this.mediaPath(academyId, assetId, 'archive'),
      {},
      options
    );
  }
}

export const mediaService = new MediaService();
