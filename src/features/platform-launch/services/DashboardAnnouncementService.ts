/**
 * B3 — the dashboard banner feed for every signed-in dashboard user
 * (`GET /site-announcements/dashboard`), already filtered by audience and
 * resolved to one locale on the server.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type { BlogLocale, PublicAnnouncement } from '../types';

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
}

export const dashboardAnnouncementService = new DashboardAnnouncementService();
