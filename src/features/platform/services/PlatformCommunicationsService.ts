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
    // Segments, NOT a pre-encoded string. `resourcePath` runs
    // `encodeURIComponent` over every segment it is given, so passing
    // `suppressions/${encodeURIComponent(email)}` as one segment encoded
    // it twice AND encoded the separating slash — the request went to
    // `suppressions%2Fa%2540b.com` and 404'd. The button never worked.
    return this.client.delete<{ lifted: boolean }>(
      this.path('suppressions', email)
    );
  }
}

export const platformCommunicationsService = new PlatformCommunicationsService();
