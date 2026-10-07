/**
 * Course Spotlight Section — the shared, theme-neutral renderer of the
 * `courseSpotlight` type (Theme 4 plan §6): one real course's outcomes and
 * syllabus, its facts and an action. Every theme without its own design
 * of the type draws this one, so the section a Riwaq Academy added still
 * renders after a theme switch.
 *
 * Only real data (`useCourseSpotlight`). On the public site a course that
 * is missing, unpublished or private hides the whole section; in the
 * editor's preview (no `linkRenderer`) a short note says why it is empty,
 * so the Owner isn't left guessing.
 */
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@components/feedback';
import { formatCoursePricing } from '@features/course';
import {
  useWebsiteCardClass,
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import {
  isExternalHref,
  resolveWebsiteCtaHref,
} from '../utils/link-resolution.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import { useCourseSpotlight } from './useCourseSpotlight';
import type { CourseSpotlightSectionConfig, WebsitePage } from '@types';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';

export interface CourseSpotlightSectionProps {
  readonly config: CourseSpotlightSectionConfig;
  readonly academyId: string;
  readonly pages: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
}

export function CourseSpotlightSection({
  config,
  academyId,
  pages,
  linkRenderer,
}: CourseSpotlightSectionProps): JSX.Element | null {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const cardClass = useWebsiteCardClass();
  const { locale } = usePublicWebsiteLocale();
  const { course, sections, totalSections, totalLessons, isLoading } =
    useCourseSpotlight(config, academyId);

  if (isLoading) {
    return (
      <section className={`${container} ${section}`} aria-busy="true">
        <Skeleton className="h-72 w-full" />
      </section>
    );
  }
  if (!course) {
    if (linkRenderer) return null;
    return (
      <section className={`${container} ${section}`}>
        <EmptyState
          titleKey="website:renderer.courseSpotlight.unavailable"
          icon={BookOpen}
        />
      </section>
    );
  }

  const eyebrow = resolveLocalizedText(config.eyebrow, locale);
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);
  const outcomes = config.showOutcomes ? (course.outcomes ?? []) : [];
  const courseHref = `/courses/${course.id}`;
  const ctaLabel = config.cta
    ? resolveLocalizedText(config.cta.label, locale)
    : t('website:renderer.courseSpotlight.viewCourse');
  const ctaHref = config.cta
    ? resolveWebsiteCtaHref(config.cta, pages)
    : courseHref;
  const remaining = totalSections - sections.length;

  return (
    <section className={`${container} ${section}`}>
      <div className="mb-8 max-w-2xl space-y-2">
        {eyebrow ? (
          <p className="text-sm font-medium text-[var(--website-primary-solid)]">
            {eyebrow}
          </p>
        ) : null}
        {title ? (
          <h2 className={`${heading} break-words text-3xl text-foreground`}>
            {title}
          </h2>
        ) : null}
        {description ? (
          <p className="text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className={`grid gap-8 md:grid-cols-2 ${cardClass}`}>
        <div className="min-w-0 space-y-4">
          <h3
            className={`${heading} break-words text-2xl text-foreground`}
            dir="auto"
          >
            {course.title}
          </h3>
          {course.shortDescription ? (
            <p className="text-muted-foreground" dir="auto">
              {course.shortDescription}
            </p>
          ) : null}
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {course.level ? (
              <div>
                <dt className="sr-only">
                  {t('website:renderer.courseSpotlight.levelLabel')}
                </dt>
                <dd className="text-foreground">
                  {t(`website:renderer.courseDetails.level.${course.level}`)}
                </dd>
              </div>
            ) : null}
            {totalLessons > 0 ? (
              <div>
                <dt className="sr-only">
                  {t('website:renderer.courseSpotlight.lessonsLabel')}
                </dt>
                <dd className="text-foreground">
                  {t('website:renderer.courseDetails.lessonCount', {
                    count: totalLessons,
                  })}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="sr-only">
                {t('website:renderer.courseSpotlight.priceLabel')}
              </dt>
              <dd className="font-medium text-foreground">
                {formatCoursePricing(course.pricing, t)}
              </dd>
            </div>
          </dl>
          {outcomes.length > 0 ? (
            <div>
              <h4 className="mb-2 font-medium text-foreground">
                {t('website:renderer.courseDetails.outcomesTitle')}
              </h4>
              <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
                {outcomes.map((outcome, index) => (
                  <li key={index} dir="auto">
                    {outcome}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {ctaLabel ? (
            linkRenderer && ctaHref ? (
              <Button asChild>
                {linkRenderer({
                  href: ctaHref,
                  external: isExternalHref(ctaHref),
                  children: ctaLabel,
                })}
              </Button>
            ) : (
              <Button>{ctaLabel}</Button>
            )
          ) : null}
        </div>
        {sections.length > 0 ? (
          <div className="min-w-0">
            <h4 className="mb-3 font-medium text-foreground">
              {t('website:renderer.courseDetails.curriculumTitle')}
            </h4>
            <ol className="divide-y divide-border text-sm">
              {sections.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-baseline justify-between gap-4 py-2"
                >
                  <span className="min-w-0 break-words text-foreground">
                    <span aria-hidden className="me-2 text-muted-foreground">
                      {(index + 1).toLocaleString(
                        locale === 'ar' ? 'ar-EG' : 'en-US'
                      )}
                    </span>
                    <span dir="auto">{item.title}</span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {t('website:renderer.courseDetails.lessonCount', {
                      count: item.lessons.length,
                    })}
                  </span>
                </li>
              ))}
            </ol>
            {remaining > 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {t('website:renderer.courseSpotlight.moreSections', {
                  count: remaining,
                })}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
