/**
 * The academy build screen's stages and how far along the build window is.
 * Pure; see `AcademyBuildExperience` and `academy-build-timer.ts`.
 */
import {
  CreditCard,
  FileText,
  GraduationCap,
  LayoutTemplate,
  Lock,
  Palette,
  Rocket,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

interface BuildStage {
  readonly key: string;
  readonly icon: LucideIcon;
  /** Share of the build window this stage takes. */
  readonly weight: number;
}

export const ACADEMY_BUILD_STAGES: readonly BuildStage[] = [
  { key: 'workspace', icon: GraduationCap, weight: 1 },
  { key: 'packages', icon: Sparkles, weight: 1.3 },
  { key: 'theme', icon: LayoutTemplate, weight: 1.2 },
  { key: 'pages', icon: FileText, weight: 1.5 },
  { key: 'courses', icon: GraduationCap, weight: 1.1 },
  { key: 'brand', icon: Palette, weight: 1 },
  { key: 'payments', icon: CreditCard, weight: 1 },
  { key: 'security', icon: Lock, weight: 1.1 },
  { key: 'protection', icon: ShieldCheck, weight: 0.9 },
  { key: 'launch', icon: Rocket, weight: 0.9 },
];

const TOTAL_WEIGHT = ACADEMY_BUILD_STAGES.reduce((sum, s) => sum + s.weight, 0);
export const BUILD_HIGHLIGHT_KEYS = [
  'bilingual',
  'payments',
  'protection',
  'offline',
  'certificates',
];
/** The ring never claims 100 % before the server says the academy is ready. */
const HOLD_PERCENT = 97;

/** Index of the active stage and the overall percentage for a point in the window. */
export function buildProgressAt(
  elapsedMs: number,
  durationMs: number
): { readonly stageIndex: number; readonly percent: number } {
  const fraction = durationMs > 0 ? Math.min(1, elapsedMs / durationMs) : 1;
  let cumulative = 0;
  let stageIndex = ACADEMY_BUILD_STAGES.length - 1;
  for (let i = 0; i < ACADEMY_BUILD_STAGES.length; i += 1) {
    cumulative += ACADEMY_BUILD_STAGES[i].weight / TOTAL_WEIGHT;
    if (fraction < cumulative) {
      stageIndex = i;
      break;
    }
  }
  return { stageIndex, percent: Math.round(fraction * HOLD_PERCENT) };
}
