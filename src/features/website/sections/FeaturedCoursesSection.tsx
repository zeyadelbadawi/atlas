/**
 * Featured Courses Section.
 *
 * Reads the EXISTING Academy-scoped Course catalog through `useCourses`
 * (`@features/course`, Prompt 3C) — never a duplicate course projection
 * (see `Reports/ARCHITECTURE.md`, Prompt 9, "No Course Domain
 * Duplication").
 */
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@components/feedback';
import { useCourses, formatCoursePricing } from '@features/course';
import {
  useWebsiteCardClass,
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import type { FeaturedCoursesSectionConfig } from '@types';

export interface FeaturedCoursesSectionProps {
  readonly config: FeaturedCoursesSectionConfig;
  readonly academyId: string;
}

export function FeaturedCoursesSection({
  config,
  academyId,
}: FeaturedCoursesSectionProps): JSX.Element {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const cardClass = useWebsiteCardClass();

  const { data, isLoading } = useCourses(academyId, {
    query: {
      pagination: { page: 1, pageSize: config.count },
      filters: { status: 'published', visibility: 'public' },
    },
  });

  const courses =
    config.mode === 'selected' && config.courseIds
      ? (data?.items ?? []).filter((course) => config.courseIds!.includes(course.id))
      : (data?.items ?? []);

  return (
    <section className={`${container} ${section}`}>
      <div className="mb-10 space-y-2 text-center">
        <h2 className={`${heading} text-3xl text-foreground`}>{config.title}</h2>
        {config.description ? (
          <p className="mx-auto max-w-2xl text-muted-foreground">{config.description}</p>
        ) : null}
      </div>

      {isLoading ? (
        <div className={`grid gap-6 ${config.layout === 'carousel' ? 'grid-flow-col auto-cols-[16rem] overflow-x-auto' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState titleKey="website:renderer.noCourses" icon={BookOpen} />
      ) : (
        <div
          className={`grid gap-6 ${
            config.layout === 'carousel'
              ? 'grid-flow-col auto-cols-[16rem] overflow-x-auto pb-2'
              : 'sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {courses.map((course) => (
            <article key={course.id} className={cardClass}>
              {course.thumbnail ? (
                <img
                  src={course.thumbnail}
                  alt=""
                  className="mb-4 aspect-video w-full object-cover"
                  style={{ borderRadius: 'var(--website-radius)' }}
                />
              ) : (
                <div
                  className="mb-4 flex aspect-video w-full items-center justify-center bg-[var(--website-primary-surface)]"
                  style={{ borderRadius: 'var(--website-radius)' }}
                >
                  <BookOpen className="size-8 text-[var(--website-primary-solid)]" aria-hidden />
                </div>
              )}
              <h3 className="font-medium text-foreground">{course.title}</h3>
              {course.shortDescription ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {course.shortDescription}
                </p>
              ) : null}
              <div className="mt-4 flex items-center justify-between text-sm">
                {config.showInstructor && course.instructors[0] ? (
                  <span className="text-muted-foreground">{course.instructors[0].name}</span>
                ) : (
                  <span />
                )}
                {config.showPrice ? (
                  <span className="font-medium text-foreground">
                    {formatCoursePricing(course.pricing, t)}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
