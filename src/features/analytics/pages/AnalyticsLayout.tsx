/**
 * Analysis — the shared shell for the four analytics areas (P59).
 *
 * WHAT REPLACED WHAT. This file is what remains of the old single
 * `AnalyticsPage`: its header, its date-range control, and its tab strip.
 * The four `<TabsContent>` bodies moved out to their own routed pages, and
 * `<Outlet />` renders whichever one the URL names.
 *
 * `SectionTabs` — NOT `<Tabs>`. Atlas already has a tab strip built from
 * real `<Link>`s (`shared/components/navigation/SectionTabs`), used for
 * exactly this "tabs that are routes" shape elsewhere in the dashboard. It
 * gives deep-linking, browser back/forward and middle-click-to-open-in-a-
 * new-tab for free, none of which the Radix `<Tabs>` state could. Reusing
 * it also means the sidebar's nested children and this strip stay visually
 * and behaviourally identical without a second implementation.
 *
 * The date range lives in the URL (`useAnalyticsRange`) so it survives
 * moving between the four pages.
 */
import { Outlet } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import { SectionTabs } from '@components/navigation';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { AnalyticsDateRangeSelect } from '../components/AnalyticsDateRangeSelect';
import { useAnalyticsRange } from './useAnalyticsRange';
import type { NavigationItem } from '@types';

/**
 * Mirrors the sidebar's Analysis children exactly — same labels, same
 * paths — so the two navigations can never disagree about what exists.
 */
const ANALYTICS_TABS: readonly NavigationItem[] = [
  {
    id: 'analytics-overview',
    labelKey: 'analytics:tabs.overview',
    path: DASHBOARD_ROUTES.analytics,
  },
  {
    id: 'analytics-users',
    labelKey: 'analytics:tabs.users',
    path: DASHBOARD_ROUTES.analyticsUsers,
  },
  {
    id: 'analytics-engagement',
    labelKey: 'analytics:tabs.engagement',
    path: DASHBOARD_ROUTES.analyticsEngagement,
  },
  {
    id: 'analytics-revenue',
    labelKey: 'analytics:tabs.revenue',
    path: DASHBOARD_ROUTES.analyticsRevenue,
  },
];

export default function AnalyticsLayout(): JSX.Element {
  const { preset, setPreset } = useAnalyticsRange();

  return (
    <PageContainer>
      <PageHeader titleKey="analytics:title" descriptionKey="analytics:subtitle" />

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTabs items={ANALYTICS_TABS} />
          <AnalyticsDateRangeSelect value={preset} onChange={setPreset} />
        </div>

        <Outlet />
      </div>
    </PageContainer>
  );
}
