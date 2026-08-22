/**
 * Course Learn Redirect Page.
 *
 * `/dashboard/learning/courses/:courseId/learn` has no lesson of its own —
 * it resolves to the student's resume point (or the course's first lesson)
 * and redirects there.
 */
import { useParams, Navigate } from "react-router-dom";
import { PageContainer } from "@components/layout";
import { ErrorState } from "@components/feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { DASHBOARD_ROUTES, buildPath } from "@app/routes/route-paths";
import { useCourseSections } from "@features/course";
import { useEnrollment, useCourseProgress } from "../hooks";

export default function CourseLearnRedirectPage(): JSX.Element {
  const { courseId } = useParams<{ courseId: string }>();

  const { data: enrollment, isLoading: isLoadingEnrollment } = useEnrollment(
    courseId ?? ""
  );
  const academyId = enrollment?.academyId;
  const isEnrolled = !!enrollment && enrollment.status !== "available";

  const { data: progress, isLoading: isLoadingProgress } = useCourseProgress(
    courseId ?? "",
    { enabled: isEnrolled }
  );
  const { data: sectionsData, isLoading: isLoadingSections } =
    useCourseSections(academyId ?? "", courseId ?? "", {
      enabled: !!academyId,
    });

  if (isLoadingEnrollment || isLoadingProgress || isLoadingSections) {
    return (
      <PageContainer>
        <Skeleton className="h-64 w-full" />
      </PageContainer>
    );
  }

  if (!isEnrolled || !courseId) {
    return (
      <PageContainer>
        <ErrorState kind="forbidden" />
      </PageContainer>
    );
  }

  const firstLessonId = [...(sectionsData?.items ?? [])]
    .sort((a, b) => a.order - b.order)
    .flatMap((section) => [...section.lessons].sort((a, b) => a.order - b.order))[0]
    ?.id;

  const targetLessonId = progress?.currentLessonId ?? firstLessonId;

  if (!targetLessonId) {
    return (
      <PageContainer>
        <ErrorState kind="notFound" />
      </PageContainer>
    );
  }

  return (
    <Navigate
      to={buildPath(DASHBOARD_ROUTES.learningLesson, {
        courseId,
        lessonId: targetLessonId,
      })}
      replace
    />
  );
}
