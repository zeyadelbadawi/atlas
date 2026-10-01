/**
 * Zoom Operations Center API client — Platform Owner surfaces only.
 *
 * FILTERS AND PAGES ARE SENT TO THE SERVER, never applied here. This
 * console spans every academy and every session in Atlas; narrowing in
 * the browser would mean shipping the whole table first, which is both a
 * performance problem and a disclosure one.
 *
 * `platform-zoom` is a deliberately distinct resource from the
 * tenant-scoped `academies/:id/live-sessions/*` routes, matching how
 * `platform-academies` differs from `academies`.
 */
import { BaseService, toQueryParams } from '@services';
import type { ReadOptions } from '@services';
import type {
  ZoomConnectionRow,
  ZoomConnectionsQuery,
  ZoomLiveSessionRow,
  ZoomOverview,
  ZoomSessionsQuery,
  ZoomAttendanceRow,
  ZoomRecordingRow,
  ZoomEventRow,
  ZoomEventHealth,
  ZoomHealthResponse,
  ZoomActivityRow,
  ZoomAcademyDetail,
  ZoomListQuery,
} from '../types';
import type { PaginatedResult } from '@types';

export class PlatformZoomService extends BaseService {
  protected readonly resource = 'platform-zoom';

  /** Bounded aggregates for the operations overview. */
  async getOverview(options?: ReadOptions): Promise<ZoomOverview> {
    return this.client.get<ZoomOverview>(this.path('overview'), options);
  }

  async listConnections(
    query: ZoomConnectionsQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<ZoomConnectionRow>> {
    return this.client.get<PaginatedResult<ZoomConnectionRow>>(
      this.path('connections'),
      {
        ...options,
        params: {
          ...(options?.params ?? {}),
          ...toQueryParams(query, { dropEmptyStrings: true }),
        },
      }
    );
  }

  async listSessions(
    query: ZoomSessionsQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<ZoomLiveSessionRow>> {
    return this.client.get<PaginatedResult<ZoomLiveSessionRow>>(
      this.path('live-sessions'),
      {
        ...options,
        params: {
          ...(options?.params ?? {}),
          ...toQueryParams(query, { dropEmptyStrings: true }),
        },
      }
    );
  }

  async listAttendance(
    query: ZoomListQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<ZoomAttendanceRow>> {
    return this.client.get<PaginatedResult<ZoomAttendanceRow>>(
      this.path('attendance'),
      {
        ...options,
        params: {
          ...(options?.params ?? {}),
          ...toQueryParams(query, { dropEmptyStrings: true }),
        },
      }
    );
  }

  async listRecordings(
    query: ZoomListQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<ZoomRecordingRow>> {
    return this.client.get<PaginatedResult<ZoomRecordingRow>>(
      this.path('recordings'),
      {
        ...options,
        params: {
          ...(options?.params ?? {}),
          ...toQueryParams(query, { dropEmptyStrings: true }),
        },
      }
    );
  }

  async listEvents(
    query: ZoomListQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<ZoomEventRow> & { health: ZoomEventHealth }> {
    return this.client.get<
      PaginatedResult<ZoomEventRow> & { health: ZoomEventHealth }
    >(this.path('events'), {
      ...options,
      params: {
        ...(options?.params ?? {}),
        ...toQueryParams(query, { dropEmptyStrings: true }),
      },
    });
  }

  async getHealth(options?: ReadOptions): Promise<ZoomHealthResponse> {
    return this.client.get<ZoomHealthResponse>(this.path('health'), options);
  }

  async listActivity(
    query: ZoomListQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<ZoomActivityRow>> {
    return this.client.get<PaginatedResult<ZoomActivityRow>>(
      this.path('activity'),
      {
        ...options,
        params: {
          ...(options?.params ?? {}),
          ...toQueryParams(query, { dropEmptyStrings: true }),
        },
      }
    );
  }

  async getAcademyDetail(
    academyId: string,
    options?: ReadOptions
  ): Promise<ZoomAcademyDetail> {
    return this.client.get<ZoomAcademyDetail>(
      this.path('academies', academyId),
      options
    );
  }
}

export const platformZoomService = new PlatformZoomService();
