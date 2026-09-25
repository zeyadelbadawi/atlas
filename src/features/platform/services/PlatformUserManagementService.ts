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

/** What actually goes on the wire — `confirm` is added by the service. */
interface DeleteUserRequestBody extends DeleteUserPayload {
  readonly confirm: true;
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
   *
   * `confirm: true` IS SET HERE, NOT BY THE CALLER. `DeleteAccountDto`
   * declares it `@IsBoolean() @Equals(true)` — deliberately, so that
   * "the operator explicitly confirmed" lives in the contract rather than
   * being trusted from the UI. Omitting it fails `ValidationPipe` with a
   * 400 before the service is ever reached, which is exactly what happened
   * in production on 26 Sep 2026: the dialog sent `{}`, every deletion
   * answered "some information needs to be corrected", and the backend was
   * right to refuse. Setting it in the one place that builds the request
   * means no caller can forget it again.
   *
   * This is not a weakening of the check. The real confirmation is the
   * operator typing the target's email, enforced in the dialog; this field
   * is the wire-level assertion that a confirmation happened at all.
   */
  async deleteUser(
    userId: string,
    payload: DeleteUserPayload,
    options?: WriteOptions
  ): Promise<DeleteUserResult> {
    return this.client.post<DeleteUserResult, DeleteUserRequestBody>(
      this.path(userId, 'delete'),
      { ...payload, confirm: true },
      options
    );
  }
}

/** Singleton instance following the Atlas service pattern. */
export const platformUserManagementService = new PlatformUserManagementService();
