/**
 * G1 — Growth & capacity (`/dashboard/platform/growth`), Platform Owner.
 *
 * Four tabs, deep-linkable with `?tab=`: Capacity (default) — the season,
 * this week's onboardings against the cap, the owner's hours, hiring
 * thresholds and alerts; CAC — cost per paying academy by channel per
 * Cairo month (cash spend only); Spend — the marketing cash ledger;
 * Settings — the numbers the Capacity tab measures against.
 *
 * The route guard hides the page; `PlatformOwnerGuard` + RLS on the API are
 * the actual control. The Settings tab stays mounted (hidden) while another
 * tab is open, so switching tabs never drops an unsaved draft.
 */
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageContainer, PageHeader } from '@components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@hooks';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import { CapacityTab, type GrowthTab } from '../components/CapacityTab';
import { CacTab } from '../components/CacTab';
import { SpendTab } from '../components/SpendTab';
import { SettingsTab } from '../components/SettingsTab';
import { K } from '../utils/growth.utils';

export const GROWTH_TABS: readonly GrowthTab[] = [
  'capacity',
  'cac',
  'spend',
  'settings',
];

export function growthTabOf(value: string | null): GrowthTab {
  return GROWTH_TABS.includes(value as GrowthTab)
    ? (value as GrowthTab)
    : 'capacity';
}

export default function PlatformGrowthPage(): JSX.Element {
  const { t } = useTranslation();
  const { direction } = useLanguage();
  const [params, setParams] = useSearchParams();
  const tab = growthTabOf(params.get('tab'));

  const selectTab = (next: string) =>
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        if (next === 'capacity') updated.delete('tab');
        else updated.set('tab', next);
        // The CAC range belongs to the CAC tab only.
        if (next !== 'cac') {
          updated.delete('from');
          updated.delete('to');
        }
        return updated;
      },
      { replace: true }
    );

  const breadcrumbs: BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.platformDashboard',
      path: DASHBOARD_ROUTES.platform,
    },
    {
      labelKey: 'navigation:items.platformLaunch',
      path: DASHBOARD_ROUTES.platformLaunch,
    },
    { labelKey: `${K}title` },
  ];

  return (
    <PageContainer>
      <PageHeader
        titleKey={`${K}title`}
        descriptionKey={`${K}subtitle`}
        breadcrumbs={breadcrumbs}
      />
      <Tabs value={tab} onValueChange={selectTab} dir={direction}>
        <div className="relative -mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList aria-label={t(`${K}tabs.label`)} className="h-auto">
            {GROWTH_TABS.map((value) => (
              <TabsTrigger key={value} value={value} className="min-h-11 px-4">
                {t(`${K}tabs.${value}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="capacity" className="mt-0">
          <CapacityTab />
        </TabsContent>
        <TabsContent value="cac" className="mt-0">
          <CacTab />
        </TabsContent>
        <TabsContent value="spend" className="mt-0">
          <SpendTab />
        </TabsContent>
        <TabsContent
          value="settings"
          forceMount
          className="mt-0 data-[state=inactive]:hidden"
        >
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
