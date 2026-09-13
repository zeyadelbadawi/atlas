/**
 * Live Sessions API client.
 *
 * Academy-scoped, mounted under the same `academies/:id/...` tree every
 * other academy resource uses, so it inherits the existing tenant path
 * conventions rather than inventing a parallel one.
 *
 * NOTHING HERE IS A SECURITY BOUNDARY. Every call is independently
 * authorized server-side by the academy guard, the managing-role check,
 * the add-on entitlement gate and RLS. This client exists so the UI can
 * ask honest questions, not to decide answers.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  CreateLiveSessionInput,
  LiveSession,
  LiveSessionsStatus,
  ParticipantAttendance,
  UpdateLiveSessionInput,
} from '@types';

export class LiveSessionService extends BaseService {
  protected readonly resource = 'academies';

  /**
   * The add-on's four dependency states for this academy.
   *
   * Read before rendering any Live Sessions surface, so an uninstalled,
   * disabled, unentitled or disconnected state explains itself rather
   * than producing a bare 403.
   */
  async getStatus(academyId: string, options?: ReadOptions): Promise<LiveSessionsStatus> {
    return this.client.get<LiveSessionsStatus>(
      this.path(academyId, 'live-sessions', 'status'),
      options,
    );
  }

  /** Every Live Session in one course — the curriculum read. */
  async listForCourse(
    academyId: string,
    courseId: string,
    options?: ReadOptions,
  ): Promise<readonly LiveSession[]> {
    return this.client.get<readonly LiveSession[]>(
      this.path(academyId, 'courses', courseId, 'live-sessions'),
      options,
    );
  }

  async create(
    academyId: string,
    courseId: string,
    input: CreateLiveSessionInput,
    options?: WriteOptions,
  ): Promise<LiveSession> {
    return this.client.post<LiveSession, CreateLiveSessionInput>(
      this.path(academyId, 'courses', courseId, 'live-sessions'),
      input,
      options,
    );
  }

  async update(
    academyId: string,
    liveSessionId: string,
    input: UpdateLiveSessionInput,
    options?: WriteOptions,
  ): Promise<LiveSession> {
    return this.client.patch<LiveSession, UpdateLiveSessionInput>(
      this.path(academyId, 'live-sessions', liveSessionId),
      input,
      options,
    );
  }

  /** Curriculum reordering — moving an activity within or between units. */
  async reorder(
    academyId: string,
    liveSessionId: string,
    input: { readonly order: number; readonly sectionId?: string },
    options?: WriteOptions,
  ): Promise<LiveSession> {
    return this.client.patch<LiveSession, typeof input>(
      this.path(academyId, 'live-sessions', liveSessionId, 'order'),
      input,
      options,
    );
  }

  /** Session attendance, for managers and instructors only. */
  async getAttendance(
    academyId: string,
    liveSessionId: string,
    options?: ReadOptions,
  ): Promise<readonly ParticipantAttendance[]> {
    return this.client.get<readonly ParticipantAttendance[]>(
      this.path(academyId, 'live-sessions', liveSessionId, 'attendance'),
      options,
    );
  }
}

export const liveSessionService = new LiveSessionService();
