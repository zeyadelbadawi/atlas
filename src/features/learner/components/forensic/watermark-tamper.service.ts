/**
 * `POST /learning/watermarks/tamper` — the player's watchdog saw the
 * forensic watermark removed or hidden (backend `docs/FORENSIC_WATERMARK.md`).
 *
 * Best-effort: always answered 204, counted server-side only on the
 * caller's own code and at most once per 30 seconds, so the answer says
 * nothing about whether a code exists. The caller swallows failures.
 */
import { BaseService } from '@services';
import type { WriteOptions } from '@services';

class WatermarkTamperService extends BaseService {
  protected readonly resource = 'learning';

  async report(code: string, options?: WriteOptions): Promise<void> {
    await this.client.post<void, { readonly code: string }>(
      this.path('watermarks', 'tamper'),
      { code },
      options
    );
  }
}

export const watermarkTamperService = new WatermarkTamperService();
