/**
 * Featured Courses Section.
 *
 * Reads the real Course catalog through the public website's own
 * `usePublicCourses` (`@features/public-website`) — never a duplicate
 * course projection (same `Course`/`CourseResponse` shape the tenant-scoped
 * `useCourses` returns, see `Reports/ARCHITECTURE.md`, Prompt 9, "No Course
 * Domain Duplication"), but a public-safe transport: this section renders
 * on the public marketing site for real visitors with no `OrganizationMembership`
 * in this Academy, and the tenant-scoped `useCourses` 403s for exactly that
 * caller (reproduced live — see `usePublicCourses`'s own doc comment).
 */
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@components/feedback';
import { formatCoursePricing } from '@features/course';
import { usePublicCourses } from '@features/public-website/hooks';
import {
  useWebsiteCardClass,
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
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
  const { locale } = usePublicWebsiteLocale();

  const { data, isLoading } = usePublicCourses(academyId, {
    query: { pagination: { page: 1, pageSize: config.count } },
  });

  const courses =
    config.mode === 'selected' && config.courseIds
      ? (data?.items ?? []).filter((course) => config.courseIds!.includes(course.id))
      : (data?.items ?? []);

  return (
    <section className={`${container} ${section}`}>
      <div className="mb-10 space-y-2 text-center">
        <h2 className={`${heading} text-3xl text-foreground`}>{resolveLocalizedText(config.title, locale)}</h2>
        {config.description ? (
          <p className="mx-auto max-w-2xl text-muted-foreground">{resolveLocalizedText(config.description, locale)}</p>
        ) : null}
      </div>

      {isLoading ? (
        <div className={`grid gap-6 ${config.layout === 'carousel' ? 'grid-flow-col auto-cols-[16rem] overflow-x-auto' : 'grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]'}`}>
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
              // `auto-fit`/`minmax` instead of fixed `sm:grid-cols-2 lg:grid-cols-3`:
              // column count follows the REAL number of courses at every
              // width (1 course never awkwardly stretches to fill 3 empty
              // slots; 5 never wrap 4+1) — a single rule that is correct at
              // every viewport, not three fixed tiers with gaps between them.
              : 'grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]'
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
              {/* `dir="auto"` — `course.title`/`.shortDescription`/instructor
                  name are plain, single-language strings an Owner typed
                  once (never `LocalizedText`, unlike section copy), so they
                  can genuinely be English inside an Arabic page or vice
                  versa. Without this, a `line-clamp` truncation on Latin
                  text inside an inherited `dir="rtl"` block places its
                  ellipsis at the start of the visual line instead of the
                  end (reproduced live: "The Complete Advanced Full-
                  …Stack Web Development" instead of "...Development…") —
                  `dir="auto"` lets the browser detect each string's own
                  script instead of blindly inheriting the page direction. */}
              <h3 className="line-clamp-2 font-medium text-foreground" dir="auto">{course.title}</h3>
              {course.shortDescription ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground" dir="auto">
                  {course.shortDescription}
                </p>
              ) : null}
              <div className="mt-4 flex items-center justify-between gap-2 text-sm">
                {config.showInstructor && course.instructors[0] ? (
                  <span className="min-w-0 truncate text-muted-foreground" dir="auto">{course.instructors[0].name}</span>
                ) : (
                  <span />
                )}
                {config.showPrice ? (
                  <span className="shrink-0 font-medium text-foreground">
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
