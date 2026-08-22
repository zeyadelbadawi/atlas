/**
 * Resolves a Feature item's bounded icon name (see `FEATURE_ICON_OPTIONS`)
 * to its real `lucide-react` component. The only place a tenant-supplied
 * icon "name" string is ever turned into a rendered component — never
 * dynamic/arbitrary lookup, always this fixed map.
 */
import {
  Award,
  BookOpen,
  Clock,
  Globe,
  GraduationCap,
  Headphones,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

const FEATURE_ICON_MAP: Record<string, LucideIcon> = {
  GraduationCap,
  BookOpen,
  Award,
  Users,
  Clock,
  ShieldCheck,
  Sparkles,
  Globe,
  Video,
  Headphones,
};

/** Falls back to a generic icon for any unrecognized name, so a rendered page never breaks. */
export function resolveFeatureIcon(name: string): LucideIcon {
  return FEATURE_ICON_MAP[name] ?? HelpCircle;
}
