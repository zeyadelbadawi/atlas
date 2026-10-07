/**
 * Riwaq's programme sheet: a course as a ruled row of the prospectus — its
 * photograph (or Riwaq's `course-fallback`), the department, the title, the
 * faculty, a spec line (level · lessons · duration) and the price. The
 * catalogue and the related programmes use it; on the public site the
 * whole sheet is one link and its photograph develops on hover.
 */
import { useTranslation } from 'react-i18next';
import { formatCoursePricing } from '@features/course';
import { formatCatalogDuration } from '@/features/website/sections/CourseCatalogSection';
import type { Course } from '@types';
import type { WebsiteLinkRenderer } from '@/features/website/renderer/website-link-renderer.types';
import { RIWAQ_COURSE_FALLBACK, RiwaqArrow, RiwaqWindow } from '../riwaq-parts';
import '../riwaq-pages.css';

const SHEET_SIZES = '(min-width: 1024px) 22vw, (min-width: 640px) 34vw, calc(100vw - 2rem)';

function SheetBody({ course }: { readonly course: Course }): JSX.Element {
  const { t } = useTranslation();
  const instructor = course.instructors[0]?.name;
  const lessons = course.stats?.totalLessons ?? 0;
  const specs = [
    course.level ? t(`website:renderer.courseDetails.level.${course.level}`) : null,
    lessons > 0 ? t('website:renderer.courseDetails.lessonCount', { count: lessons }) : null,
    formatCatalogDuration(course.stats?.durationSeconds, t),
  ].filter(Boolean);
  return (
    <>
      <RiwaqWindow
        value={course.thumbnail || RIWAQ_COURSE_FALLBACK}
        alt=""
        sizes={SHEET_SIZES}
        className="rwp-sheet-window aspect-[3/2]"
      />
      <span className="rwp-sheet-body">
        {course.category?.name ? (
          <span className="rw-label" dir="auto">
            {course.category.name}
          </span>
        ) : null}
        <h3 className="rw-subtitle rwp-sheet-title" dir="auto">
          {course.title}
        </h3>
        {instructor ? (
          <span className="rw-body rwp-sheet-by" dir="auto">
            {t('website:riwaq.pages.catalog.by', { name: instructor })}
          </span>
        ) : null}
        {specs.length > 0 ? (
          <span className="rw-label rw-num rwp-sheet-specs">{specs.join(' · ')}</span>
        ) : null}
      </span>
      <span className="rwp-sheet-end">
        <span className="rwp-sheet-price rw-num">{formatCoursePricing(course.pricing, t)}</span>
        <RiwaqArrow className="size-5" />
      </span>
    </>
  );
}

export function RiwaqCourseSheet({
  course,
  linkRenderer,
}: {
  readonly course: Course;
  readonly linkRenderer?: WebsiteLinkRenderer;
}): JSX.Element {
  const body = <SheetBody course={course} />;
  if (linkRenderer) {
    return linkRenderer({
      href: `/courses/${course.id}`,
      external: false,
      className: 'rwp-sheet',
      children: body,
    });
  }
  return <article className="rwp-sheet">{body}</article>;
}

/** Mirrors a sheet's shape, so swapping it for content moves nothing. */
export function RiwaqCourseSheetSkeleton(): JSX.Element {
  return (
    <div aria-hidden className="rwp-sheet">
      <span className="rw-skeleton rwp-sheet-window aspect-[3/2]" />
      <span className="rwp-sheet-body">
        <span className="rw-skeleton h-3 w-1/4" />
        <span className="rw-skeleton h-6 w-4/5" />
        <span className="rw-skeleton h-4 w-1/2" />
      </span>
    </div>
  );
}
