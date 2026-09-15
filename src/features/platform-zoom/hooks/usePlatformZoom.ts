/**
 * Data hooks for the Zoom Operations Center.
 *
 * Each list hook takes the full query object and passes it through to the
 * server, so the query key changes whenever a filter or page does and the
 * cache never serves one filter's results for another's.
 */
import { useApiQuery } from '@/shared/hooks';
import { platformZoomKeys } from '@services/query';
import { platformZoomService } from '../services/PlatformZoomService';
import type {
  ZoomConnectionRow,
  ZoomConnectionsQuery,
  ZoomLiveSessionRow,
  ZoomOverview,
  ZoomSessionsQuery,
} from '../types';
import type { PaginatedResponse } from '@types';
import type { ApiError } from '@api';

export function useZoomOverview() {
  return useApiQuery<ZoomOverview, ApiError>({
    queryKey: platformZoomKeys.overview(),
    queryFn: () => platformZoomService.getOverview(),
  });
}

export function useZoomConnections(query: ZoomConnectionsQuery) {
  return useApiQuery<PaginatedResponse<ZoomConnectionRow>, ApiError>({
    queryKey: platformZoomKeys.connections(query),
    queryFn: () => platformZoomService.listConnections(query),
  });
}

export function useZoomSessions(query: ZoomSessionsQuery) {
  return useApiQuery<PaginatedResponse<ZoomLiveSessionRow>, ApiError>({
    queryKey: platformZoomKeys.sessions(query),
    queryFn: () => platformZoomService.listSessions(query),
  });
}

/* ---- Part 2 hooks ---- */
import type {
  ZoomAttendanceRow,
  ZoomRecordingRow,
  ZoomEventRow,
  ZoomEventHealth,
  ZoomHealthResponse,
  ZoomAcademyDetail,
  ZoomListQuery,
} from '../types';

export function useZoomAttendance(query: ZoomListQuery) {
  return useApiQuery<PaginatedResponse<ZoomAttendanceRow>, ApiError>({
    queryKey: platformZoomKeys.attendance(query),
    queryFn: () => platformZoomService.listAttendance(query),
  });
}

export function useZoomRecordings(query: ZoomListQuery) {
  return useApiQuery<PaginatedResponse<ZoomRecordingRow>, ApiError>({
    queryKey: platformZoomKeys.recordings(query),
    queryFn: () => platformZoomService.listRecordings(query),
  });
}

export function useZoomEvents(query: ZoomListQuery) {
  return useApiQuery<PaginatedResponse<ZoomEventRow> & { health: ZoomEventHealth }, ApiError>({
    queryKey: platformZoomKeys.events(query),
    queryFn: () => platformZoomService.listEvents(query),
  });
}

export function useZoomHealth() {
  return useApiQuery<ZoomHealthResponse, ApiError>({
    queryKey: platformZoomKeys.health(),
    queryFn: () => platformZoomService.getHealth(),
  });
}

export function useZoomActivity(query: ZoomListQuery) {
  return useApiQuery<PaginatedResponse<ZoomActivityRow>, ApiError>({
    queryKey: platformZoomKeys.activity(query),
    queryFn: () => platformZoomService.listActivity(query),
  });
}

export function useZoomAcademyDetail(academyId: string | undefined) {
  return useApiQuery<ZoomAcademyDetail, ApiError>({
    queryKey: platformZoomKeys.academyDetail(academyId),
    queryFn: () => platformZoomService.getAcademyDetail(academyId!),
    enabled: Boolean(academyId),
  });
}
