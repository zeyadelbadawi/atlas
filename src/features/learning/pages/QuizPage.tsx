/**
 * Quiz Page.
 *
 * Instructions → answer questions → review → submit → result. Scoring
 * happens entirely behind `QuizService` — this page never computes a score
 * or a pass/fail outcome itself, and correct answers are never rendered
 * before submission (the `QuizQuestionOption` type has no such field).
 */
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { PageContainer, PageHeader } from "@components/layout";
import { ErrorState } from "@components/feedback";
import { StatusBadge } from "@components/data-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { useConfirmDialog } from "@app/providers";
import { DASHBOARD_ROUTES, buildPath } from "@app/routes/route-paths";
import {
  useQuiz,
  useQuizAttempts,
  useStartQuizAttempt,
  useSubmitQuizAttempt,
} from "../hooks";
import { buildQuizAttemptSchema } from "../schemas/learning.schemas";
import type { QuizAttemptFormData } from "../schemas/learning.schemas";
import { getQuizAttemptStatusTone } from "../utils/learning-status.utils";

export default function QuizPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId, quizId } = useParams<{
    courseId: string;
    quizId: string;
  }>();
  const { confirm } = useConfirmDialog();

  const {
    data: quiz,
    isLoading: isLoadingQuiz,
    error: quizError,
    refetch: refetchQuiz,
  } = useQuiz(courseId ?? "", quizId ?? "");
  const { data: attemptsData, isLoading: isLoadingAttempts } = useQuizAttempts(
    courseId ?? "",
    quizId ?? ""
  );

  const attempts = attemptsData?.items ?? [];
  const latestAttempt = attempts[attempts.length - 1];
  const isAttemptOpen =
    latestAttempt?.status === "in_progress" ||
    latestAttempt?.status === "not_started";
  const hasResult =
    latestAttempt?.status === "passed" || latestAttempt?.status === "failed";

  const { mutateAsync: startAttempt, isPending: isStarting } =
    useStartQuizAttempt(courseId ?? "", quizId ?? "");
  const { mutateAsync: submitAttempt, isPending: isSubmitting } =
    useSubmitQuizAttempt(courseId ?? "", quizId ?? "");

  const questions = useMemo(
    () => [...(quiz?.questions ?? [])].sort((a, b) => a.order - b.order),
    [quiz]
  );
  const questionIds = useMemo(() => questions.map((q) => q.id), [questions]);

  const form = useForm<QuizAttemptFormData>({
    resolver: zodResolver(buildQuizAttemptSchema(questionIds)),
    defaultValues: { answers: {} },
  });

  useEffect(() => {
    form.reset({ answers: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  const handleStart = async () => {
    if (!quizId) return;
    try {
      await startAttempt();
    } catch {
      toast({
        title: t("learning:quiz.startError"),
        description: t("errors:generic"),
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: QuizAttemptFormData) => {
    if (!latestAttempt) return;

    const confirmed = await confirm({
      titleKey: "learning:quiz.submitConfirm.title",
      descriptionKey: "learning:quiz.submitConfirm.description",
      confirmLabelKey: "learning:quiz.submitConfirm.confirmLabel",
      cancelLabelKey: "learning:quiz.submitConfirm.cancelLabel",
      intent: "default",
    });
    if (!confirmed) return;

    try {
      await submitAttempt({
        attemptId: latestAttempt.id,
        payload: {
          answers: Object.entries(data.answers).map(
            ([questionId, selectedOptionIds]) => ({
              questionId,
              selectedOptionIds,
            })
          ),
        },
      });
      toast({ title: t("learning:quiz.submitSuccess") });
    } catch {
      toast({
        title: t("learning:quiz.submitError"),
        description: t("errors:generic"),
        variant: "destructive",
      });
    }
  };

  if (isLoadingQuiz || isLoadingAttempts) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (quizError || !quiz) {
    return (
      <PageContainer>
        <PageHeader titleKey="learning:quiz.listTitle" />
        <ErrorState onRetry={() => refetchQuiz()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={quiz.title}
        titleKey="learning:quiz.listTitle"
        descriptionKey="learning:quiz.instructionsTitle"
      />

      <div className="mx-auto max-w-2xl space-y-6">
        {hasResult ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("learning:quiz.resultTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {latestAttempt.passed ? (
                  <CheckCircle2 className="size-8 text-success" aria-hidden />
                ) : (
                  <XCircle className="size-8 text-destructive" aria-hidden />
                )}
                <StatusBadge
                  labelKey={
                    latestAttempt.passed
                      ? "learning:quiz.passed"
                      : "learning:quiz.failed"
                  }
                  tone={getQuizAttemptStatusTone(latestAttempt.status)}
                />
              </div>
              {typeof latestAttempt.score === "number" ? (
                <p className="text-sm text-foreground">
                  {t("learning:quiz.scoreLabel", { score: latestAttempt.score })}
                </p>
              ) : null}
              {typeof quiz.passingScore === "number" ? (
                <p className="text-sm text-muted-foreground">
                  {t("learning:quiz.passingScoreLabel", {
                    score: quiz.passingScore,
                  })}
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                {t("learning:quiz.attemptNumber", {
                  number: latestAttempt.attemptNumber,
                })}
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                {latestAttempt.canRetry ? (
                  <Button onClick={handleStart} disabled={isStarting}>
                    {isStarting ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : null}
                    {t("learning:quiz.retryAvailable")}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("learning:quiz.retryUnavailable")}
                  </p>
                )}
                {courseId ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      navigate(
                        buildPath(DASHBOARD_ROUTES.learningCourseDetail, {
                          courseId,
                        })
                      )
                    }
                  >
                    {t("learning:learn.backToCourse")}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : !isAttemptOpen ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("learning:quiz.instructionsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {quiz.description || t("learning:quiz.instructionsDefault")}
              </p>
              <Button onClick={handleStart} disabled={isStarting}>
                {isStarting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t("learning:quiz.startAction")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Question navigator */}
            <nav
              aria-label={t("learning:quiz.reviewTitle")}
              className="flex flex-wrap gap-2"
            >
              {questions.map((question, index) => (
                <a
                  key={question.id}
                  href={`#question-${question.id}`}
                  className="flex size-8 items-center justify-center rounded-md border border-border text-sm text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {index + 1}
                </a>
              ))}
            </nav>

            {questions.map((question, index) => (
              <Card key={question.id} id={`question-${question.id}`}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t("learning:quiz.questionOf", {
                      current: index + 1,
                      total: questions.length,
                    })}
                  </CardTitle>
                  <p className="text-sm font-medium text-foreground">
                    {question.prompt}
                  </p>
                </CardHeader>
                <CardContent>
                  <Controller
                    control={form.control}
                    name={`answers.${question.id}`}
                    render={({ field }) => {
                      const selected = field.value ?? [];

                      if (question.type === "multiple_choice") {
                        return (
                          <div className="space-y-2">
                            {question.options?.map((option) => {
                              const checked = selected.includes(option.id);
                              const inputId = `${question.id}-${option.id}`;
                              return (
                                <div
                                  key={option.id}
                                  className="flex items-center gap-2.5"
                                >
                                  <Checkbox
                                    id={inputId}
                                    checked={checked}
                                    onCheckedChange={(next) => {
                                      field.onChange(
                                        next
                                          ? [...selected, option.id]
                                          : selected.filter(
                                              (id) => id !== option.id
                                            )
                                      );
                                    }}
                                  />
                                  <Label htmlFor={inputId}>{option.label}</Label>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }

                      return (
                        <RadioGroup
                          value={selected[0] ?? ""}
                          onValueChange={(value) => field.onChange([value])}
                        >
                          {question.options?.map((option) => {
                            const inputId = `${question.id}-${option.id}`;
                            return (
                              <div
                                key={option.id}
                                className="flex items-center gap-2.5"
                              >
                                <RadioGroupItem
                                  value={option.id}
                                  id={inputId}
                                />
                                <Label htmlFor={inputId}>{option.label}</Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      );
                    }}
                  />
                  {form.formState.errors.answers ? (
                    <p
                      role="alert"
                      className="mt-2 text-sm font-medium text-destructive"
                    >
                      {t("validation:required")}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardContent className="space-y-3 py-4">
                <p className="text-sm text-muted-foreground">
                  {t("learning:quiz.reviewDescription")}
                </p>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {t("learning:quiz.submitAction")}
                </Button>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </PageContainer>
  );
}
