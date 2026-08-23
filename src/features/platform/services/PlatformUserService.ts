/**
 * Platform User Service (Prompt 13).
 *
 * The Platform Owner's cross-tenant, read-only user directory. Uses the
 * deliberately distinct resource `platform-users`, never the bare `users`
 * path a future self-profile endpoint might own, for the same
 * disambiguation reason `PlatformAcademyService` documents. No user
 * mutation exists here — the spec explicitly cautions against inventing
 * user-management mutations (see `platform-user.types.ts`'s doc comment).
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type {
  CollectionQuery,
  PaginatedResult,
  PlatformUserDetail,
  PlatformUserSummary,
} from '@types';

export class PlatformUserService extends BaseService {
  protected readonly resource = 'platform-users';

  /** Retrieves users across every organization. */
  async getUsers(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<PlatformUserSummary>> {
    return this.fetchCollection<PlatformUserSummary>(query, options);
  }

  /** Retrieves one user's cross-tenant detail view. */
  async getUser(userId: string, options?: ReadOptions): Promise<PlatformUserDetail> {
    return this.fetchOne<PlatformUserDetail>(userId, options);
  }
}

/** Singleton instance following the Atlas service pattern. */
export const platformUserService = new PlatformUserService();
