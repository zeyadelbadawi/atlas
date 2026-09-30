/**
 * Course Details data and enrolment behaviour, shared by every theme's
 * Course Details page (Theme 1 plan Phase 6: "`CourseDetailsTemplate`
 * split into composable parts a pack can arrange; existing data hooks
 * unchanged"). The public course, its curriculum, the visitor's enrolment
 * and the one primary action come from here, so a theme changes only the
 * layout — never who may enrol, buy or continue.
 *
 * The primary action (unchanged from the template it came from):
 *   - enrolled → "Continue Learning" (the learner's course progress);
 *   - signed in, free → "Enroll for free" (the real free-enrolment flow);
 *   - signed in, paid → "Buy" (the checkout);
 *   - signed out → "Sign in to enroll" (returns to this course).
 */
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LEARNER_ROUTES, buildPath } from '@app/routes/route-paths';
import { toast } from '@/hooks/use-toast';
import { usePublicCourse, usePublicCourseCurriculum, useAuth } from '@hooks';
import { DEV_OVERRIDE_PARAM } from '@features/public-website';
import { useEnrollment, useEnroll } from '@features/learning';
import type { PublicWebsiteLocale } from '@types';

export type CourseDetailsActionKind = 'continue' | 'enroll' | 'buy' | 'signIn';

export interface CourseDetailsAction {
  readonly kind: CourseDetailsActionKind;
  readonly labelKey: string;
  readonly onSelect: () => void;
  readonly busy: boolean;
}

export function useCourseDetails(
  academyId: string,
  courseId: string,
  locale: PublicWebsiteLocale = 'en'
) {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  // The lesson whose free preview is open, or null. Holding the lesson
  // rather than a boolean keeps the dialog's grant keyed to exactly the
  // lesson the visitor clicked.
  const [previewLesson, setPreviewLesson] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const { data: enrollment } = useEnrollment(courseId, {
    enabled: isAuthenticated,
  });
  const { mutateAsync: enroll, isPending: isEnrolling } = useEnroll();
  const [enrollError, setEnrollError] = useState(false);

  const isFree = course?.pricing.type === 'free';
  const isEnrolled = !!enrollment && enrollment.status !== 'available';

  const handleEnroll = async () => {
    setEnrollError(false);
    try {
      await enroll({ courseId });
      navigate(
        buildHref(buildPath(LEARNER_ROUTES.courseProgress, { courseId }))
      );
    } catch {
      setEnrollError(true);
      toast({
        title: t('website:renderer.courseDetails.enrollError'),
        variant: 'destructive',
      });
    }
  };

  const action: CourseDetailsAction = isEnrolled
    ? {
        kind: 'continue',
        labelKey: 'website:renderer.courseDetails.continueAction',
        busy: false,
        onSelect: () =>
          navigate(
            buildHref(buildPath(LEARNER_ROUTES.courseProgress, { courseId }))
          ),
      }
    : isAuthenticated
      ? isFree
        ? {
            kind: 'enroll',
            labelKey: 'website:renderer.courseDetails.enrollAction',
            busy: isEnrolling,
            onSelect: () => void handleEnroll(),
          }
        : {
            kind: 'buy',
            labelKey: 'website:renderer.courseDetails.buyAction',
            busy: false,
            onSelect: () =>
              navigate(
                buildHref(
                  buildPath(LEARNER_ROUTES.courseCheckout, { courseId })
                )
              ),
          }
      : {
          kind: 'signIn',
          labelKey: 'website:renderer.courseDetails.signInToEnrollAction',
          busy: false,
          onSelect: () =>
            navigate(
              buildHref(
                `/sign-in?returnTo=${encodeURIComponent(`/courses/${courseId}`)}`
              )
            ),
        };

  return {
    course,
    isLoading,
    error,
    refetch,
    curriculum,
    isLoadingCurriculum,
    previewLesson,
    setPreviewLesson,
    isAuthenticated,
    isEnrolled,
    isFree,
    isEnrolling,
    enrollError,
    handleEnroll,
    action,
    buildHref,
    navigate,
  };
}
