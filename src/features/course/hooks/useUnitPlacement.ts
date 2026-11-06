/**
 * Unit placement for a NEW quiz or assignment (see `UnitPickerField`).
 *
 * `useUnitPlacement` holds the choice: the course's units in course order
 * and the chosen unit — by default the unit the page was opened from
 * (`preferredSectionId`, e.g. `?sectionId=`) when it is one of this
 * course's units, else the first unit, else "Not in a unit".
 *
 * How the item gets INTO the unit depends on what its create endpoint
 * does:
 *
 *   - a quiz is placed atomically: `CreateQuizDto.sectionId` checks the
 *     unit belongs to the course and appends the quiz at its end in the
 *     same transaction (W7), so `QuizAuthoringForm` sends it with the
 *     create — one call, nothing half-done;
 *   - an assignment's create does NOT place it (its `sectionId` is stored
 *     without the course check or the end-of-unit order), so it is
 *     created at course level and then ATTACHED through the unit
 *     curriculum endpoint (`usePlaceAfterCreate`), which validates, locks
 *     the unit and appends. If that second call fails the assignment is
 *     kept and the toast says where to add it by hand.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/hooks/use-toast';
import type { CourseSection } from '@types';
import { useCourseSections } from './useCourseSections';
import { useAttachUnitItem } from './useUnitCurriculum';
import { NO_UNIT, type PlaceableItemType } from '../components/UnitPickerField';

/** Units in course order (the API does not promise an order). */
export function sortUnits(
  sections: readonly CourseSection[] | undefined
): readonly CourseSection[] {
  return [...(sections ?? [])].sort((a, b) => a.order - b.order);
}

/** The unit a new item goes to unless the author picks another. */
export function defaultUnitId(
  sections: readonly CourseSection[],
  preferredSectionId?: string | null
): string {
  if (
    preferredSectionId &&
    sections.some((section) => section.id === preferredSectionId)
  ) {
    return preferredSectionId;
  }
  return sections[0]?.id ?? NO_UNIT;
}

export interface UseUnitPlacementOptions {
  /** The unit the page was opened from, preselected when it is one of the course's. */
  readonly preferredSectionId?: string | null;
  readonly enabled?: boolean;
}

export interface UnitPlacement {
  /** The course's units, in course order. */
  readonly sections: readonly CourseSection[];
  /** The chosen unit id, or `NO_UNIT`. */
  readonly value: string;
  readonly setValue: (value: string) => void;
  /** The chosen unit, or `null` for "Not in a unit". */
  readonly section: CourseSection | null;
  /** Back to the default (for a dialog that opens again). */
  readonly reset: () => void;
}

export function useUnitPlacement(
  academyId: string,
  courseId: string,
  { preferredSectionId, enabled = true }: UseUnitPlacementOptions = {}
): UnitPlacement {
  const { data } = useCourseSections(academyId, courseId, { enabled });
  const sections = useMemo(() => sortUnits(data?.items), [data?.items]);
  // `null` = untouched: follow the default as the units load.
  const [chosen, setChosen] = useState<string | null>(null);
  const chosenIsValid =
    chosen !== null &&
    (chosen === NO_UNIT || sections.some((section) => section.id === chosen));
  const value = chosenIsValid
    ? chosen
    : defaultUnitId(sections, preferredSectionId);
  return {
    sections,
    value,
    setValue: setChosen,
    section: sections.find((section) => section.id === value) ?? null,
    reset: () => setChosen(null),
  };
}

export type PlaceAfterCreateResult = 'not-placed' | 'placed' | 'failed';

/**
 * Attaches a just-created item to a unit (appended at its end) and says
 * so: "Assignment added to Unit 2." on success; on failure the item is
 * kept and a destructive toast names the unit and where to add it.
 */
export function usePlaceAfterCreate(academyId: string, courseId: string) {
  const { t } = useTranslation();
  const attach = useAttachUnitItem(academyId, courseId);
  const place = async (
    type: PlaceableItemType,
    itemId: string,
    section: CourseSection | null
  ): Promise<PlaceAfterCreateResult> => {
    if (!section) return 'not-placed';
    try {
      await attach.mutateAsync({ sectionId: section.id, type, itemId });
      toast({
        title: t(`course:unitPlacement.attached.${type}`, {
          unit: section.title,
        }),
      });
      return 'placed';
    } catch {
      toast({
        title: t(`course:unitPlacement.attachError.${type}`, {
          unit: section.title,
        }),
        variant: 'destructive',
      });
      return 'failed';
    }
  };
  return { place, isPending: attach.isPending };
}
