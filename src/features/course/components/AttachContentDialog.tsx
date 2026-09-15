/**
 * Picks an existing course-level quiz or assignment to add to a unit (P52).
 *
 * The builder composes existing content into a unit — it does not create a
 * quiz/assignment here (those keep their own authoring pages). This dialog
 * lists the course's quizzes/assignments of one type that are not already in
 * THIS unit, and attaches the chosen one to the end of the unit's sequence.
 */
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Boxes } from 'lucide-react';
import type { AvailableCurriculumItem } from '@types';

export interface AttachContentDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly type: 'quiz' | 'assignment';
  readonly sectionId: string;
  readonly available: readonly AvailableCurriculumItem[];
  readonly isAttaching: boolean;
  readonly onAttach: (itemId: string) => void;
}

export function AttachContentDialog({
  open,
  onOpenChange,
  type,
  sectionId,
  available,
  isAttaching,
  onAttach,
}: AttachContentDialogProps): JSX.Element {
  const { t } = useTranslation();

  // Only content of the chosen type that is NOT already in this unit.
  const candidates = available.filter(
    (item) => item.type === type && item.sectionId !== sectionId,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {type === 'quiz'
              ? t('course:builder.attach.quizTitle')
              : t('course:builder.attach.assignmentTitle')}
          </DialogTitle>
        </DialogHeader>

        {candidates.length === 0 ? (
          <EmptyState
            icon={Boxes}
            titleKey="course:builder.attach.emptyTitle"
            descriptionKey="course:builder.attach.emptyDescription"
            className="py-6"
          />
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {candidates.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {item.title}
                  </span>
                  <StatusBadge
                    labelKey={
                      item.status === 'published'
                        ? 'course:status.published'
                        : 'course:status.draft'
                    }
                    tone={item.status === 'published' ? 'success' : 'neutral'}
                  />
                  {item.sectionId ? (
                    <span className="text-xs text-muted-foreground">
                      {t('course:builder.attach.inAnotherUnit')}
                    </span>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isAttaching}
                  onClick={() => onAttach(item.id)}
                >
                  {t('course:builder.attach.addAction')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
