/**
 * Icons used by the help center (Lucide, rendered to inline SVG at build
 * time; decorative, so always aria-hidden next to their text).
 */
import {
  Ban,
  Bell,
  BookMarked,
  BookOpen,
  Building2,
  ChartColumn,
  CircleHelp,
  CircleUser,
  GraduationCap,
  Info,
  LayoutTemplate,
  LifeBuoy,
  Lightbulb,
  ListChecks,
  Lock,
  Receipt,
  Rocket,
  ShieldCheck,
  TriangleAlert,
  UserPlus,
  UsersRound,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { CalloutKind } from '../render/markdown';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  rocket: Rocket,
  'users-round': UsersRound,
  'list-checks': ListChecks,
  'building-2': Building2,
  'layout-template': LayoutTemplate,
  'book-open': BookOpen,
  'graduation-cap': GraduationCap,
  'shield-check': ShieldCheck,
  wallet: Wallet,
  receipt: Receipt,
  'user-plus': UserPlus,
  'circle-user': CircleUser,
  bell: Bell,
  'life-buoy': LifeBuoy,
  'chart-column': ChartColumn,
  lock: Lock,
  'book-marked': BookMarked,
  wrench: Wrench,
  'circle-help': CircleHelp,
};

export function CategoryIcon({ name, className = 'size-5' }: { name: string; className?: string }) {
  const Icon = CATEGORY_ICONS[name] ?? BookOpen;
  return <Icon className={className} aria-hidden focusable="false" strokeWidth={1.75} />;
}

export function hasCategoryIcon(name: string): boolean {
  return name in CATEGORY_ICONS;
}

const CALLOUT_ICONS: Record<CalloutKind, LucideIcon> = {
  note: Info,
  tip: Lightbulb,
  limitation: Ban,
  warning: TriangleAlert,
};

export function CalloutIcon({ kind }: { kind: CalloutKind }) {
  const Icon = CALLOUT_ICONS[kind];
  return <Icon className="size-4 shrink-0" aria-hidden focusable="false" strokeWidth={2} />;
}
