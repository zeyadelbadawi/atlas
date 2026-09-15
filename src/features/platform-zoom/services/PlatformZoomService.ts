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
import { BaseService } from '@services';
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
import type { PaginatedResponse } from '@types';

export class PlatformZoomService extends BaseService {
  protected readonly resource = 'platform-zoom';

  /** Bounded aggregates for the operations overview. */
  async getOverview(options?: ReadOptions): Promise<ZoomOverview> {
    return this.client.get<ZoomOverview>(this.path('overview'), options);
  }

  async listConnections(
    query: ZoomConnectionsQuery,
    options?: ReadOptions,
  ): Promise<PaginatedResponse<ZoomConnectionRow>> {
    return this.client.get<PaginatedResponse<ZoomConnectionRow>>(this.path('connections'), {
      ...options,
      params: { ...(options?.params ?? {}), ...stripUndefined(query) },
    });
  }

  async listSessions(
    query: ZoomSessionsQuery,
    options?: ReadOptions,
  ): Promise<PaginatedResponse<ZoomLiveSessionRow>> {
    return this.client.get<PaginatedResponse<ZoomLiveSessionRow>>(this.path('live-sessions'), {
      ...options,
      params: { ...(options?.params ?? {}), ...stripUndefined(query) },
    });
  }

  async listAttendance(
    query: ZoomListQuery,
    options?: ReadOptions,
  ): Promise<PaginatedResponse<ZoomAttendanceRow>> {
    return this.client.get<PaginatedResponse<ZoomAttendanceRow>>(this.path('attendance'), {
      ...options,
      params: { ...(options?.params ?? {}), ...stripUndefined(query) },
    });
  }

  async listRecordings(
    query: ZoomListQuery,
    options?: ReadOptions,
  ): Promise<PaginatedResponse<ZoomRecordingRow>> {
    return this.client.get<PaginatedResponse<ZoomRecordingRow>>(this.path('recordings'), {
      ...options,
      params: { ...(options?.params ?? {}), ...stripUndefined(query) },
    });
  }

  async listEvents(
    query: ZoomListQuery,
    options?: ReadOptions,
  ): Promise<PaginatedResponse<ZoomEventRow> & { health: ZoomEventHealth }> {
    return this.client.get<PaginatedResponse<ZoomEventRow> & { health: ZoomEventHealth }>(
      this.path('events'),
      { ...options, params: { ...(options?.params ?? {}), ...stripUndefined(query) } },
    );
  }

  async getHealth(options?: ReadOptions): Promise<ZoomHealthResponse> {
    return this.client.get<ZoomHealthResponse>(this.path('health'), options);
  }

  async listActivity(
    query: ZoomListQuery,
    options?: ReadOptions,
  ): Promise<PaginatedResponse<ZoomActivityRow>> {
    return this.client.get<PaginatedResponse<ZoomActivityRow>>(this.path('activity'), {
      ...options,
      params: { ...(options?.params ?? {}), ...stripUndefined(query) },
    });
  }

  async getAcademyDetail(academyId: string, options?: ReadOptions): Promise<ZoomAcademyDetail> {
    return this.client.get<ZoomAcademyDetail>(this.path('academies', academyId), options);
  }
}

/**
 * Drops absent filters rather than sending `status=undefined`, which the
 * backend's `@IsIn` validator would reject as a malformed value.
 */
function stripUndefined(query: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== ''),
  );
}

export const platformZoomService = new PlatformZoomService();
