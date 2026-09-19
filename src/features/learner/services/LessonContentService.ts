/**
 * The player's server surface — `learning/courses/:id/...` (P64 Phase 2
 * §D.2/§D.3/§D.6, §L).
 *
 * MOUNTED UNDER `learning/`, NOT `courses/`, and the distinction is load
 * bearing. The pre-P64 `courses/:id/*` routes answer an authenticated
 * caller with whatever that course will give them. These endpoints are
 * the LEARNER surface: they answer with signed, short-lived credentials,
 * they take a device lease, and they are scoped by the request host. Two
 * different things with two different prefixes, so a future guard cannot
 * be attached to the wrong one by accident.
 *
 * `getGrant` IS CALLABLE WITHOUT A SESSION, on purpose. A preview lesson
 * must open for a prospective student who has no account yet (§V), so the
 * server resolves identity inside the policy decision point rather than
 * refusing at the guard. Everything else here requires one.
 *
 * WHAT THIS SERVICE DOES NOT DO: cache. The grant response is served
 * `Cache-Control: private, no-store` and carries credentials that die in
 * as little as ten minutes; holding one anywhere it could outlive its own
 * URLs is the mistake the header exists to prevent. `useLessonGrant` owns
 * the refresh clock, and it re-asks rather than reuses.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  CourseProgress,
  CourseSequenceResponse,
  LessonContentGrant,
  PlaybackHeartbeatPayload,
  PlaybackHeartbeatResponse,
  ReleaseLeasePayload,
} from '@types';

export class LessonContentService extends BaseService {
  protected readonly resource = 'learning';

  /** Builds a path inside one course's learner tree. */
  private coursePath(
    courseId: string,
    ...segments: readonly string[]
  ): string {
    return this.path('courses', courseId, ...segments);
  }

  /**
   * The unified, ordered curriculum: what exists, in what order, in what
   * state, and — when locked — why.
   *
   * Carries no content of any kind. A locked item is listed precisely so
   * the learner can see that it exists and read the reason, which is the
   * single most common learner support ticket when it is missing.
   */
  async getSequence(
    courseId: string,
    options?: ReadOptions
  ): Promise<CourseSequenceResponse> {
    return this.client.get<CourseSequenceResponse>(
      this.coursePath(courseId, 'sequence'),
      options
    );
  }

  /**
   * THE GRANT: one policy decision, one short-lived answer.
   *
   * Every refusal this can produce is deliberate on the server side, and
   * most of them are a 404 — a 403 for "not enrolled" versus a 404 for
   * "no such lesson" would let an anonymous crawler map every lesson id
   * in a paid catalogue. The exceptions are the states a learner can act
   * on (device cap, rate limit, access ended, scheduled, suspended) and
   * the 409 session conflict, which carries the other device's label.
   */
  async getGrant(
    courseId: string,
    lessonId: string,
    options?: ReadOptions
  ): Promise<LessonContentGrant> {
    return this.client.get<LessonContentGrant>(
      this.coursePath(courseId, 'lessons', lessonId, 'content'),
      options
    );
  }

  /**
   * One playback heartbeat: where the learner is, and whether this
   * browser still holds the lease.
   *
   * `positionSeconds` is the only number the client is allowed to report
   * and it is used for RESUME, never as evidence of watching — the server
   * derives watched time from the deltas it observes, because a
   * client-reported watched figure would make the completion rule
   * decorative.
   */
  async recordHeartbeat(
    courseId: string,
    payload: PlaybackHeartbeatPayload,
    options?: WriteOptions
  ): Promise<PlaybackHeartbeatResponse> {
    return this.client.post<
      PlaybackHeartbeatResponse,
      PlaybackHeartbeatPayload
    >(this.coursePath(courseId, 'playback'), payload, options);
  }

  /**
   * Hands the lease back when the learner deliberately leaves the player.
   *
   * Best-effort and never required: the lease expires on its own after 60
   * seconds, which is what makes a crashed browser recoverable. This only
   * makes the handover immediate when the tab was closed properly, so a
   * learner moving from laptop to phone is not told to wait a minute.
   */
  async releaseLease(
    courseId: string,
    payload: ReleaseLeasePayload,
    options?: WriteOptions
  ): Promise<void> {
    await this.client.post<void, ReleaseLeasePayload>(
      this.coursePath(courseId, 'playback', 'release'),
      payload,
      options
    );
  }

  /**
   * Undoes a lesson completion (§E.3's "undo").
   *
   * A real reversal, not a UI affordance: the server recomputes course
   * progress and answers with it, so the sidebar, the progress bar and
   * the next-activity pointer all move back together.
   */
  async undoCompleteLesson(
    courseId: string,
    lessonId: string,
    options?: WriteOptions
  ): Promise<CourseProgress> {
    return this.client.delete<CourseProgress>(
      this.coursePath(courseId, 'progress', 'complete-lesson', lessonId),
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const lessonContentService = new LessonContentService();
