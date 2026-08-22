/**
 * Academy Service.
 *
 * Manages academy CRUD operations, settings, branding, and member access.
 * Extends BaseService to maintain architectural consistency.
 */
import { BaseService } from '@services';
import type {
  Academy,
  CreateAcademyPayload,
  UpdateAcademyPayload,
  UpdateAcademyBrandingPayload,
  AcademyMember,
  AcademyStats,
  AcademyActivity,
  CollectionQuery,
  PaginatedResult,
  QueryParams,
} from '@types';
import type { ReadOptions, WriteOptions } from '@services';

export class AcademyService extends BaseService {
  protected readonly resource = 'academies';

  /**
   * Retrieves all academies for the active organization.
   */
  async getAcademies(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<Academy>> {
    return this.fetchCollection<Academy>(query, options);
  }

  /**
   * Retrieves a single academy by ID.
   */
  async getAcademy(id: string, options?: ReadOptions): Promise<Academy> {
    return this.fetchOne<Academy>(id, options);
  }

  /**
   * Creates a new academy.
   */
  async createAcademy(
    payload: CreateAcademyPayload,
    options?: WriteOptions
  ): Promise<Academy> {
    return this.createOne<Academy, CreateAcademyPayload>(payload, options);
  }

  /**
   * Updates an existing academy.
   */
  async updateAcademy(
    id: string,
    payload: UpdateAcademyPayload,
    options?: WriteOptions
  ): Promise<Academy> {
    return this.updateOne<Academy, UpdateAcademyPayload>(id, payload, options);
  }

  /**
   * Updates academy branding (logo, favicon).
   */
  async updateAcademyBranding(
    id: string,
    payload: UpdateAcademyBrandingPayload,
    options?: WriteOptions
  ): Promise<Academy> {
    return this.client.patch<Academy, UpdateAcademyBrandingPayload>(
      this.path(id, 'branding'),
      payload,
      options
    );
  }

  /**
   * Deletes an academy.
   */
  async deleteAcademy(id: string, options?: WriteOptions): Promise<void> {
    return this.deleteOne(id, options);
  }

  /**
   * Retrieves academy members (paginated).
   */
  async getAcademyMembers(
    id: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<AcademyMember>> {
    const response = await this.client.get<PaginatedResult<AcademyMember>>(
      this.path(id, 'members'),
      {
        ...options,
        params: query as QueryParams,
      }
    );
    return response;
  }

  /**
   * Retrieves academy statistics.
   */
  async getAcademyStats(
    id: string,
    options?: ReadOptions
  ): Promise<AcademyStats> {
    return this.client.get<AcademyStats>(this.path(id, 'stats'), options);
  }

  /**
   * Retrieves academy activity (paginated).
   */
  async getAcademyActivity(
    id: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<AcademyActivity>> {
    const response = await this.client.get<PaginatedResult<AcademyActivity>>(
      this.path(id, 'activity'),
      {
        ...options,
        params: query as QueryParams,
      }
    );
    return response;
  }
}

/** Singleton instance following Atlas service pattern. */
export const academyService = new AcademyService();