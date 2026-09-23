/**
 * Academy Reports Service (P64 Phase 4 §E.5) — the owner's integrity and
 * sharing reports for one academy.
 *
 * Two reads mirroring the backend's `academies/:academyId/reports/*` tree.
 * Who may reach them is enforced server-side (owner/admin/manager of THAT
 * academy; everyone else gets 403), so this service only addresses them —
 * it is never the boundary. `days` travels as a query parameter and is
 * clamped to the backend's own 1–90 range here so a stray value can never
 * turn into a 400 the user has no way to act on.
 *
 * Built with `resourcePath` like `StudentAnalyticsService`; every segment
 * goes through its per-segment encoding.
 */
import { BaseService, resourcePath } from '@services';
import type { ReadOptions } from '@services';
import type { AcademyIntegrityReport, AcademySharingReport } from '@types';

/** The backend's accepted window, inclusive. */
export const REPORT_WINDOW_MIN_DAYS = 1;
export const REPORT_WINDOW_MAX_DAYS = 90;
export const REPORT_WINDOW_DEFAULT_DAYS = 30;

/** Clamps a requested window into the range the backend accepts. */
export function clampReportWindowDays(days: number): number {
  if (!Number.isFinite(days)) return REPORT_WINDOW_DEFAULT_DAYS;
  return Math.min(
    REPORT_WINDOW_MAX_DAYS,
    Math.max(REPORT_WINDOW_MIN_DAYS, Math.trunc(days))
  );
}

export class AcademyReportsService extends BaseService {
  protected readonly resource = 'academies';

  async getIntegrityReport(
    academyId: string,
    days: number,
    options?: ReadOptions
  ): Promise<AcademyIntegrityReport> {
    return this.client.get<AcademyIntegrityReport>(
      resourcePath('academies', academyId, 'reports', 'integrity'),
      {
        ...options,
        params: { ...options?.params, days: clampReportWindowDays(days) },
      }
    );
  }

  async getSharingReport(
    academyId: string,
    days: number,
    options?: ReadOptions
  ): Promise<AcademySharingReport> {
    return this.client.get<AcademySharingReport>(
      resourcePath('academies', academyId, 'reports', 'sharing'),
      {
        ...options,
        params: { ...options?.params, days: clampReportWindowDays(days) },
      }
    );
  }
}

export const academyReportsService = new AcademyReportsService();
