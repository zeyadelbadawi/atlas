/**
 * Course Details Template.
 *
 * The `coreType: 'courseDetails'` page is NOT composed of sections — it is
 * a fixed marketing template driven entirely by the existing Course
 * domain (`useCourse`, `@features/course`, Prompt 3C). This is
 * deliberate: Course Details reuses Course Management's real data rather
 * than duplicating a "WebsiteCourse" projection (see
 * `Reports/ARCHITECTURE.md`, Prompt 9, "No Course Domain Duplication").
 */
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { useCourse, formatCoursePricing } from '@features/course';
import { useWebsiteContainerClass, useWebsiteHeadingClass } from './renderer-style.utils';

export interface CourseDetailsTemplateProps {
  readonly academyId: string;
  readonly courseId: string;
}

export function CourseDetailsTemplate({
  academyId,
  courseId,
}: CourseDetailsTemplateProps): JSX.Element {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const heading = useWebsiteHeadingClass();
  const { data: course, isLoading, error, refetch } = useCourse(academyId, courseId);

  if (isLoading) {
    return (
      <div className={`${container} space-y-6 py-16`}>
        <Skeleton className="aspect-video w-full" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className={`${container} py-16`}>
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <article className={`${container} space-y-8 py-16`}>
      {course.thumbnail ? (
        <img
          src={course.thumbnail}
          alt=""
          className="aspect-video w-full object-cover"
          style={{ borderRadius: 'var(--website-radius)' }}
        />
      ) : (
        <div
          className="flex aspect-video w-full items-center justify-center bg-[var(--website-primary-surface)]"
          style={{ borderRadius: 'var(--website-radius)' }}
        >
          <BookOpen className="size-10 text-[var(--website-primary-solid)]" aria-hidden />
        </div>
      )}

      <div className="space-y-3">
        {course.category ? (
          <p className="text-sm font-medium text-[var(--website-primary-solid)]">
            {course.category.name}
          </p>
        ) : null}
        <h1 className={`${heading} text-3xl text-foreground sm:text-4xl`}>{course.title}</h1>
        <p className="text-lg font-medium text-foreground">
          {formatCoursePricing(course.pricing, t)}
        </p>
      </div>

      {course.description ? (
        <p className="max-w-prose whitespace-pre-line text-base leading-relaxed text-muted-foreground">
          {course.description}
        </p>
      ) : null}

      {course.instructors.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            {t('website:renderer.instructorsLabel')}
          </p>
          <div className="flex flex-wrap gap-4">
            {course.instructors.map((instructor) => (
              <span key={instructor.id} className="text-sm text-muted-foreground">
                {instructor.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}
