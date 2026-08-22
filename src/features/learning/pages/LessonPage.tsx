/**
 * Lesson Page.
 *
 * Renders one lesson's content inside the Learning layout, with
 * previous/next navigation and lesson completion. Requires an active
 * enrollment — the enrollment record supplies the academyId needed to
 * reach the existing (unmodified) Course content endpoints.
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Lock,
} from "lucide-react";
import { PageContainer } from "@components/layout";
import { ErrorState, EmptyState } from "@components/feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { DASHBOARD_ROUTES, buildPath } from "@app/routes/route-paths";
import { useCourse, useCourseSections } from "@features/course";
import {
  useEnrollment,
  useCourseProgress,
  useCompleteLesson,
} from "../hooks";
import { LearningLayout } from "../components/LearningLayout";
import type { CourseLesson, LessonProgressStatus } from "@types";

export default function LessonPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId, lessonId } = useParams<{
    courseId: string;
    lessonId: string;
  }>();

  const {
    data: enrollment,
    isLoading: isLoadingEnrollment,
    error: enrollmentError,
  } = useEnrollment(courseId ?? "");
  const academyId = enrollment?.academyId;
  const isEnrolled = !!enrollment && enrollment.status !== "available";

  const { data: course } = useCourse(academyId ?? "", courseId ?? "", {
    enabled: !!academyId,
  });
  const {
    data: sectionsData,
    isLoading: isLoadingSections,
    error: sectionsError,
    refetch: refetchSections,
  } = useCourseSections(academyId ?? "", courseId ?? "", {
    enabled: !!academyId,
  });
  const {
    data: progress,
    refetch: refetchProgress,
  } = useCourseProgress(courseId ?? "", { enabled: isEnrolled });

  const { mutateAsync: completeLesson, isPending: isCompleting } =
    useCompleteLesson(courseId ?? "");

  const sections = useMemo(
    () => [...(sectionsData?.items ?? [])].sort((a, b) => a.order - b.order),
    [sectionsData]
  );

  const flatLessons = useMemo(() => {
    const lessons: CourseLesson[] = [];
    for (const section of sections) {
      lessons.push(...[...section.lessons].sort((a, b) => a.order - b.order));
    }
    return lessons;
  }, [sections]);

  const lessonStatusById = useMemo(() => {
    const map = new Map<string, LessonProgressStatus>();
    progress?.lessons.forEach((lp) => map.set(lp.lessonId, lp.status));
    return map;
  }, [progress]);

  const currentIndex = flatLessons.findIndex((l) => l.id === lessonId);
  const currentLesson = currentIndex >= 0 ? flatLessons[currentIndex] : undefined;
  const previousLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : undefined;
  const nextLesson =
    currentIndex >= 0 && currentIndex < flatLessons.length - 1
      ? flatLessons[currentIndex + 1]
      : undefined;

  const currentStatus = currentLesson
    ? lessonStatusById.get(currentLesson.id) ?? "available"
    : undefined;
  const isLocked = currentStatus === "locked";
  const isCompleted = currentStatus === "completed";

  const goToLesson = (id: string) => {
    if (!courseId) return;
    navigate(
      buildPath(DASHBOARD_ROUTES.learningLesson, { courseId, lessonId: id })
    );
  };

  const handleMarkComplete = async () => {
    if (!currentLesson) return;
    try {
      await completeLesson({ lessonId: currentLesson.id });
      toast({ title: t("learning:lesson.completed") });
      await refetchProgress();
    } catch {
      toast({
        title: t("learning:lesson.completeError"),
        description: t("errors:generic"),
        variant: "destructive",
      });
    }
  };

  if (isLoadingEnrollment || isLoadingSections) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (enrollmentError || !isEnrolled) {
    return (
      <PageContainer>
        <EmptyState
          titleKey="learning:errors.unauthorized"
          descriptionKey="learning:details.notEnrolledPrompt"
          primaryAction={
            courseId
              ? {
                  labelKey: "learning:details.enrollAction",
                  onAction: () =>
                    navigate(
                      buildPath(DASHBOARD_ROUTES.learningCourseDetail, {
                        courseId,
                      })
                    ),
                }
              : undefined
          }
        />
      </PageContainer>
    );
  }

  if (sectionsError) {
    return (
      <PageContainer>
        <ErrorState onRetry={() => refetchSections()} />
      </PageContainer>
    );
  }

  if (!currentLesson) {
    return (
      <PageContainer>
        <ErrorState kind="notFound" />
      </PageContainer>
    );
  }

  return (
    <LearningLayout
      courseId={courseId ?? ""}
      courseTitle={course?.title ?? ""}
      progressPercentage={progress?.percentage ?? 0}
      sections={sections}
      lessonStatusById={lessonStatusById}
      currentLessonId={currentLesson.id}
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            {currentLesson.title}
          </h2>
        </div>

        {isLocked ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Lock className="size-8 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                {t("learning:lesson.lockedMessage")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-4 py-6">
              {currentLesson.description ? (
                <p className="whitespace-pre-line text-sm text-foreground">
                  {currentLesson.description}
                </p>
              ) : null}

              {currentLesson.contentType !== "text" &&
              currentLesson.contentUrl ? (
                <Button variant="outline" asChild>
                  <a
                    href={currentLesson.contentUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="size-4" strokeWidth={2} aria-hidden />
                    {t("learning:lesson.openResource")}
                  </a>
                </Button>
              ) : null}

              {!currentLesson.description && !currentLesson.contentUrl ? (
                <p className="text-sm text-muted-foreground">
                  {t("learning:lesson.unsupportedContent")}
                </p>
              ) : null}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={!previousLesson}
            onClick={() => previousLesson && goToLesson(previousLesson.id)}
          >
            <ChevronLeft className="size-4 rtl:-scale-x-100" aria-hidden />
            {t("learning:lesson.previous")}
          </Button>

          {!isLocked && !isCompleted ? (
            <Button onClick={handleMarkComplete} disabled={isCompleting}>
              {isCompleting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <CheckCircle2 className="size-4" strokeWidth={2} aria-hidden />
              )}
              {t("learning:lesson.markComplete")}
            </Button>
          ) : null}

          <Button
            variant="outline"
            disabled={!nextLesson}
            onClick={() => nextLesson && goToLesson(nextLesson.id)}
          >
            {t("learning:lesson.next")}
            <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden />
          </Button>
        </div>
      </div>
    </LearningLayout>
  );
}
