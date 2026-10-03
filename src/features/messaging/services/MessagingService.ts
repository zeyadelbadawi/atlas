/**
 * W3-compose — clients for the campaign API.
 *
 *   academy  `academies/:id/messages` (+ `/preview`, `/quota`)
 *   platform `platform-communications/campaigns` (+ `/preview`)
 *
 * Authorization is the server's: an ACTIVE owner/administrator academy
 * membership, or the Platform Owner. Hiding a control here is UX only.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type {
  CampaignAccepted,
  CampaignPage,
  CampaignPreview,
  CampaignPreviewRequest,
  CampaignQuota,
  CampaignSendRequest,
} from '../messaging.types';

export class AcademyMessagesService extends BaseService {
  protected readonly resource = 'academies';

  quota(academyId: string, options?: ReadOptions): Promise<CampaignQuota> {
    return this.client.get<CampaignQuota>(
      this.path(academyId, 'messages', 'quota'),
      options
    );
  }

  preview(
    academyId: string,
    payload: CampaignPreviewRequest
  ): Promise<CampaignPreview> {
    return this.client.post<CampaignPreview, CampaignPreviewRequest>(
      this.path(academyId, 'messages', 'preview'),
      payload
    );
  }

  send(academyId: string, payload: CampaignSendRequest): Promise<CampaignAccepted> {
    return this.client.post<CampaignAccepted, CampaignSendRequest>(
      this.path(academyId, 'messages'),
      payload
    );
  }

  history(
    academyId: string,
    params: { readonly cursor?: string; readonly limit?: number },
    options?: ReadOptions
  ): Promise<CampaignPage> {
    return this.client.get<CampaignPage>(this.path(academyId, 'messages'), {
      ...options,
      params: compact(params),
    });
  }
}

export class PlatformCampaignsService extends BaseService {
  protected readonly resource = 'platform-communications';

  preview(payload: CampaignPreviewRequest): Promise<CampaignPreview> {
    return this.client.post<CampaignPreview, CampaignPreviewRequest>(
      this.path('campaigns', 'preview'),
      payload
    );
  }

  send(payload: CampaignSendRequest): Promise<CampaignAccepted> {
    return this.client.post<CampaignAccepted, CampaignSendRequest>(
      this.path('campaigns'),
      payload
    );
  }

  history(
    params: { readonly cursor?: string; readonly limit?: number },
    options?: ReadOptions
  ): Promise<CampaignPage> {
    return this.client.get<CampaignPage>(this.path('campaigns'), {
      ...options,
      params: compact(params),
    });
  }
}

function compact(params: object): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== '')
  ) as Record<string, string | number>;
}

export const academyMessagesService = new AcademyMessagesService();
export const platformCampaignsService = new PlatformCampaignsService();
