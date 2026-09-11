/**
 * Instructors Section.
 *
 * Derives its list from the real Course catalog's `instructors` — never a
 * parallel Instructor model (see `Reports/ARCHITECTURE.md`, Prompt 9, "No
 * Course Domain Duplication") — fetched through the public website's own
 * `usePublicCourses` rather than the tenant-scoped `useCourses`; see that
 * hook's own doc comment for why (this section renders on the public
 * marketing site for real visitors with no `OrganizationMembership` in
 * this Academy, and the tenant-scoped hook 403s for exactly that caller).
 */
import { Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@components/feedback';
import { usePublicCourses } from '@hooks';
import {
  useWebsiteCardClass,
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
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
  const { locale } = usePublicWebsiteLocale();
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);

  const { data, isLoading } = usePublicCourses(academyId, {
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
      {(title || description) && (
        <div className="mb-10 space-y-2 text-center">
          {title ? (
            <h2 className={`${heading} text-3xl text-foreground`}>{title}</h2>
          ) : null}
          {description ? (
            <p className="mx-auto max-w-2xl text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : visibleInstructors.length === 0 ? (
        <EmptyState titleKey="website:renderer.noInstructors" icon={Users} />
      ) : (
        // `auto-fit`/`minmax`, not fixed `sm:grid-cols-2 lg:grid-cols-4` —
        // 1-3 configured instructors never reserve empty desktop columns,
        // and 5+ wrap evenly instead of an awkward 4+1 remainder.
        <div className="grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-6">
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
                  <Users
                    className="size-6 text-[var(--website-primary-solid)]"
                    aria-hidden
                  />
                </div>
              )}
              {/* `dir="auto"` — a plain, single-language name (never
                  `LocalizedText`), so it can genuinely be English inside an
                  Arabic page or vice versa; see `FeaturedCoursesSection`'s
                  identical comment for the reproduced ellipsis-position bug
                  this avoids. */}
              <p
                className="mt-3 truncate font-medium text-foreground"
                dir="auto"
              >
                {instructor.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
