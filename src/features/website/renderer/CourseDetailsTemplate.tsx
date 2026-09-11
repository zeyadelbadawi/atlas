/**
 * Course Details Template.
 *
 * The `coreType: 'courseDetails'` page is NOT composed of sections — it is
 * a fixed marketing template driven entirely by the existing Course
 * domain. This is deliberate: Course Details reuses Course Management's
 * real data rather than duplicating a "WebsiteCourse" projection (see
 * `Reports/ARCHITECTURE.md`, Prompt 9, "No Course Domain Duplication").
 *
 * LMS UX pass — two real, related fixes:
 *
 * 1. Was calling `useCourse` (`@features/course`), the TENANT-scoped
 *    `GET academies/:id/courses/:courseId` — `JwtAuthGuard`+
 *    `AcademyScopeGuard`, which fails closed for literally any real
 *    visitor to a marketing page (anonymous, or a signed-in Student with
 *    no `OrganizationMembership` in this Academy's org). The exact same
 *    bug `getPublicCourses`/`usePublicCourses` already document having
 *    fixed for the Featured Courses section — just never applied here.
 *    Now uses `usePublicCourse`/`usePublicCourseCurriculum`
 *    (`@features/public-website`), the genuinely public counterparts.
 *
 * 2. Was a bare thumbnail/title/price/description card with no real
 *    curriculum, stats, or enrollment state — now shows real section/
 *    lesson counts (`course.stats`), a real curriculum preview (lesson
 *    titles/content-type icons, never the gated `contentUrl`/
 *    `description` — see `toPublicCourseCurriculumResponse`'s own doc
 *    comment on the backend), and a state-aware CTA: "Sign in to enroll"
 *    (signed out) / "Enroll for free" (signed in, free, not yet enrolled
 *    — the real `POST /enrollments` free-course flow) / "Continue
 *    Learning" (already enrolled) / no action at all for a paid course
 *    (no paid-enrollment flow is reachable from this page yet — see this
 *    pass's completion report; showing a broken/fake button would be
 *    worse than showing none).
 */
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  FileText,
  Layers,
  Loader2,
  PlayCircle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ErrorState } from '@components/feedback';
import { toast } from '@/hooks/use-toast';
import { formatCoursePricing } from '@features/course';
// Deep `@features/public-website/hooks` import matches the established
// precedent already used by `FeaturedCoursesSection`/`InstructorsSection`/
// `StatisticsSection`/`ContactSection` (all `@features/website`) for the
// exact same reason: the public-safe course fetch (`usePublicCourse`/
// `usePublicCourseCurriculum`) only exists in `@features/public-website`,
// and this template renders on the real public runtime where the
// tenant-scoped `useCourse` (`@features/course`) 403s for any real
// visitor — see this file's own header comment.
import {
  usePublicCourse,
  usePublicCourseCurriculum,
} from '@features/public-website/hooks';
import { DEV_OVERRIDE_PARAM } from '@features/public-website';
import { useAuth } from '@hooks';
import { useEnrollment, useEnroll } from '@features/learning';
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
} from './renderer-style.utils';
import type { PublicWebsiteLocale } from '@types';

export interface CourseDetailsTemplateProps {
  readonly academyId: string;
  readonly courseId: string;
  /** Absent inside the dashboard's own Page Editor preview — the same convention `WebsiteChrome`'s own `locale` prop already follows. */
  readonly locale?: PublicWebsiteLocale;
}

const CONTENT_TYPE_ICON = {
  video: PlayCircle,
  file: FileText,
  text: BookOpen,
} as const;

export function CourseDetailsTemplate({
  academyId,
  courseId,
  locale = 'en',
}: CourseDetailsTemplateProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const container = useWebsiteContainerClass();
  const heading = useWebsiteHeadingClass();
  const [searchParams] = useSearchParams();
  // Same locale-prefix + dev-preview-param rule `usePublicWebsiteHrefBuilder`
  // (`@features/public-website`) applies — reimplemented locally rather
  // than imported, since that hook lives one layer up in a feature this
  // one must not depend on (`@features/website` → `@features/public-website`
  // → `@features/website` would cycle back on itself). `DEV_OVERRIDE_PARAM`
  // itself IS a real, shared barrel export (see `public-website-link.utils.ts`'s
  // identical precedent), so only the two-line prefixing rule is
  // duplicated, not the constant.
  const buildHref = useCallback(
    (path: string): string => {
      const localized = locale === 'en' ? path : `/ar${path}`;
      const devSlug = searchParams.get(DEV_OVERRIDE_PARAM);
      if (!devSlug) return localized;
      const separator = localized.includes('?') ? '&' : '?';
      return `${localized}${separator}${DEV_OVERRIDE_PARAM}=${encodeURIComponent(devSlug)}`;
    },
    [locale, searchParams]
  );
  const { session } = useAuth();
  const isAuthenticated = session.status === 'authenticated';

  const {
    data: course,
    isLoading,
    error,
    refetch,
  } = usePublicCourse(academyId, courseId);
  const { data: curriculum, isLoading: isLoadingCurriculum } =
    usePublicCourseCurriculum(academyId, courseId);
  const { data: enrollment } = useEnrollment(courseId, {
    enabled: isAuthenticated,
  });
  const { mutateAsync: enroll, isPending: isEnrolling } = useEnroll();
  const [enrollError, setEnrollError] = useState(false);

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

  const isFree = course.pricing.type === 'free';
  const isEnrolled = !!enrollment && enrollment.status !== 'available';

  const handleEnroll = async () => {
    setEnrollError(false);
    try {
      await enroll({ courseId });
      navigate(buildHref(`/my-learning/courses/${courseId}`));
    } catch {
      setEnrollError(true);
      toast({
        title: t('website:renderer.courseDetails.enrollError'),
        variant: 'destructive',
      });
    }
  };

  return (
    <article className={`${container} space-y-10 py-16`}>
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
          <BookOpen
            className="size-10 text-[var(--website-primary-solid)]"
            aria-hidden
          />
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <div className="space-y-3">
            {course.category ? (
              <p className="text-sm font-medium text-[var(--website-primary-solid)]">
                {course.category.name}
              </p>
            ) : null}
            <h1 className={`${heading} text-3xl text-foreground sm:text-4xl`}>
              {course.title}
            </h1>

            {course.stats ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Layers className="size-4" aria-hidden />
                  {t('website:renderer.courseDetails.sectionCount', {
                    count: course.stats.totalSections,
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <PlayCircle className="size-4" aria-hidden />
                  {t('website:renderer.courseDetails.lessonCount', {
                    count: course.stats.totalLessons,
                  })}
                </span>
              </div>
            ) : null}
          </div>

          {course.description ? (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">
                {t('website:renderer.courseDetails.aboutTitle')}
              </h2>
              <p className="max-w-prose whitespace-pre-line text-base leading-relaxed text-muted-foreground">
                {course.description}
              </p>
            </div>
          ) : null}

          {course.instructors.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">
                {t('website:renderer.instructorsLabel')}
              </h2>
              <div className="flex flex-wrap gap-4">
                {course.instructors.map((instructor) => (
                  <span
                    key={instructor.id}
                    className="text-sm text-muted-foreground"
                  >
                    {instructor.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {curriculum && curriculum.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">
                {t('website:renderer.courseDetails.curriculumTitle')}
              </h2>
              <Accordion
                type="multiple"
                className="rounded-lg border border-border"
              >
                {curriculum.map((section) => (
                  <AccordionItem
                    key={section.id}
                    value={section.id}
                    className="px-4"
                  >
                    <AccordionTrigger className="text-sm font-medium">
                      <span className="flex-1 text-start">{section.title}</span>
                      <span className="me-2 whitespace-nowrap text-xs font-normal text-muted-foreground">
                        {t('website:renderer.courseDetails.lessonCount', {
                          count: section.lessons.length,
                        })}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2">
                        {section.lessons.map((lesson) => {
                          const Icon = CONTENT_TYPE_ICON[lesson.contentType];
                          return (
                            <li
                              key={lesson.id}
                              className="flex items-center gap-2 text-sm text-muted-foreground"
                            >
                              <Icon className="size-4 shrink-0" aria-hidden />
                              {lesson.title}
                            </li>
                          );
                        })}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ) : isLoadingCurriculum ? (
            <Skeleton className="h-32 w-full" />
          ) : null}
        </div>

        <aside className="h-fit space-y-4 rounded-lg border border-border bg-card p-5 lg:sticky lg:top-6">
          <p className="text-2xl font-semibold text-foreground">
            {formatCoursePricing(course.pricing, t)}
          </p>

          {isEnrolled ? (
            <Button
              className="w-full"
              onClick={() =>
                navigate(buildHref(`/my-learning/courses/${courseId}`))
              }
            >
              <CheckCircle2 className="size-4" strokeWidth={2} aria-hidden />
              {t('website:renderer.courseDetails.continueAction')}
            </Button>
          ) : isAuthenticated ? (
            isFree ? (
              <Button
                className="w-full"
                onClick={handleEnroll}
                disabled={isEnrolling}
              >
                {isEnrolling ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t('website:renderer.courseDetails.enrollAction')}
              </Button>
            ) : null
          ) : (
            <Button
              className="w-full"
              onClick={() =>
                navigate(
                  buildHref(
                    `/sign-in?returnTo=${encodeURIComponent(`/courses/${courseId}`)}`
                  )
                )
              }
            >
              {t('website:renderer.courseDetails.signInToEnrollAction')}
            </Button>
          )}

          {enrollError ? (
            <p className="text-sm text-destructive">
              {t('website:renderer.courseDetails.enrollError')}
            </p>
          ) : null}
        </aside>
      </div>
    </article>
  );
}
