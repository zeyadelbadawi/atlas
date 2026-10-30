/**
 * B3 — site announcements for the Platform Owner
 * (`platform-site-announcements`): the marketing banner bar, the marketing
 * pop-up and the dashboard banner. Writes carry the `version` they read.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type { PaginatedResult } from '@types';
import type {
  AnnouncementListQuery,
  AnnouncementWritePayload,
  SiteAnnouncement,
} from '../types';

export class PlatformAnnouncementService extends BaseService {
  protected readonly resource = 'platform-site-announcements';

  async list(
    query: AnnouncementListQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<SiteAnnouncement>> {
    return this.fetchCollection<SiteAnnouncement>(
      {
        pagination: { page: query.page, pageSize: query.pageSize },
        ...(query.search ? { search: query.search } : {}),
        filters: {
          ...(query.surface ? { surface: query.surface } : {}),
          ...(query.status ? { status: query.status } : {}),
        },
      },
      options
    );
  }

  async get(id: string, options?: ReadOptions): Promise<SiteAnnouncement> {
    return this.fetchOne<SiteAnnouncement>(id, options);
  }

  async create(
    payload: AnnouncementWritePayload,
    options?: WriteOptions
  ): Promise<SiteAnnouncement> {
    return this.createOne<SiteAnnouncement, AnnouncementWritePayload>(
      payload,
      options
    );
  }

  async update(
    id: string,
    payload: AnnouncementWritePayload & { readonly version: number },
    options?: WriteOptions
  ): Promise<SiteAnnouncement> {
    return this.updateOne<
      SiteAnnouncement,
      AnnouncementWritePayload & { readonly version: number }
    >(id, payload, options);
  }

  async transition(
    id: string,
    action: 'activate' | 'deactivate' | 'archive',
    version: number,
    options?: WriteOptions
  ): Promise<SiteAnnouncement> {
    return this.client.post<SiteAnnouncement>(
      this.path(id, action),
      { version },
      options
    );
  }

  /** Only draft and archived announcements can be deleted. */
  async remove(id: string, options?: WriteOptions): Promise<void> {
    await this.deleteOne(id, options);
  }
}

export const platformAnnouncementService = new PlatformAnnouncementService();
