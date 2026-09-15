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
import { BaseService, resourcePath } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  CreateLiveSessionInput,
  LiveProviderConnectionState,
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

  /**
   * Publishes a session — the transition that creates the real meeting.
   *
   * Separate from `update` because it has an EXTERNAL side effect and can
   * fail for reasons unrelated to any field: no provider connection, an
   * expired credential, an exhausted recording allowance. Folding it into
   * a field edit would make every save a potential provider call.
   */
  async publish(
    academyId: string,
    liveSessionId: string,
    options?: WriteOptions,
  ): Promise<LiveSession> {
    return this.client.post<LiveSession, Record<string, never>>(
      this.path(academyId, 'live-sessions', liveSessionId, 'publish'),
      {},
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

  /** Provider connection health. NEVER returns credentials. */
  async getConnection(
    academyId: string,
    options?: ReadOptions,
  ): Promise<LiveProviderConnectionState> {
    return this.client.get<LiveProviderConnectionState>(
      this.path(academyId, 'live-sessions', 'connection'),
      options,
    );
  }

  /**
   * Starts a Zoom authorization and returns where to send the owner.
   *
   * Returns a URL rather than following a redirect: this is an
   * authenticated XHR, and a 302 on a fetch is consumed by the fetch
   * layer instead of navigating the user's window. The caller performs
   * the navigation.
   *
   * NOTHING IS TYPED BY THE CUSTOMER ANY MORE. Atlas owns the Zoom
   * application; the customer authorizes it and Atlas stores only that
   * authorization. There is no client secret in this flow at all.
   */
  async startAuthorization(
    academyId: string,
    options?: WriteOptions,
  ): Promise<{ authorizationUrl: string; expiresAt: string }> {
    return this.client.post<
      { authorizationUrl: string; expiresAt: string },
      Record<string, never>
    >(this.path(academyId, 'live-sessions', 'connection', 'authorize'), {}, options);
  }

  /**
   * Hands Zoom's answer back to Atlas, from the page the customer landed on.
   *
   * NOT ACADEMY-SCOPED, and that is the point: the academy being connected
   * is read from the state row Atlas wrote when the flow began, never from
   * anything that travelled through the browser. `resourcePath` is used
   * directly rather than `this.path`, which would prefix `academies/`.
   *
   * WHY THE PAGE FORWARDS THIS AT ALL. Zoom returns the customer as a
   * top-level navigation, which carries no `Authorization` header — an API
   * endpoint receiving that redirect directly could not tell who was
   * calling, and would simply answer 401. Landing on an Atlas page instead
   * means the request below goes out inside the customer's existing
   * session, which is what lets the backend bind the authorization to the
   * owner who started it.
   */
  async completeAuthorization(
    payload: { code: string; state: string },
    options?: WriteOptions,
  ): Promise<{ status: string }> {
    return this.client.post<{ status: string }, { code: string; state: string }>(
      resourcePath('live-sessions', 'oauth', 'callback'),
      payload,
      options,
    );
  }

  /** Re-checks the stored credentials against Zoom. */
  async checkConnection(
    academyId: string,
    options?: WriteOptions,
  ): Promise<{ healthy: boolean }> {
    return this.client.post<{ healthy: boolean }, Record<string, never>>(
      this.path(academyId, 'live-sessions', 'connection', 'check'),
      {},
      options,
    );
  }

  async disconnect(
    academyId: string,
    options?: WriteOptions,
  ): Promise<{ status: string }> {
    return this.client.delete<{ status: string }>(
      this.path(academyId, 'live-sessions', 'connection'),
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
