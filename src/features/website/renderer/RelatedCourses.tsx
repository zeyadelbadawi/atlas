/**
 * RelatedCourses — the "related courses" grid on the Course Details page
 * (P64 Phase 4). Reads the public, same-academy recommendations
 * (`usePublicCourseRecommendations`, same-category first) and links each
 * card to its own details page via the caller's locale/preview-aware
 * `buildHref`. Renders nothing when there are no recommendations.
 */
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import { formatCoursePricing } from '@features/course';
import { usePublicCourseRecommendations } from '@hooks';
import { useWebsiteCardClass } from './renderer-style.utils';

export interface RelatedCoursesProps {
  readonly academyId: string;
  readonly courseId: string;
  /** Locale/preview-aware href builder from the parent template. */
  readonly buildHref: (path: string) => string;
  /** Real navigation only exists on the live public site (absent in the editor preview). */
  readonly navigate?: (href: string) => void;
}

export function RelatedCourses({
  academyId,
  courseId,
  buildHref,
  navigate,
}: RelatedCoursesProps): JSX.Element | null {
  const { t } = useTranslation();
  const cardClass = useWebsiteCardClass();
  const { data } = usePublicCourseRecommendations(academyId, courseId);

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4" aria-labelledby="related-courses-heading">
      <h2
        id="related-courses-heading"
        className="text-lg font-semibold text-foreground"
      >
        {t('website:renderer.courseDetails.relatedTitle')}
      </h2>
      <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
        {data.map((course) => {
          const href = buildHref(`/courses/${course.id}`);
          const body = (
            <>
              {course.thumbnail ? (
                <img
                  src={course.thumbnail}
                  alt=""
                  className="mb-3 aspect-video w-full object-cover"
                  style={{ borderRadius: 'var(--website-radius)' }}
                />
              ) : (
                <div
                  className="mb-3 flex aspect-video w-full items-center justify-center bg-[var(--website-primary-surface)]"
                  style={{ borderRadius: 'var(--website-radius)' }}
                >
                  <BookOpen
                    className="size-8 text-[var(--website-primary-solid)]"
                    aria-hidden
                  />
                </div>
              )}
              <h3 className="line-clamp-2 font-medium text-foreground">
                {course.title}
              </h3>
              <p className="mt-1 text-sm text-[var(--website-primary-solid)]">
                {formatCoursePricing(course.pricing, t)}
              </p>
            </>
          );
          // Navigable on the live site; an inert card in the editor preview
          // (matches FeaturedCoursesSection's linkRenderer-absent behaviour).
          return navigate ? (
            <a
              key={course.id}
              href={href}
              onClick={(e) => {
                e.preventDefault();
                navigate(href);
              }}
              className={`${cardClass} block text-start no-underline transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            >
              {body}
            </a>
          ) : (
            <article key={course.id} className={cardClass}>
              {body}
            </article>
          );
        })}
      </div>
    </section>
  );
}
