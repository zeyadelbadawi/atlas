/**
 * Riwaq Course Spotlight — Programme in focus (plan §4 #5, §6). One real
 * course, set like a prospectus page: its photograph, title and facts on
 * the start side; what learners will be able to do and its syllabus
 * (sections and lesson counts from the public curriculum) on the end side;
 * the enrolment action.
 *
 * Only real data (`useCourseSpotlight`). A missing, unpublished or private
 * course hides the section publicly; a preview says why it is empty.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCoursePricing } from '@features/course';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import { resolveWebsiteCtaHref } from '@/features/website/utils/link-resolution.utils';
import { useCourseSpotlight } from '@/features/website/sections/useCourseSpotlight';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import {
  RIWAQ_COURSE_FALLBACK,
  RiwaqArrow,
  RiwaqBand,
  RiwaqLink,
  RiwaqSectionHead,
  RiwaqWindow,
  formatRiwaqIndex,
} from '../riwaq-parts';
import { RiwaqPreviewNote } from './riwaq-section-utils';
import '../riwaq-sections.css';

export function RiwaqSpotlight({
  config,
  academyId,
  pages,
  linkRenderer,
}: SectionRenderProps<'courseSpotlight'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const { course, sections, totalSections, totalLessons, isLoading } =
    useCourseSpotlight(config, academyId);

  if (isLoading) {
    return (
      <RiwaqBand ground="stone" label={t('website:riwaq.home.spotlight.loading')}>
        <span aria-hidden className="rw-skeleton block h-80 w-full" />
      </RiwaqBand>
    );
  }
  if (!course) {
    return linkRenderer ? null : (
      <RiwaqPreviewNote>
        {t('website:renderer.courseSpotlight.unavailable')}
      </RiwaqPreviewNote>
    );
  }

  const title = resolveLocalizedText(config.title, locale);
  const outcomes = config.showOutcomes ? (course.outcomes ?? []).filter(Boolean) : [];
  const remaining = totalSections - sections.length;
  const ctaLabel = config.cta ? resolveLocalizedText(config.cta.label, locale) : '';
  const ctaHref = config.cta
    ? linkRenderer
      ? resolveWebsiteCtaHref(config.cta, pages)
      : undefined
    : `/courses/${course.id}`;
  const facts = [
    course.level
      ? t(`website:renderer.courseDetails.level.${course.level}`)
      : null,
    totalLessons > 0
      ? t('website:renderer.courseDetails.lessonCount', { count: totalLessons })
      : null,
    totalSections > 0
      ? t('website:renderer.courseDetails.sectionCount', { count: totalSections })
      : null,
    course.certificatesEnabled
      ? t('website:riwaq.home.courses.facts.certificateIncluded')
      : null,
  ].filter((fact): fact is string => !!fact);

  return (
    <RiwaqBand ground="stone" labelledBy={title ? headingId : undefined} label={title ? undefined : course.title}>
      <RiwaqSectionHead
        id={headingId}
        label={resolveLocalizedText(config.eyebrow, locale)}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
      />
      <div className="rw-grid rwsp" data-spotlight="">
        <article className="rw-cell rwsp-card" data-tick="">
          <RiwaqWindow
            shutter
            develop
            value={course.thumbnail || RIWAQ_COURSE_FALLBACK}
            alt=""
            sizes="(min-width: 1024px) 34vw, 100vw"
            className="aspect-[3/2]"
          />
          <h3 className="rw-subtitle rwsp-title" dir="auto">
            {course.title}
          </h3>
          {course.shortDescription ? (
            <p className="rw-body" dir="auto">
              {course.shortDescription}
            </p>
          ) : null}
          {facts.length > 0 ? (
            <ul className="rw-specs">
              {facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          ) : null}
          <div className="rwsp-foot">
            <p className="rwsp-price rw-num">{formatCoursePricing(course.pricing, t)}</p>
            <RiwaqLink href={ctaHref} linkRenderer={linkRenderer} className="rw-btn">
              <span>
                {ctaLabel || t('website:riwaq.home.spotlight.view')}
                {ctaLabel ? null : <span className="rw-sr-only">: {course.title}</span>}
              </span>
              <RiwaqArrow />
            </RiwaqLink>
          </div>
        </article>

        {outcomes.length > 0 || sections.length > 0 ? (
          <div className="rwsp-detail">
            {outcomes.length > 0 ? (
              <div>
                <h4 className="rw-label" data-mark="">
                  {t('website:renderer.courseDetails.outcomesTitle')}
                </h4>
                <ul className="rwsp-outcomes">
                  {outcomes.map((outcome, index) => (
                    <li key={index} dir="auto">
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {sections.length > 0 ? (
              <div>
                <h4 className="rw-label" data-mark="">
                  {t('website:riwaq.home.spotlight.syllabus')}
                </h4>
                <ol className="rwsp-syllabus">
                  {sections.map((section, index) => (
                    <li key={section.id}>
                      <span aria-hidden className="rw-label rw-num">
                        {formatRiwaqIndex(index, locale)}
                      </span>
                      <span className="rwsp-syllabus-title" dir="auto">
                        {section.title}
                      </span>
                      <span className="rw-label rw-num rwsp-syllabus-count">
                        {t('website:renderer.courseDetails.lessonCount', {
                          count: section.lessons.length,
                        })}
                      </span>
                    </li>
                  ))}
                </ol>
                {remaining > 0 ? (
                  <p className="rw-label rwsp-more">
                    {t('website:renderer.courseSpotlight.moreSections', { count: remaining })}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </RiwaqBand>
  );
}
