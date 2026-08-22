/**
 * Learning Layout.
 *
 * The shared shell for the lesson-consumption experience: course title,
 * overall progress, and the curriculum navigation. Desktop keeps the
 * curriculum as a persistent sidebar; tablet and mobile collapse it into a
 * sheet-based drawer opened from a toolbar button — the same
 * `useBreakpoint`/`useDisclosure`/`Sheet` pattern `DashboardLayout` already
 * uses for its own navigation, so learning doesn't introduce a second
 * responsive-navigation mechanism.
 */
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useBreakpoint, useDisclosure, useLanguage } from "@hooks";
import { DASHBOARD_ROUTES, buildPath } from "@app/routes/route-paths";
import { CurriculumNav } from "./CurriculumNav";
import type { CourseSection, LessonProgressStatus } from "@types";

export interface LearningLayoutProps {
  readonly courseId: string;
  readonly courseTitle: string;
  readonly progressPercentage: number;
  readonly sections: readonly CourseSection[];
  readonly lessonStatusById: ReadonlyMap<string, LessonProgressStatus>;
  readonly currentLessonId?: string;
  readonly children: ReactNode;
}

export function LearningLayout({
  courseId,
  courseTitle,
  progressPercentage,
  sections,
  lessonStatusById,
  currentLessonId,
  children,
}: LearningLayoutProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isDesktop } = useBreakpoint();
  const { isRtl } = useLanguage();
  const drawer = useDisclosure(false);

  const nav = (
    <CurriculumNav
      courseId={courseId}
      sections={sections}
      lessonStatusById={lessonStatusById}
      currentLessonId={currentLessonId}
      onNavigate={drawer.close}
    />
  );

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          {!isDesktop ? (
            <Button
              variant="outline"
              size="icon"
              onClick={drawer.open}
              aria-label={t("learning:learn.openCurriculum")}
            >
              <PanelLeft className="size-4" aria-hidden />
            </Button>
          ) : null}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="-ms-2 text-muted-foreground"
              onClick={() =>
                navigate(
                  buildPath(DASHBOARD_ROUTES.learningCourseDetail, {
                    courseId,
                  })
                )
              }
            >
              <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />
              {t("learning:learn.backToCourse")}
            </Button>
            <h1 className="font-display text-lg font-semibold text-foreground">
              {courseTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:w-64">
          <div className="h-2 flex-1 overflow-hidden rounded-pill bg-muted">
            <div
              className="h-full rounded-pill bg-primary transition-[width]"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {t("learning:learn.progressLabel", {
              percentage: Math.round(progressPercentage),
            })}
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {isDesktop ? (
          <aside className="w-72 shrink-0 overflow-y-auto border-e border-border p-4">
            {nav}
          </aside>
        ) : (
          <Sheet open={drawer.isOpen} onOpenChange={drawer.setOpen}>
            <SheetContent
              side={isRtl ? "right" : "left"}
              className="w-80 overflow-y-auto p-4"
            >
              <SheetTitle className="sr-only">
                {t("learning:learn.curriculumLabel")}
              </SheetTitle>
              {nav}
            </SheetContent>
          </Sheet>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
