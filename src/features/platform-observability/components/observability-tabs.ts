/** The four Observability pages — mirrors the sidebar branch exactly. */
import { Activity, Bell, ChartLine, Settings2 } from 'lucide-react';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type { NavigationItem } from '@types';

export const OBSERVABILITY_TABS: readonly NavigationItem[] = [
  {
    id: 'observability-health',
    labelKey: 'navigation:items.platformObservabilityHealth',
    path: DASHBOARD_ROUTES.platformObservabilityHealth,
    icon: Activity,
  },
  {
    id: 'observability-alerts',
    labelKey: 'navigation:items.platformObservabilityAlerts',
    path: DASHBOARD_ROUTES.platformObservabilityAlerts,
    icon: Bell,
    matchNestedPaths: true,
  },
  {
    id: 'observability-metrics',
    labelKey: 'navigation:items.platformObservabilityMetrics',
    path: DASHBOARD_ROUTES.platformObservabilityMetrics,
    icon: ChartLine,
  },
  {
    id: 'observability-configuration',
    labelKey: 'navigation:items.platformObservabilityConfiguration',
    path: DASHBOARD_ROUTES.platformObservabilityConfiguration,
    icon: Settings2,
  },
];
