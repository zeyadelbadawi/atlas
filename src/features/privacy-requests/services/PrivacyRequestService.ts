/**
 * B0-SEC-13 — the signed-in person's own privacy requests. No user id on
 * any route: the server acts on the account proved by the access token.
 * Works from an academy session as well as a management session.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type {
  MyPrivacyRequest,
  PrivacyRequestChallenge,
  PrivacyRequestType,
} from '../types';

export class PrivacyRequestService extends BaseService {
  protected readonly resource = 'privacy-requests';

  /** `POST /privacy-requests/code` — emails a confirmation code. Files nothing. */
  async requestCode(): Promise<PrivacyRequestChallenge> {
    return this.client.post<PrivacyRequestChallenge, Record<string, never>>(
      this.path('code'),
      {}
    );
  }

  /** `POST /privacy-requests` — files the request (or returns the open one of that type). */
  async file(input: {
    readonly type: PrivacyRequestType;
    readonly challengeId: string;
    readonly code: string;
  }): Promise<MyPrivacyRequest> {
    return this.client.post<MyPrivacyRequest, typeof input>(this.path(), input);
  }

  async listMine(options?: ReadOptions): Promise<readonly MyPrivacyRequest[]> {
    return this.client.get<readonly MyPrivacyRequest[]>(
      this.path('mine'),
      options
    );
  }

  /** The JSON copy of the caller's data, while the export window is open. */
  async downloadExport(requestId: string): Promise<unknown> {
    return this.client.get<unknown>(this.path('mine', requestId, 'export'));
  }
}

export const privacyRequestService = new PrivacyRequestService();
