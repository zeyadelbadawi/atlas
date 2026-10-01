/**
 * The learner dashboard's read+write surface — `learning/*` (P64 Phase 2
 * §D.8, §L).
 *
 * NO METHOD HERE TAKES AN ACADEMY ID, and none should be given one. Every
 * route is scoped by the request HOST on the server: a learner can hold
 * one account at several academies (AD-4), and the academy whose branded
 * site the browser is on is the academy whose work they see. The host is
 * the one claim in the request the caller cannot change, which is exactly
 * why the scope is taken from it — adding an `academyId` parameter here
 * would hand a client the ability to ask for another academy's dashboard
 * and make the server's refusal the only thing standing between a
 * customer and a tenancy leak.
 *
 * `resource` is `learning`, not `academies/:id/...`: this is the flat
 * learner tree, the same one `ProgressService` and `QuizService` already
 * live on, and deliberately NOT the owner/instructor authoring tree under
 * `academies/` — an enrolled student is not an organization member of the
 * academy, so every authoring path 403s them (see
 * `CourseContentService`'s own doc comment for the day that was
 * discovered in production).
 *
 * The reads and the writes are one class because they are one resource
 * from the client's side; the backend splits them across two controllers
 * so the blast radius of each is obvious there. Nothing here is a second
 * authorization decision.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  LearnerAssessmentItem,
  LearnerDevicesResponse,
  LearnerOverviewResponse,
  SessionTakeoverPayload,
  SessionTakeoverResponse,
} from '@types';

export class LearnerDashboardService extends BaseService {
  protected readonly resource = 'learning';

  /** Everything `/my` shows above the fold, in one round-trip. */
  async getOverview(options?: ReadOptions): Promise<LearnerOverviewResponse> {
    return this.client.get<LearnerOverviewResponse>(
      this.path('overview'),
      options
    );
  }

  /**
   * This learner's quizzes across every course at this academy.
   *
   * Returns a bare array, not a paginated envelope — the backend answers
   * `readonly LearnerAssessmentItem[]` and a learner's own assessment
   * list is bounded by their own enrolments. Deliberately not routed
   * through `fetchCollection`, which would wrap it in a fabricated
   * pagination meta that no caller could act on.
   */
  async getQuizzes(
    options?: ReadOptions
  ): Promise<readonly LearnerAssessmentItem[]> {
    return this.client.get<readonly LearnerAssessmentItem[]>(
      this.path('quizzes'),
      options
    );
  }

  /** This learner's assignments across every course at this academy. */
  async getAssignments(
    options?: ReadOptions
  ): Promise<readonly LearnerAssessmentItem[]> {
    return this.client.get<readonly LearnerAssessmentItem[]>(
      this.path('assignments'),
      options
    );
  }

  /**
   * Registered devices, live sessions, and the policy that bounds them.
   *
   * The policy numbers come back with the list rather than from a second
   * settings call, because the only useful thing to say on this page is
   * "3 of 2 devices" — a count with no limit beside it tells a learner
   * who has just been refused nothing at all.
   */
  async getDevices(options?: ReadOptions): Promise<LearnerDevicesResponse> {
    return this.client.get<LearnerDevicesResponse>(
      this.path('devices'),
      options
    );
  }

  /** Revokes one registered device. 204 — the caller re-reads the list. */
  async removeDevice(deviceId: string, options?: WriteOptions): Promise<void> {
    await this.client.delete<void>(this.path('devices', deviceId), options);
  }

  /**
   * Moves the single learning session to THIS device.
   *
   * The confirmation §E.4 requires happens in the browser BEFORE this is
   * called — the dialog names the other device and asks. This call is the
   * consequence of that answer, never the question: it revokes the
   * displaced session's refresh token so it cannot take the lease
   * straight back, and writes `DEVICE_SESSION_TAKEOVER` naming both
   * sides. Never call it to "just try" a grant again.
   */
  async takeoverSession(
    payload: SessionTakeoverPayload,
    options?: WriteOptions
  ): Promise<SessionTakeoverResponse> {
    return this.client.post<SessionTakeoverResponse, SessionTakeoverPayload>(
      this.path('session', 'takeover'),
      payload,
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const learnerDashboardService = new LearnerDashboardService();
