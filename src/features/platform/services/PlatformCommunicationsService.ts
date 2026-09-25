/**
 * Platform Communications Service (P64 Communications C7).
 *
 * The Platform Owner's operational view of the email pipeline, plus the
 * suppression list. `platform-communications` is guarded server-side by
 * `PlatformOwnerGuard` AND by RLS under the caller's own context — the
 * route guard in this app is convenience, never the control.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type {
  CommunicationSuppressionPage,
  PlatformCommunicationsHealth,
} from '@types';

export class PlatformCommunicationsService extends BaseService {
  protected readonly resource = 'platform-communications';

  async getHealth(
    days: number,
    options?: ReadOptions
  ): Promise<PlatformCommunicationsHealth> {
    return this.client.get<PlatformCommunicationsHealth>(this.path('health'), {
      ...options,
      params: { days },
    });
  }

  async listSuppressions(
    params: { readonly limit?: number; readonly cursor?: string } = {},
    options?: ReadOptions
  ): Promise<CommunicationSuppressionPage> {
    return this.client.get<CommunicationSuppressionPage>(
      this.path('suppressions'),
      { ...options, params }
    );
  }

  /**
   * Lifts a block so the address can be mailed again. The address is
   * encoded into the path because the server hashes it to find the row —
   * it is never stored or returned in plain text.
   */
  async unsuppress(email: string): Promise<{ lifted: boolean }> {
    return this.client.delete<{ lifted: boolean }>(
      this.path(`suppressions/${encodeURIComponent(email)}`)
    );
  }
}

export const platformCommunicationsService = new PlatformCommunicationsService();
