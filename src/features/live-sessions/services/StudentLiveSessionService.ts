/**
 * The STUDENT's Live Sessions client.
 *
 * Deliberately separate from `LiveSessionService`, which is academy
 * management and lives under `academies/:id/...`. A student is not an
 * academy member — their authority comes from an ENROLLMENT — so they
 * reach a different route tree entirely, guarded by a different rule.
 * Sharing one client would have invited sharing one set of assumptions.
 *
 * THE JOIN IS TWO CALLS, NOT ONE, and that is the point. `join` mints a
 * single-use grant; `redeem` spends it for a short-lived provider
 * signature. Nothing here ever receives a Zoom URL or a credential, and
 * the grant is useless once redeemed or expired — so a captured response
 * is not a durable key to the room.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  LiveSessionEligibility,
  LiveSessionJoinAuthorization,
  LiveSessionJoinRefused,
  StudentLiveSession,
} from '@types';

export class StudentLiveSessionService extends BaseService {
  protected readonly resource = 'live-sessions';

  /**
   * The published Live Sessions of a course this student is enrolled in.
   *
   * Returns an empty list — never a 403 — for a course the student is not
   * enrolled in, so this endpoint cannot be used to discover whether
   * another academy's course exists.
   */
  async listForCourse(
    courseId: string,
    options?: ReadOptions,
  ): Promise<readonly StudentLiveSession[]> {
    return this.client.get<readonly StudentLiveSession[]>(
      this.path('courses', courseId),
      options,
    );
  }

  /**
   * Whether this student may join right now, and if not, WHY.
   *
   * Display only. Every condition is re-checked server-side when a grant
   * is actually minted — this answer is never treated as authorization.
   */
  async getEligibility(
    liveSessionId: string,
    options?: ReadOptions,
  ): Promise<LiveSessionEligibility> {
    return this.client.get<LiveSessionEligibility>(
      this.path(liveSessionId, 'eligibility'),
      options,
    );
  }

  /** Mints a single-use join grant. Every eligibility rule is enforced here. */
  async join(
    liveSessionId: string,
    options?: WriteOptions,
  ): Promise<{ token: string; expiresAt: string }> {
    return this.client.post<{ token: string; expiresAt: string }, Record<string, never>>(
      this.path(liveSessionId, 'join'),
      {},
      options,
    );
  }

  /**
   * Spends the grant for what the embedded SDK needs.
   *
   * The token is consumed exactly once: a replay, or a token forwarded to
   * a classmate, matches nothing and is refused.
   */
  async redeem(
    liveSessionId: string,
    token: string,
    options?: WriteOptions,
  ): Promise<LiveSessionJoinAuthorization | LiveSessionJoinRefused> {
    return this.client.post<
      LiveSessionJoinAuthorization | LiveSessionJoinRefused,
      { token: string }
    >(this.path(liveSessionId, 'join', 'redeem'), { token }, options);
  }
}

export const studentLiveSessionService = new StudentLiveSessionService();
