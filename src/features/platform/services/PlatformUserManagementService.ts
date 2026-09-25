/**
 * Platform User Management Service — the Platform Owner's administrative
 * actions ON a user.
 *
 * Deliberately separate from `PlatformUserService`, which is the read-only
 * directory and documents that user-management mutations should not be
 * invented on it. Rather than quietly contradict that note, the mutating
 * capability sits on its own resource, `platform-user-management`, mirroring
 * the backend controller of the same name. (The read-only constraint was
 * reversed by the owner on 25 Sep 2026; the reversal is recorded, not
 * implied.)
 *
 * Flat hyphenated resource, never a slashed one: `resourcePath` runs
 * `encodeURIComponent` over every segment, so `platform/user-management`
 * would be requested as `platform%2Fuser-management` and 404. That was a
 * real production bug (fixed in `94a65fe`) and the convention exists to
 * stop it recurring.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type { DeleteUserResult, DeletionPlan } from '@types';

export interface DeleteUserPayload {
  /** Closed vocabulary, validated server-side. */
  readonly reason?: string;
  /** Optional free text. Never required. */
  readonly feedback?: string;
}

export class PlatformUserManagementService extends BaseService {
  protected readonly resource = 'platform-user-management';

  /**
   * What deleting this user would destroy, keep and revoke.
   *
   * Read-only, and never treated as a permission: the server re-derives
   * its own scope when the deletion runs, so a plan fetched minutes ago
   * cannot authorise anything.
   */
  async getDeletionPlan(
    userId: string,
    options?: ReadOptions
  ): Promise<DeletionPlan> {
    return this.client.get<DeletionPlan>(
      this.path(userId, 'deletion-plan'),
      options
    );
  }

  /**
   * Deletes the user, with the same semantics as if they had deleted
   * themselves.
   *
   * `POST`, not `DELETE`, because the request carries a body and
   * DELETE-with-a-body is inconsistently supported by proxies and HTTP
   * clients — the same reasoning self-deletion already settled.
   */
  async deleteUser(
    userId: string,
    payload: DeleteUserPayload,
    options?: WriteOptions
  ): Promise<DeleteUserResult> {
    return this.client.post<DeleteUserResult, DeleteUserPayload>(
      this.path(userId, 'delete'),
      payload,
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const platformUserManagementService = new PlatformUserManagementService();
