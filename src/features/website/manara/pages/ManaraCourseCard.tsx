/**
 * Manara's poster card (Reports/THEME_3_MANARA_PLAN.md §3.7 "Cards"): the
 * course's picture (or Manara's `course-fallback`) with a slanted bottom
 * edge and the level pill on it, the category, a bold title, the teacher,
 * and the price pill with an arrow. The catalogue grid and the related
 * courses use it; on the public site the whole card is one link.
 */
import { useTranslation } from 'react-i18next';
import { formatCoursePricing } from '@features/course';
import type { Course } from '@types';
import type { WebsiteLinkRenderer } from '@/features/website/renderer/website-link-renderer.types';
import { ManaraArrow, ManaraMedia, ManaraPill } from '../manara-parts';
import '../manara-pages.css';

const COURSE_FALLBACK = 'theme-asset:manara/course-fallback';

/** How wide a card's picture renders per breakpoint (3 / 2 / 1 columns). */
const CARD_SIZES =
  '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, calc(100vw - 2rem)';

function CardBody({ course }: { readonly course: Course }): JSX.Element {
  const { t } = useTranslation();
  const instructor = course.instructors[0]?.name;
  return (
    <>
      <ManaraMedia
        value={course.thumbnail || COURSE_FALLBACK}
        alt=""
        shape="slant"
        sizes={CARD_SIZES}
        className="aspect-[3/2] w-full"
      >
        {course.level ? (
          <ManaraPill tone="accent" className="mnp-card-level">
            {t(`website:renderer.courseDetails.level.${course.level}`)}
          </ManaraPill>
        ) : null}
      </ManaraMedia>
      <div className="mnp-card-body">
        {course.category?.name ? (
          <p className="mn-label mn-muted" dir="auto">
            {course.category.name}
          </p>
        ) : null}
        <h3 className="mn-subtitle mnp-card-title" dir="auto">
          {course.title}
        </h3>
        {instructor ? (
          <p className="mn-muted text-sm" dir="auto">
            {t('website:manara.pages.catalog.by', { name: instructor })}
          </p>
        ) : null}
        <div className="mnp-card-foot">
          <ManaraPill tone="block">
            <span data-atlas-numeric="true">
              {formatCoursePricing(course.pricing, t)}
            </span>
          </ManaraPill>
          <ManaraArrow className="size-5" />
        </div>
      </div>
    </>
  );
}

export function ManaraCourseCard({
  course,
  linkRenderer,
}: {
  readonly course: Course;
  readonly linkRenderer?: WebsiteLinkRenderer;
}): JSX.Element {
  const body = <CardBody course={course} />;
  if (linkRenderer) {
    return linkRenderer({
      href: `/courses/${course.id}`,
      external: false,
      className: 'mn-card mnp-course-card',
      children: body,
    });
  }
  return <article className="mn-card mnp-course-card">{body}</article>;
}

/** Mirrors a card's shape, so swapping it for content moves nothing. */
export function ManaraCourseCardSkeleton(): JSX.Element {
  return (
    <div aria-hidden className="mn-card mnp-course-card mnp-card-skeleton">
      <span className="mnp-skeleton aspect-[3/2] w-full rounded-none" />
      <span className="mnp-card-body">
        <span className="mnp-skeleton h-3 w-1/4" />
        <span className="mnp-skeleton h-6 w-4/5" />
        <span className="mnp-skeleton h-4 w-1/2" />
        <span className="mnp-card-foot">
          <span className="mnp-skeleton h-7 w-16 rounded-full" />
        </span>
      </span>
    </div>
  );
}
