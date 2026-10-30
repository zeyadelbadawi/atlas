/**
 * B3 — the dashboard banner feed for every signed-in dashboard user
 * (`GET /site-announcements/dashboard`), already filtered by audience and
 * resolved to one locale on the server.
 *
 * Views, clicks and closes are counted through the same beacon route the
 * marketing site uses (`POST /public/site-announcements/:id/events`, always
 * 204), so the Platform Owner's "Views · clicks · closes" column covers
 * dashboard banners too. Best effort: a failure is never shown.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type { BlogLocale, PublicAnnouncement } from '../types';

export type DashboardAnnouncementEvent = 'view' | 'click' | 'dismiss';

export class DashboardAnnouncementService extends BaseService {
  protected readonly resource = 'site-announcements';

  async dashboard(
    locale: BlogLocale,
    options?: ReadOptions
  ): Promise<{ readonly banners: readonly PublicAnnouncement[] }> {
    return this.client.get<{ readonly banners: readonly PublicAnnouncement[] }>(
      this.path('dashboard'),
      { ...options, params: { locale } }
    );
  }

  /** Fire-and-forget: never throws. */
  recordEvent(id: string, type: DashboardAnnouncementEvent): void {
    try {
      void this.client
        .post<void, { type: DashboardAnnouncementEvent }>(
          `public/site-announcements/${encodeURIComponent(id)}/events`,
          { type }
        )
        .catch(() => undefined);
    } catch {
      // Counters are best effort.
    }
  }
}

export const dashboardAnnouncementService = new DashboardAnnouncementService();
