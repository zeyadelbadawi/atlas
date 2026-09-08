/**
 * Dashboard Service (Phase 8).
 *
 * Reads the one server-side aggregation behind the tenant dashboard
 * (`GET organizations/:id/dashboard` / `GET academies/:id/dashboard`) —
 * never five separate calls the page then stitches together, and never a
 * wider scope filtered down in the browser. Which of the two endpoints a
 * caller may actually reach is decided and enforced by the backend's own
 * guards; this service only addresses them.
 *
 * Spans two resource roots (`organizations` and `academies`), so both
 * paths are built with `resourcePath` directly rather than `path()` —
 * `resource` is only meaningful for a service rooted at ONE collection.
 * Every segment still goes through `resourcePath`'s per-segment
 * `encodeURIComponent`, never string interpolation.
 */
import { BaseService, resourcePath } from '@services';
import type { ReadOptions } from '@services';
import type { DashboardOverview } from '@types';

export class DashboardService extends BaseService {
  protected readonly resource = 'organizations';

  /** The Client/Organization Owner's dashboard — every Academy under the organization. */
  async getForOrganization(
    organizationId: string,
    options?: ReadOptions
  ): Promise<DashboardOverview> {
    return this.client.get<DashboardOverview>(
      resourcePath('organizations', organizationId, 'dashboard'),
      options
    );
  }

  /** The Academy Manager's dashboard — exactly one Academy. */
  async getForAcademy(
    academyId: string,
    options?: ReadOptions
  ): Promise<DashboardOverview> {
    return this.client.get<DashboardOverview>(
      resourcePath('academies', academyId, 'dashboard'),
      options
    );
  }
}

export const dashboardService = new DashboardService();
