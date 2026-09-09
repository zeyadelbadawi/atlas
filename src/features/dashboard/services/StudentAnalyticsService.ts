/**
 * Student Analytics Service (Phase 9) — the Client Owner's student
 * progress rollup.
 *
 * Two endpoints mirroring the backend, addressed by scope. Which one a
 * caller may actually reach is enforced server-side (the organization
 * route requires the owner-exclusive `tenant.dashboard.view`; the academy
 * route requires real membership of that academy), so this service only
 * addresses them — it is never the boundary.
 *
 * Spans two resource roots, so both paths are built with `resourcePath`
 * directly; every segment still goes through its per-segment encoding.
 */
import { BaseService, resourcePath } from '@services';
import type { ReadOptions } from '@services';
import type { StudentAnalytics } from '@types';

export class StudentAnalyticsService extends BaseService {
  protected readonly resource = 'organizations';

  async getForOrganization(
    organizationId: string,
    options?: ReadOptions
  ): Promise<StudentAnalytics> {
    return this.client.get<StudentAnalytics>(
      resourcePath('organizations', organizationId, 'student-analytics'),
      options
    );
  }

  async getForAcademy(
    academyId: string,
    options?: ReadOptions
  ): Promise<StudentAnalytics> {
    return this.client.get<StudentAnalytics>(
      resourcePath('academies', academyId, 'student-analytics'),
      options
    );
  }
}

export const studentAnalyticsService = new StudentAnalyticsService();
