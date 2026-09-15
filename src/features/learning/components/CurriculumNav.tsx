/**
 * Curriculum Navigation.
 *
 * Renders a course's sections/lessons as a navigable tree, showing each
 * lesson's progress state. Used both as the persistent desktop sidebar and
 * inside the mobile/tablet drawer — the caller decides the container.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, ClipboardList, HelpCircle, Lock, PlayCircle } from 'lucide-react';
import { cn } from '@utils';
import { useLearningPaths } from '../context/LearningPaths.context';
import type { CourseSection, CurriculumItem, LessonProgressStatus } from '@types';

export interface CurriculumNavProps {
  readonly courseId: string;
  readonly sections: readonly CourseSection[];
  readonly lessonStatusById: ReadonlyMap<string, LessonProgressStatus>;
  readonly currentLessonId?: string;
  readonly onNavigate?: () => void;
}

type CurriculumEntry = Pick<CurriculumItem, 'id' | 'type' | 'title' | 'order'>;

/**
 * The unit's unified sequence when the server provides it (P52), otherwise a
 * lessons-only projection for backward compatibility.
 */
function resolveEntries(section: CourseSection): CurriculumEntry[] {
  if (section.items && section.items.length > 0) {
    return section.items.map((i) => ({
      id: i.id,
      type: i.type,
      title: i.title,
      order: i.order,
    }));
  }
  return section.lessons.map((l) => ({
    id: l.id,
    type: 'lesson' as const,
    title: l.title,
    order: l.order,
  }));
}

const STATUS_ICON = {
  locked: Lock,
  available: Circle,
  in_progress: PlayCircle,
  completed: CheckCircle2,
} as const;

export function CurriculumNav({
  courseId,
  sections,
  lessonStatusById,
  currentLessonId,
  onNavigate,
}: CurriculumNavProps): JSX.Element {
  const { t } = useTranslation();
  const paths = useLearningPaths();

  return (
    <nav aria-label={t('learning:learn.curriculumLabel')} className="space-y-4">
      {sections.map((section, sectionIndex) => (
        <div key={section.id} className="space-y-1.5">
          <h3 className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {sectionIndex + 1}. {section.title}
          </h3>
          <ul className="space-y-0.5">
            {resolveEntries(section)
              .sort((a, b) => a.order - b.order)
              .map((entry) => {
                // Lessons carry progress/lock state; quizzes and assignments
                // are ordinary links in the same unified sequence (P52).
                if (entry.type === 'lesson') {
                  const status = lessonStatusById.get(entry.id) ?? 'available';
                  const Icon = STATUS_ICON[status];
                  const isLocked = status === 'locked';
                  const isCurrent = entry.id === currentLessonId;

                  if (isLocked) {
                    return (
                      <li key={`lesson:${entry.id}`}>
                        <span
                          className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-muted-foreground/60"
                          aria-disabled="true"
                        >
                          <Icon className="size-4 shrink-0" aria-hidden />
                          <span className="truncate">{entry.title}</span>
                          <span className="sr-only">
                            {t('learning:lesson.status.locked')}
                          </span>
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={`lesson:${entry.id}`}>
                      <Link
                        to={paths.lesson(courseId, entry.id)}
                        onClick={onNavigate}
                        aria-current={isCurrent ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors duration-fast ease-standard',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          isCurrent
                            ? 'bg-accent font-medium text-accent-foreground'
                            : 'text-foreground hover:bg-accent/60'
                        )}
                      >
                        <Icon
                          className={cn(
                            'size-4 shrink-0',
                            status === 'completed' && 'text-success'
                          )}
                          aria-hidden
                        />
                        <span className="truncate">{entry.title}</span>
                      </Link>
                    </li>
                  );
                }

                const Icon = entry.type === 'quiz' ? HelpCircle : ClipboardList;
                const to =
                  entry.type === 'quiz'
                    ? paths.quiz(courseId, entry.id)
                    : paths.assignment(courseId, entry.id);
                return (
                  <li key={`${entry.type}:${entry.id}`}>
                    <Link
                      to={to}
                      onClick={onNavigate}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors duration-fast ease-standard',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        'text-foreground hover:bg-accent/60'
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="truncate">{entry.title}</span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
