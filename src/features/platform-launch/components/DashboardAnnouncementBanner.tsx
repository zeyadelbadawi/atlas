/**
 * B3 — the dashboard banner for every signed-in dashboard user, at the top
 * of the dashboard content (`DashboardLayout`). Data: `GET
 * /site-announcements/dashboard?locale=` (audience-filtered by the server).
 *
 * A dismissal is remembered per announcement AND version (`updatedAt`) in
 * localStorage, so an edited banner shows again; storage failures (private
 * mode) only mean it may show again next visit. Nothing renders while
 * loading or on error, so the content never jumps for a failed request.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@hooks';
import {
  dismissKey,
  isAnnouncementTone,
  safeStore,
} from '@/marketing/announcements/presentation';
import { useDashboardAnnouncements } from '../hooks/usePlatformAnnouncements';
import { AnnouncementBannerView } from './AnnouncementBannerView';

const store = safeStore(() =>
  typeof window === 'undefined' ? undefined : window.localStorage
);

/** At most two bars, like the marketing site. */
const MAX_BANNERS = 2;

export function DashboardAnnouncementBanner(): JSX.Element | null {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const locale = language === 'ar' ? 'ar' : 'en';
  const feed = useDashboardAnnouncements(locale);
  const [dismissed, setDismissed] = useState<readonly string[]>([]);

  const banners = (feed.data?.banners ?? [])
    .filter((banner) => {
      const key = dismissKey(banner.id, banner.updatedAt);
      return !dismissed.includes(key) && !store.getItem(key);
    })
    .slice(0, MAX_BANNERS);

  if (banners.length === 0) return null;

  return (
    <div className="space-y-2 px-4 pt-4 sm:px-6 lg:px-8">
      {banners.map((banner) => {
        const key = dismissKey(banner.id, banner.updatedAt);
        return (
          <AnnouncementBannerView
            key={key}
            tone={isAnnouncementTone(banner.tone) ? banner.tone : 'info'}
            title={banner.title || undefined}
            body={banner.body}
            ctaLabel={banner.ctaLabel || undefined}
            ctaUrl={banner.ctaUrl}
            dismissible={banner.dismissible}
            dismissLabel={t('layout:dashboardAnnouncement.dismiss')}
            regionLabel={t('layout:dashboardAnnouncement.region')}
            onDismiss={() => {
              store.setItem(key, '1');
              setDismissed((current) => [...current, key]);
            }}
            className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
          />
        );
      })}
    </div>
  );
}
