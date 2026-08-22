/**
 * Instructors Section.
 *
 * Derives its list from the existing Academy-scoped Course catalog's
 * `instructors` — never a parallel Instructor model (see
 * `Reports/ARCHITECTURE.md`, Prompt 9, "No Course Domain Duplication").
 */
import { Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@components/feedback';
import { useCourses } from '@features/course';
import {
  useWebsiteCardClass,
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import type { CourseInstructorSummary, InstructorsSectionConfig } from '@types';

export interface InstructorsSectionProps {
  readonly config: InstructorsSectionConfig;
  readonly academyId: string;
}

export function InstructorsSection({
  config,
  academyId,
}: InstructorsSectionProps): JSX.Element {
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const cardClass = useWebsiteCardClass();

  const { data, isLoading } = useCourses(academyId, {
    query: { pagination: { page: 1, pageSize: 50 } },
  });

  const instructors: CourseInstructorSummary[] = [];
  const seenIds = new Set<string>();
  for (const course of data?.items ?? []) {
    for (const instructor of course.instructors) {
      if (!seenIds.has(instructor.id)) {
        seenIds.add(instructor.id);
        instructors.push(instructor);
      }
    }
  }
  const visibleInstructors = instructors.slice(0, config.count);

  return (
    <section className={`${container} ${section}`}>
      {(config.title || config.description) && (
        <div className="mb-10 space-y-2 text-center">
          {config.title ? <h2 className={`${heading} text-3xl text-foreground`}>{config.title}</h2> : null}
          {config.description ? (
            <p className="mx-auto max-w-2xl text-muted-foreground">{config.description}</p>
          ) : null}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : visibleInstructors.length === 0 ? (
        <EmptyState titleKey="website:renderer.noInstructors" icon={Users} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {visibleInstructors.map((instructor) => (
            <div key={instructor.id} className={`${cardClass} text-center`}>
              {instructor.avatar ? (
                <img
                  src={instructor.avatar}
                  alt=""
                  className="mx-auto size-16 rounded-full object-cover"
                />
              ) : (
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[var(--website-primary-surface)]">
                  <Users className="size-6 text-[var(--website-primary-solid)]" aria-hidden />
                </div>
              )}
              <p className="mt-3 font-medium text-foreground">{instructor.name}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
