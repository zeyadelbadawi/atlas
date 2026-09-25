/**
 * Academy Protection Service (P64 Phase 2).
 *
 * `GET/PATCH academies/:id/content-protection`, `…/video-tier` and
 * `…/device-policy`. All six are Client Owner only — reading as well as
 * changing (`assertCanManageSecurityPolicy` in the backend's
 * `AcademyProtectionService`); anyone else gets
 * `403 errors.academy.insufficientRole`.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  AcademyContentProtection,
  AcademyDevicePolicy,
  AcademyVideoTierSettings,
  UpdateAcademyContentProtectionPayload,
  UpdateAcademyDevicePolicyPayload,
  UpdateAcademyVideoTierPayload,
} from '@types';

export class AcademyProtectionService extends BaseService {
  protected readonly resource = 'academies';

  async getContentProtection(
    academyId: string,
    options?: ReadOptions
  ): Promise<AcademyContentProtection> {
    return this.client.get<AcademyContentProtection>(
      this.path(academyId, 'content-protection'),
      options
    );
  }

  async updateContentProtection(
    academyId: string,
    payload: UpdateAcademyContentProtectionPayload,
    options?: WriteOptions
  ): Promise<AcademyContentProtection> {
    return this.client.patch<
      AcademyContentProtection,
      UpdateAcademyContentProtectionPayload
    >(this.path(academyId, 'content-protection'), payload, options);
  }

  async getVideoTier(
    academyId: string,
    options?: ReadOptions
  ): Promise<AcademyVideoTierSettings> {
    return this.client.get<AcademyVideoTierSettings>(
      this.path(academyId, 'video-tier'),
      options
    );
  }

  async updateVideoTier(
    academyId: string,
    payload: UpdateAcademyVideoTierPayload,
    options?: WriteOptions
  ): Promise<AcademyVideoTierSettings> {
    return this.client.patch<
      AcademyVideoTierSettings,
      UpdateAcademyVideoTierPayload
    >(this.path(academyId, 'video-tier'), payload, options);
  }

  async getDevicePolicy(
    academyId: string,
    options?: ReadOptions
  ): Promise<AcademyDevicePolicy> {
    return this.client.get<AcademyDevicePolicy>(
      this.path(academyId, 'device-policy'),
      options
    );
  }

  async updateDevicePolicy(
    academyId: string,
    payload: UpdateAcademyDevicePolicyPayload,
    options?: WriteOptions
  ): Promise<AcademyDevicePolicy> {
    return this.client.patch<
      AcademyDevicePolicy,
      UpdateAcademyDevicePolicyPayload
    >(this.path(academyId, 'device-policy'), payload, options);
  }
}

export const academyProtectionService = new AcademyProtectionService();
