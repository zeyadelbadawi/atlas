/**
 * Platform Academy Service (Prompt 13).
 *
 * The Platform Owner's cross-tenant academy console. Uses the deliberately
 * distinct resource `platform-academies` rather than the existing
 * `academies` resource `AcademyService` (Prompt 3B) already owns — that
 * service's `getAcademies()` is documented as "for the active
 * organization"; reusing the same path for an unfiltered, cross-tenant
 * list would leave a backend engineer unable to tell the two calls apart
 * by shape alone. Read-only: no academy-administration mutation is
 * defined by the product specification.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type {
  CollectionQuery,
  PaginatedResult,
  PlatformAcademyDetail,
  PlatformAcademySummary,
} from '@types';

export class PlatformAcademyService extends BaseService {
  protected readonly resource = 'platform-academies';

  /** Retrieves academies across every organization. */
  async getAcademies(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<PlatformAcademySummary>> {
    return this.fetchCollection<PlatformAcademySummary>(query, options);
  }

  /** Retrieves one academy's full cross-tenant detail view. */
  async getAcademy(
    academyId: string,
    options?: ReadOptions
  ): Promise<PlatformAcademyDetail> {
    return this.fetchOne<PlatformAcademyDetail>(academyId, options);
  }
}

/** Singleton instance following the Atlas service pattern. */
export const platformAcademyService = new PlatformAcademyService();
