/**
 * Features-page figure for the "Courses and learning" group — the real Atlas
 * course hierarchy (Course → Sections → Lessons/Quizzes/Assignments), drawn
 * from tokens rather than a fabricated product screenshot. Same rationale and
 * technique as `PlatformStructureFigure` (see its header comment): no numbers,
 * real tokens only, CSS logical properties so it flips correctly under RTL.
 */
import { BookOpen, ClipboardCheck, FileQuestion } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CourseLeaf {
  readonly id: string;
  readonly icon: LucideIcon;
}

const COURSE_LEAVES: readonly CourseLeaf[] = [
  { id: 'lessons', icon: BookOpen },
  { id: 'quizzes', icon: FileQuestion },
  { id: 'assignments', icon: ClipboardCheck },
];

export function CourseStructureFigure(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <BookOpen className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <span className="min-w-0 truncate font-display text-sm font-semibold text-foreground">
          {t('features:groups.lms.figure.course')}
        </span>
      </div>

      <div className="relative mt-3 ps-5">
        <span
          className="absolute inset-y-0 start-2 w-px bg-border"
          aria-hidden
        />
        <ul className="space-y-2.5">
          {COURSE_LEAVES.map((leaf) => (
            <li key={leaf.id} className="relative">
              <span
                className="absolute -start-3 top-1/2 h-px w-3 bg-border"
                aria-hidden
              />
              <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-3">
                <leaf.icon
                  className="size-4 shrink-0 text-muted-foreground"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="truncate text-sm text-foreground">
                  {t(`features:groups.lms.figure.${leaf.id}`)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
