/**
 * Platform Contact Service — the Atlas marketing homepage's contact form.
 *
 * `POST public/contact` (`PublicPlatformContactController`), sent with no
 * session: a marketing visitor has none. The backend answers EVERY
 * accepted submission with the same `{ received: true }` — stored,
 * deduplicated or discarded as automated alike — so the UI has exactly
 * one success state and must never infer anything from the response.
 *
 * Distinct from `publicWebsiteService.submitContactMessage`, which is an
 * ACADEMY website's contact form and lands in that academy's inbox. This
 * one lands in the Platform Owner's inbox.
 */
import { BaseService } from '@services';
import type { WriteOptions } from '@services';

export type PlatformContactTopic =
  'sales' | 'support' | 'partnership' | 'other';

export interface PlatformContactPayload {
  readonly name: string;
  readonly email: string;
  readonly organizationName?: string;
  readonly topic: PlatformContactTopic;
  readonly message: string;
  readonly locale: 'en' | 'ar';
  /** The marketing path the form was sent from — a path, never a URL. */
  readonly sourcePath?: string;
  /** Honeypot — sent only when filled, i.e. by a bot. */
  readonly company?: string;
  /** Epoch ms when the form was first shown (minimum fill-time check). */
  readonly startedAt: number;
}

export interface PlatformContactReceipt {
  readonly received: true;
}

export class PlatformContactService extends BaseService {
  // One segment per `path()` argument — `resourcePath` encodes each, so a
  // resource containing its own `/` would be percent-encoded (see
  // `PublicPlanService`'s identical note).
  protected readonly resource = 'public';

  async submit(
    payload: PlatformContactPayload,
    options?: WriteOptions
  ): Promise<PlatformContactReceipt> {
    return this.client.post<PlatformContactReceipt, PlatformContactPayload>(
      this.path('contact'),
      payload,
      options
    );
  }
}

export const platformContactService = new PlatformContactService();
