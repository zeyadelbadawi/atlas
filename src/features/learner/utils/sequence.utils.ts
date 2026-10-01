/**
 * Reading the one ordered sequence (§E.2).
 *
 * EVERYTHING HERE IS A READ. The server computed the order, the unit
 * ordinals and the per-item state; nothing in this file re-derives any of
 * them. That is the whole point of the sequence endpoint: before it, the
 * player assembled "what comes next" from three separately-ordered lists
 * and Previous/Next skipped every assessment (finding F3). A helper that
 * re-sorted `items` here would quietly reintroduce exactly that class of
 * disagreement, so these functions index into the array as given.
 *
 * NUMBERING IS "2.3" WITH LOCALE DIGITS. Arabic renders `٢٫٣` through
 * `Intl` with `ar-EG`, which is the same numeral system the rest of the
 * product's numbers use (`number.utils.ts`). The composed label is
 * wrapped in a left-to-right isolate because `2.3` is a two-run
 * expression with a neutral separator between the runs — precisely the
 * shape that renders as `3.2` inside an Arabic paragraph if it is left
 * unprotected (`bidi.utils.ts` documents the failure at length).
 */
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  ClipboardList,
  FileText,
  Lock,
  PlayCircle,
  Radio,
  Send,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { formatNumber, isolateNumericExpression } from '@utils';
import type {
  CourseSequenceItem,
  LanguageCode,
  SequenceItemState,
  SequenceItemType,
  SequenceLockReason,
} from '@types';

/** The "2.3" label, in the reader's own digits and safe inside an Arabic sentence. */
export function formatSequenceOrdinal(
  item: Pick<CourseSequenceItem, 'unitNumber' | 'itemNumber'>,
  language: LanguageCode
): string {
  const unit = formatNumber(item.unitNumber, language);
  const position = formatNumber(item.itemNumber, language);
  return isolateNumericExpression(`${unit}.${position}`);
}

/**
 * The icon for one item state.
 *
 * ALWAYS PAIRED WITH TEXT, never used alone (§E.2 asks for "icons + text",
 * and the accessibility audit's finding was a column of unlabelled glyphs
 * a screen reader announced as nothing). Every consumer renders
 * `sequenceStateLabelKey` beside it; the icon is `aria-hidden`.
 */
export const SEQUENCE_STATE_ICONS: Readonly<
  Record<SequenceItemState, LucideIcon>
> = {
  locked: Lock,
  available: CircleDashed,
  in_progress: PlayCircle,
  completed: CheckCircle2,
  passed: CheckCircle2,
  failed: XCircle,
  submitted: Send,
  graded: CheckCircle2,
  overdue: CircleAlert,
};

/** The icon for one item type, for the activity header. */
export const SEQUENCE_TYPE_ICONS: Readonly<
  Record<SequenceItemType, LucideIcon>
> = {
  lesson: BookOpen,
  quiz: ClipboardList,
  assignment: FileText,
  live_session: Radio,
};

/** Fallback for a state a future backend adds before this frontend knows it. */
const UNKNOWN_STATE_ICON: LucideIcon = CircleDashed;

export function sequenceStateIcon(state: SequenceItemState): LucideIcon {
  return SEQUENCE_STATE_ICONS[state] ?? UNKNOWN_STATE_ICON;
}

export function sequenceTypeIcon(type: SequenceItemType): LucideIcon {
  return SEQUENCE_TYPE_ICONS[type] ?? CalendarClock;
}

export function sequenceStateLabelKey(state: SequenceItemState): string {
  return `learning:player.itemState.${state}`;
}

export function sequenceTypeLabelKey(type: SequenceItemType): string {
  return `learning:player.itemType.${type}`;
}

/**
 * Why this item is locked, as a real sentence.
 *
 * A lock with no reason is the single most common learner support ticket,
 * which is why the vocabulary is closed on the server and each member
 * gets its own translated explanation rather than one generic "locked".
 */
export function sequenceLockReasonKey(reason: SequenceLockReason): string {
  return `learning:player.lockReason.${reason}`;
}

/** States that mean the learner has finished with this item. */
const FINISHED_STATES: ReadonlySet<SequenceItemState> = new Set([
  'completed',
  'passed',
  'graded',
]);

export function isSequenceItemFinished(state: SequenceItemState): boolean {
  return FINISHED_STATES.has(state);
}

export interface SequenceNeighbours {
  readonly index: number;
  readonly current: CourseSequenceItem | undefined;
  readonly previous: CourseSequenceItem | undefined;
  readonly next: CourseSequenceItem | undefined;
}

/**
 * Previous/Next as an index step over the server's own order.
 *
 * Neighbours are returned even when they are LOCKED: the action bar
 * disables the control and the sidebar shows the reason, which tells the
 * learner that something comes next and why they cannot reach it yet.
 * Skipping locked items here instead would silently jump a learner past
 * a drip-scheduled lesson into the one after it.
 */
export function findSequenceNeighbours(
  items: readonly CourseSequenceItem[],
  currentItemId: string | undefined
): SequenceNeighbours {
  const index = currentItemId
    ? items.findIndex((item) => item.id === currentItemId)
    : -1;

  if (index < 0) {
    return {
      index: -1,
      current: undefined,
      previous: undefined,
      next: undefined,
    };
  }

  return {
    index,
    current: items[index],
    previous: index > 0 ? items[index - 1] : undefined,
    next: index < items.length - 1 ? items[index + 1] : undefined,
  };
}

/** Groups the flat sequence back into its units, preserving server order. */
export interface SequenceUnit {
  readonly sectionId: string;
  readonly sectionTitle: string;
  readonly unitNumber: number;
  readonly items: readonly CourseSequenceItem[];
}

export function groupSequenceByUnit(
  items: readonly CourseSequenceItem[]
): readonly SequenceUnit[] {
  const units: SequenceUnit[] = [];
  let current: { -readonly [K in keyof SequenceUnit]: SequenceUnit[K] } | null =
    null;

  for (const item of items) {
    if (!current || current.sectionId !== item.sectionId) {
      current = {
        sectionId: item.sectionId,
        sectionTitle: item.sectionTitle,
        unitNumber: item.unitNumber,
        items: [],
      };
      units.push(current as SequenceUnit);
    }
    current.items = [...current.items, item];
  }

  return units;
}

/**
 * Overall progress as a percentage, from the server's own counts.
 *
 * `completedCount`/`totalCount` are computed across all four item types,
 * so this is genuinely "how far through the course am I" rather than
 * "how many lessons have I ticked" — which is the number the retired
 * progress bar showed while a learner still had three assignments
 * outstanding.
 */
export function sequenceCompletionPercentage(
  completedCount: number,
  totalCount: number
): number {
  if (totalCount <= 0) return 0;
  return Math.round((completedCount / totalCount) * 100);
}
