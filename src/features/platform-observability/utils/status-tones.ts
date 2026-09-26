/**
 * Tone, icon and label key for every monitoring state (see
 * `ObservabilityStatusBadge`).
 *
 * One badge for every monitoring state, so a state never reads differently
 * on two pages.
 *
 * Colour is semantic and token-driven (the same `success` / `warning` /
 * `destructive` / `info` surfaces `StatusBadge` uses), and it is NEVER the
 * only signal: every badge carries an icon whose SHAPE differs by tone and
 * the translated word. `unknown` and `not_configured` are deliberately
 * neutral and dashed — an unverified component must not look green.
 */
import {
  Ban,
  BellOff,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  Clock,
  Info,
  OctagonAlert,
  TriangleAlert,
  CheckCheck,
  CloudOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  AlertRuleInfo,
  AlertSeverity,
  AlertStatus,
  ComponentStatus,
  SourceState,
  SystemHealthResponse,
} from '@types';

/** The semantic tones the Observability Center uses. */
export type ObservabilityTone =
  | 'critical'
  | 'warning'
  | 'healthy'
  | 'info'
  | 'resolved'
  | 'unknown'
  | 'notConfigured'
  | 'muted';

export const TONE_CLASS: Record<ObservabilityTone, string> = {
  critical: 'border-transparent bg-destructive-surface text-destructive',
  warning: 'border-transparent bg-warning-surface text-warning',
  healthy: 'border-transparent bg-success-surface text-success',
  info: 'border-transparent bg-info-surface text-info',
  resolved: 'border-border bg-muted text-muted-foreground',
  unknown:
    'border-dashed border-border-strong bg-transparent text-muted-foreground',
  notConfigured:
    'border-dashed border-border-strong bg-transparent text-muted-foreground',
  muted: 'border-border bg-muted text-muted-foreground',
};

type BadgeSpec = readonly [tone: ObservabilityTone, icon: LucideIcon];

const COMPONENT: Record<ComponentStatus, BadgeSpec> = {
  healthy: ['healthy', CircleCheck],
  degraded: ['warning', TriangleAlert],
  down: ['critical', OctagonAlert],
  unknown: ['unknown', CircleHelp],
  not_configured: ['notConfigured', Ban],
};

const SEVERITY: Record<AlertSeverity, BadgeSpec> = {
  critical: ['critical', OctagonAlert],
  warning: ['warning', TriangleAlert],
  info: ['info', Info],
  unknown: ['unknown', CircleHelp],
};

const ALERT_STATUS: Record<AlertStatus, BadgeSpec> = {
  firing: ['critical', OctagonAlert],
  pending: ['warning', Clock],
  silenced: ['muted', BellOff],
  resolved: ['resolved', CheckCheck],
};

const RULE_STATE: Record<AlertRuleInfo['state'], BadgeSpec> = {
  firing: ['critical', OctagonAlert],
  pending: ['warning', Clock],
  // Not firing is not the same as verified healthy — neutral, not green.
  inactive: ['muted', CircleDashed],
};

const RULE_HEALTH: Record<AlertRuleInfo['health'], BadgeSpec> = {
  ok: ['healthy', CircleCheck],
  err: ['critical', OctagonAlert],
  unknown: ['unknown', CircleHelp],
};

const OVERALL: Record<SystemHealthResponse['overall'], BadgeSpec> = {
  operational: ['healthy', CircleCheck],
  degraded: ['warning', TriangleAlert],
  outage: ['critical', OctagonAlert],
};

const SOURCE: Record<SourceState, BadgeSpec> = {
  ok: ['healthy', CircleCheck],
  unavailable: ['warning', CloudOff],
  not_configured: ['notConfigured', Ban],
};

export type BadgeKind =
  | { readonly kind: 'component'; readonly value: ComponentStatus }
  | { readonly kind: 'severity'; readonly value: AlertSeverity }
  | { readonly kind: 'alertStatus'; readonly value: AlertStatus }
  | { readonly kind: 'ruleState'; readonly value: AlertRuleInfo['state'] }
  | { readonly kind: 'ruleHealth'; readonly value: AlertRuleInfo['health'] }
  | {
      readonly kind: 'overall';
      readonly value: SystemHealthResponse['overall'];
    }
  | { readonly kind: 'source'; readonly value: SourceState }
  | { readonly kind: 'channel'; readonly value: 'connected' | 'not_connected' };

const CHANNEL: Record<'connected' | 'not_connected', BadgeSpec> = {
  connected: ['healthy', CircleCheck],
  not_connected: ['notConfigured', Ban],
};

const FALLBACK: BadgeSpec = ['unknown', CircleHelp];

/** Resolves a state to its tone, icon and translation key. */
export function badgeSpec(badge: BadgeKind): {
  readonly tone: ObservabilityTone;
  readonly icon: LucideIcon;
  readonly labelKey: string;
} {
  const table: Record<string, BadgeSpec> = {
    component: COMPONENT,
    severity: SEVERITY,
    alertStatus: ALERT_STATUS,
    ruleState: RULE_STATE,
    ruleHealth: RULE_HEALTH,
    overall: OVERALL,
    source: SOURCE,
    channel: CHANNEL,
  }[badge.kind] as Record<string, BadgeSpec>;
  const [tone, icon] = table[badge.value] ?? FALLBACK;
  return {
    tone,
    icon,
    labelKey: `platformObservability:badges.${badge.kind}.${badge.value}`,
  };
}

/** The tone's classes for surfaces that are not badges (banners, tiles). */
export function toneClass(tone: ObservabilityTone): string {
  return TONE_CLASS[tone];
}
