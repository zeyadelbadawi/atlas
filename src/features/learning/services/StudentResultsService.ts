/**
 * Student Results Service (Phase 9, "My Results").
 *
 * Reads the one server-side aggregation of the student's own quiz and
 * assignment outcomes. There is no student-id parameter by design — the
 * backend scopes the response to the authenticated caller and the
 * underlying tables are additionally restricted to them by RLS, so this
 * service could not request another student's results even if asked to.
 *
 * `academyId` narrows to a single Academy. It only ever filters the
 * caller's OWN enrollments, so it cannot widen access.
 */
import { BaseService, resourcePath } from '@services';
import type { ReadOptions } from '@services';
import type { StudentResults } from '@types';

export class StudentResultsService extends BaseService {
  protected readonly resource = 'learning';

  async getMyResults(
    academyId?: string,
    options?: ReadOptions
  ): Promise<StudentResults> {
    return this.client.get<StudentResults>(resourcePath('learning', 'results'), {
      ...options,
      params: { ...(academyId ? { academyId } : {}), ...options?.params },
    });
  }
}

export const studentResultsService = new StudentResultsService();
