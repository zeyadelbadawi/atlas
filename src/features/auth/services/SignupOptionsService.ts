/**
 * Signup Options Service.
 *
 * New Customer Onboarding — `GET /public/signup-options`, the one read the
 * management sign-up page makes before deciding what to show: whether
 * sign-up also creates an organization (the backend flag
 * `FLAG_SIGNUP_ORGANIZATION_MODE`), whether trials are on, and which
 * plans may be trialled. Unauthenticated, like `PublicPlanService`.
 *
 * DISPLAY ONLY. `POST /auth/register` re-checks every one of these rules
 * before any write, so a stale answer here costs the visitor one inline
 * error and a refetch — never an account in the wrong state.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type { SignupOptionsResponse } from '@types';

export class SignupOptionsService extends BaseService {
  // One segment only — see `PublicPlanService` for why `resource` must
  // never contain a `/` (it is percent-encoded as a single segment).
  protected readonly resource = 'public';

  /** What the management sign-up page may offer right now. */
  async getSignupOptions(
    options?: ReadOptions
  ): Promise<SignupOptionsResponse> {
    return this.client.get<SignupOptionsResponse>(
      this.path('signup-options'),
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const signupOptionsService = new SignupOptionsService();
