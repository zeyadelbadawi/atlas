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
import { useEnrollment, useCourseProgress, useCourseContent } from "../hooks";
import { useLearningPaths } from "../context/LearningPaths.context";

export default function CourseLearnRedirectPage(): JSX.Element {
  const { courseId } = useParams<{ courseId: string }>();
  const paths = useLearningPaths();

  const { data: enrollment, isLoading: isLoadingEnrollment } = useEnrollment(
    courseId ?? ""
  );
  const isEnrolled = !!enrollment && enrollment.status !== "available";

  const { data: progress, isLoading: isLoadingProgress } = useCourseProgress(
    courseId ?? "",
    { enabled: isEnrolled }
  );
  const { data: sectionsData, isLoading: isLoadingSections } =
    useCourseContent(courseId ?? "", {
      enabled: isEnrolled,
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

  return <Navigate to={paths.lesson(courseId, targetLessonId)} replace />;
}
