/**
 * Academy Communication Settings Service (P66).
 *
 * `GET/PATCH academies/:id/communication-settings` — when learners are
 * asked for an emailed sign-in code, whether announcements may go out by
 * email, and the default digest frequency for new learners. Reading is
 * Owner/Manager; changing it is Client Owner only (the same
 * `assertCanManageSecurityPolicy` rule as the registration policy —
 * Managers get `403 errors.academy.insufficientRole`).
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  AcademyCommunicationSettings,
  UpdateAcademyCommunicationSettingsPayload,
} from '@types';

export class AcademyCommunicationSettingsService extends BaseService {
  protected readonly resource = 'academies';

  async get(
    academyId: string,
    options?: ReadOptions
  ): Promise<AcademyCommunicationSettings> {
    return this.client.get<AcademyCommunicationSettings>(
      this.path(academyId, 'communication-settings'),
      options
    );
  }

  async update(
    academyId: string,
    payload: UpdateAcademyCommunicationSettingsPayload,
    options?: WriteOptions
  ): Promise<AcademyCommunicationSettings> {
    return this.client.patch<
      AcademyCommunicationSettings,
      UpdateAcademyCommunicationSettingsPayload
    >(this.path(academyId, 'communication-settings'), payload, options);
  }
}

export const academyCommunicationSettingsService =
  new AcademyCommunicationSettingsService();
