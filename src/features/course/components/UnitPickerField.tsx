/**
 * Unit placement for a new quiz or assignment — the ONE "Place in unit"
 * field every create path uses (the quiz editor page, the assignments
 * page, and the course wizard's quiz sheet and assignment dialog).
 *
 * A Select of the course's units in course order plus "Not in a unit",
 * with help text for the item type. Hidden when the course has no units:
 * there is nothing to choose, and the item stays course-level as before.
 *
 * `UnitPlacementNote` is its read-only twin for EDIT mode: it says which
 * unit the item is in. Moving an item between units stays in the course
 * builder (detach, then add to the other unit).
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { CourseSection } from '@types';

/** "Not in a unit" — Radix `Select` rejects an empty item value. */
export const NO_UNIT = '__none__';

/** The item types a unit can hold besides lessons. */
export type PlaceableItemType = 'quiz' | 'assignment';

export interface UnitPickerFieldProps {
  /** The course's units, in course order. */
  readonly sections: readonly CourseSection[];
  /** A unit id, or `NO_UNIT`. */
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly itemType: PlaceableItemType;
  readonly disabled?: boolean;
  readonly className?: string;
}

export function UnitPickerField({
  sections,
  value,
  onChange,
  itemType,
  disabled = false,
  className,
}: UnitPickerFieldProps): JSX.Element | null {
  const { t } = useTranslation();
  const fieldId = useId();
  const helpId = `${fieldId}-help`;
  if (sections.length === 0) return null;
  return (
    <div
      className={cn('space-y-2 rounded-lg border border-border p-4', className)}
      data-testid="unit-picker"
    >
      <Label htmlFor={fieldId}>{t('course:unitPlacement.label')}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={fieldId} aria-describedby={helpId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sections.map((section) => (
            <SelectItem key={section.id} value={section.id}>
              {section.title}
            </SelectItem>
          ))}
          <SelectItem value={NO_UNIT}>
            {t('course:unitPlacement.none')}
          </SelectItem>
        </SelectContent>
      </Select>
      <p id={helpId} className="text-xs text-muted-foreground">
        {t(`course:unitPlacement.help.${itemType}`)}
      </p>
    </div>
  );
}

export interface UnitPlacementNoteProps {
  readonly sections: readonly CourseSection[];
  /** The unit the item is in, if any. */
  readonly sectionId?: string | null;
  readonly className?: string;
}

/** Read-only: which unit an existing quiz/assignment is in. */
export function UnitPlacementNote({
  sections,
  sectionId,
  className,
}: UnitPlacementNoteProps): JSX.Element | null {
  const { t } = useTranslation();
  const unit = sectionId
    ? sections.find((section) => section.id === sectionId)
    : undefined;
  // Placed, but the units have not loaded yet: say nothing rather than
  // "not in a unit" for a moment.
  if (sectionId && !unit) return null;
  return (
    <div
      className={cn('space-y-1 text-sm', className)}
      data-testid="unit-placement-note"
    >
      <p className="font-medium text-foreground">
        {t('course:unitPlacement.current.label')}
      </p>
      <p className="text-muted-foreground">
        {unit ? unit.title : t('course:unitPlacement.current.none')}
      </p>
    </div>
  );
}
