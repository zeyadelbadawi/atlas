/**
 * Lesson Page.
 *
 * Renders one lesson's content inside the Learning layout, with
 * previous/next navigation and lesson completion. Requires an active
 * enrollment — the enrollment record supplies the academyId needed to
 * reach the existing (unmodified) Course content endpoints.
 *
 * Video-first redesign (LMS UX pass): the video/content area now spans
 * the full width of the content pane (matching the reference product's
 * own "video is the primary focus, everything else is secondary" layout)
 * instead of sharing a narrow, centered column with the lesson title and
 * controls. Supporting information moves to tabs below the player —
 * `Overview` (this lesson's real description) and `Announcements` (this
 * course's real, published announcements, filtered client-side from the
 * student's own announcement feed — the backend feed has no per-course
 * filter param; see `useAnnouncementFeed`'s own doc comment for why it's
 * a single RLS-scoped feed, not several endpoints). Deliberately no
 * `Notes` or `Reviews` tab: neither has any backend model in this system
 * (confirmed by direct search — no `CourseReview`/note-taking entity
 * exists anywhere), and this pass does not fabricate functionality that
 * isn't real.
 *
 * YouTube support: `contentType === 'video'` now branches on whether
 * `contentUrl` is a YouTube link (`isYouTubeUrl`, `parseYouTubeVideoId` —
 * `@utils/youtube.utils`) — a YouTube URL renders the privacy-enhanced
 * `youtube-nocookie.com` embed inside a responsive `AspectRatio`; any
 * other video URL keeps the original native `<video>` element unchanged.
 * No schema change: the lesson content model stays exactly `contentType`
 * + one opaque `contentUrl` string, per `youtube.utils.ts`'s own doc
 * comment.
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
  Megaphone,
} from "lucide-react";
import { PageContainer } from "@components/layout";
import { ErrorState, EmptyState } from "@components/feedback";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { parseYouTubeVideoId, buildYouTubeEmbedUrl } from "@utils";
import { useAnnouncementFeed } from "@features/announcements";
import {
  useEnrollment,
  useCourseProgress,
  useCompleteLesson,
  useCourseContent,
  useDiscoverCourse,
} from "../hooks";
import { useLearningPaths } from "../context/LearningPaths.context";
import { LearningLayout } from "../components/LearningLayout";
import type { CourseLesson, LessonProgressStatus } from "@types";

export default function LessonPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const paths = useLearningPaths();
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

  const { data: course } = useDiscoverCourse(courseId ?? "", {
    enabled: !!courseId,
  });
  const {
    data: sectionsData,
    isLoading: isLoadingSections,
    error: sectionsError,
    refetch: refetchSections,
  } = useCourseContent(courseId ?? "", {
    enabled: isEnrolled,
  });
  const {
    data: progress,
    refetch: refetchProgress,
  } = useCourseProgress(courseId ?? "", { enabled: isEnrolled });

  const { mutateAsync: completeLesson, isPending: isCompleting } =
    useCompleteLesson(courseId ?? "");

  // Real, existing course-scoped announcements — see this file's own doc
  // comment for why this filters the student's global feed client-side
  // rather than a dedicated per-course endpoint (none exists).
  const { data: announcementFeed, isLoading: isLoadingAnnouncements } =
    useAnnouncementFeed({ enabled: isEnrolled });
  const courseAnnouncements = useMemo(
    () => (announcementFeed?.items ?? []).filter((a) => a.courseId === courseId),
    [announcementFeed, courseId]
  );

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

  const youtubeVideoId =
    currentLesson?.contentType === "video" && currentLesson.contentUrl
      ? parseYouTubeVideoId(currentLesson.contentUrl)
      : null;

  const goToLesson = (id: string) => {
    if (!courseId) return;
    navigate(paths.lesson(courseId, id));
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
          <Skeleton className="aspect-video w-full rounded-lg" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
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
                  onAction: () => navigate(paths.courseDetail(courseId)),
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
      academyId={academyId}
      progressPercentage={progress?.percentage ?? 0}
      sections={sections}
      lessonStatusById={lessonStatusById}
      currentLessonId={currentLesson.id}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        {isLocked ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card py-16 text-center">
            <Lock className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              {t("learning:lesson.lockedMessage")}
            </p>
          </div>
        ) : (
          <>
            {currentLesson.contentType === "video" && currentLesson.contentUrl ? (
              <AspectRatio
                ratio={16 / 9}
                className="overflow-hidden rounded-lg bg-black shadow-sm"
              >
                {youtubeVideoId ? (
                  <iframe
                    key={currentLesson.id}
                    className="size-full"
                    src={buildYouTubeEmbedUrl(youtubeVideoId)}
                    title={currentLesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <video
                    key={currentLesson.id}
                    controls
                    className="size-full"
                    src={currentLesson.contentUrl}
                  >
                    {t("learning:lesson.videoUnsupported")}
                  </video>
                )}
              </AspectRatio>
            ) : null}

            {currentLesson.contentType === "file" && currentLesson.contentUrl ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card py-16 text-center">
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
              </div>
            ) : null}
          </>
        )}

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            {currentLesson.title}
          </h2>
        </div>

        {!isLocked ? (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">
                {t("learning:lesson.tabs.overview")}
              </TabsTrigger>
              <TabsTrigger value="announcements">
                {t("learning:lesson.tabs.announcements")}
                {courseAnnouncements.length > 0 ? (
                  <span className="ms-1.5 rounded-pill bg-muted px-1.5 py-0.5 text-xs">
                    {courseAnnouncements.length}
                  </span>
                ) : null}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 pt-4">
              {currentLesson.description ? (
                <p className="whitespace-pre-line text-sm text-foreground">
                  {currentLesson.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("learning:lesson.unsupportedContent")}
                </p>
              )}
            </TabsContent>

            <TabsContent value="announcements" className="space-y-3 pt-4">
              {isLoadingAnnouncements ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : courseAnnouncements.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Megaphone className="size-6 text-muted-foreground" aria-hidden />
                  <p className="text-sm text-muted-foreground">
                    {t("learning:lesson.noAnnouncements")}
                  </p>
                </div>
              ) : (
                courseAnnouncements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="rounded-lg border border-border bg-card p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {announcement.title}
                      </h3>
                      {announcement.publishedAt ? (
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(announcement.publishedAt).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                      {announcement.body}
                    </p>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
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
