/**
 * Instructor Submission Review (Grading) Page.
 *
 * Shows one student's assignment submission and lets an authorized
 * instructor enter a score/feedback. No grading logic runs on the
 * frontend — this only forwards the values the instructor enters to the
 * existing `GradeSubmissionPayload` contract.
 *
 * B6 (UX audit):
 *   V06 a graded submission says so in the header (score, when, by whom
 *       when that is you) and replacing a grade with a different score
 *       asks first;
 *   V07/V08 one message per failure with the real reason ("not handed in
 *       yet"): a field refusal on its field, anything else one inline alert;
 *   V09/V10 the score accepts what the server accepts (0–100, two
 *       decimals) and every refusal is the app's own translated message;
 *   V14 the header names the assignment and course; the score states its
 *       scale and is marked required;
 *   V15 the student's text keeps its own direction in Arabic.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, ExternalLink, Loader2, Paperclip } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@app/providers';
import {
  hasViolationOn,
  RequiredMark,
  SaveFailedAlert,
  useServerValidation,
} from '@forms';
import {
  useAuth,
  useDateFormatter,
  useLanguage,
  usePermissions,
  useUnsavedChanges,
  useBidiIsolation,
} from '@hooks';
import { formatBytes, formatNumber, isolateText } from '@utils';
import { getSubmissionStatusTone, useAssignments } from '@features/learning';
import {
  useInstructorCourseOverview,
  useInstructorSubmission,
  useGradeSubmission,
} from '../hooks';
import {
  gradeSubmissionSchema,
  MAX_GRADING_FEEDBACK_LENGTH,
  MAX_SUBMISSION_SCORE,
  MIN_SUBMISSION_SCORE,
  type GradeSubmissionFormData,
} from '../schemas/instructor.schemas';

const GRADE_FIELDS = {
  score: 'instructor:grading.scoreLabel',
  feedback: 'instructor:grading.feedbackLabel',
} as const;

export default function InstructorSubmissionReviewPage(): JSX.Element {
  const fmt = useDateFormatter();
  const { t } = useTranslation();
  const { isolate } = useBidiIsolation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { confirm } = useConfirmDialog();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canGrade = hasPermission('instructor.assignment.grade');
  const { courseId, assignmentId, submissionId } = useParams<{
    courseId: string;
    assignmentId: string;
    submissionId: string;
  }>();

  const {
    data: submission,
    isLoading,
    error,
    refetch,
  } = useInstructorSubmission(
    courseId ?? '',
    assignmentId ?? '',
    submissionId ?? ''
  );

  // V14 — context for the header; neither blocks the page. The list is
  // the one the Assessments page reads (usually cached already).
  const { data: assignments } = useAssignments(courseId ?? '', {
    enabled: !!courseId,
  });
  const assignment = assignments?.items.find(
    (item) => item.id === assignmentId
  );
  const { data: course } = useInstructorCourseOverview(courseId ?? '');

  const {
    mutateAsync: gradeSubmission,
    isPending,
    error: mutationError,
  } = useGradeSubmission(courseId ?? '', assignmentId ?? '');

  const form = useForm<GradeSubmissionFormData>({
    resolver: zodResolver(gradeSubmissionSchema),
    defaultValues: { score: undefined, feedback: '' },
  });
  const feedbackLength = form.watch('feedback')?.length ?? 0;

  useServerValidation(form, mutationError ?? null, { labels: GRADE_FIELDS });
  const fieldFailure = hasViolationOn(mutationError ?? null, GRADE_FIELDS);
  const { markSaved } = useUnsavedChanges({
    isDirty: form.formState.isDirty,
  });

  useEffect(() => {
    if (submission?.grade) {
      form.reset({
        score: submission.grade.score,
        feedback: submission.grade.feedback ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission?.id]);

  const previousScore = submission?.grade?.score;

  const onSubmit = async (data: GradeSubmissionFormData) => {
    if (!submissionId) return;
    // V06 — a saved grade is never overwritten without a word.
    if (previousScore !== undefined && previousScore !== data.score) {
      const confirmed = await confirm({
        titleKey: 'instructor:grading.regradeConfirm.title',
        descriptionKey: 'instructor:grading.regradeConfirm.description',
        confirmLabelKey: 'instructor:grading.regradeConfirm.confirmLabel',
        cancelLabelKey: 'instructor:grading.regradeConfirm.cancelLabel',
        values: {
          previous: formatNumber(previousScore, language),
          next: formatNumber(data.score, language),
          student: submission?.studentName ?? '',
        },
      });
      if (!confirmed) return;
    }
    try {
      await gradeSubmission({
        submissionId,
        payload: { score: data.score, feedback: data.feedback || undefined },
      });
    } catch {
      // Shown once: on its field, or as the inline alert above the buttons.
      return;
    }
    toast({
      title: t('instructor:grading.success'),
      description: t('instructor:grading.successDescription', {
        score: formatNumber(data.score, language),
        student: isolate(submission?.studentName ?? ''),
      }),
    });
    // Graded: going back must not ask about the grade just saved.
    form.reset(data);
    markSaved();
    navigate(-1);
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64" />
        </div>
      </PageContainer>
    );
  }

  if (error || !submission) {
    return (
      <PageContainer>
        <PageHeader titleKey="instructor:grading.title" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const attachmentSize = formatBytes(
    submission.attachment?.sizeBytes ?? 0,
    language
  );
  const grade =
    submission.gradingStatus === 'graded' ? submission.grade : undefined;
  const contextKey =
    assignment?.title && course?.title
      ? 'instructor:grading.context'
      : assignment?.title
        ? 'instructor:grading.contextAssignment'
        : undefined;

  return (
    <PageContainer>
      <PageHeader
        title={submission.studentName}
        titleKey="instructor:grading.title"
        descriptionKey={contextKey}
        values={{
          assignment: assignment?.title ?? '',
          course: course?.title ?? '',
        }}
        actions={
          grade ? (
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <StatusBadge
                labelKey={
                  grade.score !== undefined
                    ? 'instructor:grading.gradedBadge'
                    : 'instructor:grading.status.graded'
                }
                values={{
                  score: formatNumber(grade.score ?? 0, language),
                  max: formatNumber(MAX_SUBMISSION_SCORE, language),
                }}
                tone="success"
              />
              {grade.gradedAt ? (
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="graded-at"
                >
                  {/* B6 (UX audit) V06 — who graded it: "you", or the
                      grader's name (the API returns it), else the date
                      alone. */}
                  {t(
                    grade.gradedBy && grade.gradedBy === user?.id
                      ? 'instructor:grading.gradedAtByYou'
                      : grade.gradedByName
                        ? 'instructor:grading.gradedAtBy'
                        : 'instructor:grading.gradedAt',
                    {
                      date: fmt.dateTime(grade.gradedAt),
                      name: isolateText(grade.gradedByName ?? ''),
                    }
                  )}
                </p>
              ) : null}
            </div>
          ) : (
            <StatusBadge
              labelKey={`learning:assignment.status.${submission.status}`}
              tone={getSubmissionStatusTone(submission.status)}
            />
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('instructor:grading.submissionTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submission.response ? (
              <p
                dir="auto"
                className="whitespace-pre-wrap text-sm text-foreground"
              >
                {submission.response}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('instructor:grading.noWrittenResponse')}
              </p>
            )}
            {submission.attachment ? (
              // P64 Phase 3 — the protected attachment; the link is signed
              // and short-lived, so the expiry is stated next to it.
              <div className="space-y-1 rounded-lg border border-border p-3 text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <Paperclip
                    className="size-4 text-muted-foreground"
                    aria-hidden
                  />
                  <span dir="auto" className="font-medium text-foreground">
                    {submission.attachment.fileName}
                  </span>
                  <span className="text-muted-foreground">
                    {attachmentSize.value} {t(attachmentSize.unitKey)}
                  </span>
                </p>
                <a
                  href={submission.attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-6 items-center gap-1 py-0.5 font-medium text-primary underline underline-offset-4"
                >
                  {t('instructor:grading.attachment.open')}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
                <p className="text-xs text-muted-foreground">
                  {t('instructor:grading.attachment.expires', {
                    time: fmt.dateTime(submission.attachment.expiresAt),
                  })}
                </p>
              </div>
            ) : submission.attachmentUrl ? (
              <a
                href={submission.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-6 items-center py-0.5 text-sm font-medium text-primary underline underline-offset-4"
              >
                {t('instructor:grading.viewAttachment')}
              </a>
            ) : null}
            {submission.submittedAt ? (
              <p className="text-xs text-muted-foreground">
                {t('instructor:grading.submittedAt', {
                  date: fmt.dateTime(submission.submittedAt),
                })}
              </p>
            ) : null}
            {submission.isLate ? (
              <p className="inline-flex items-center gap-1 text-sm text-warning">
                <Clock className="size-4" aria-hidden />
                {t('instructor:grading.submittedLate')}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('instructor:grading.formTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {!canGrade ? (
              <p className="text-sm text-muted-foreground">
                {t('instructor:grading.viewOnlyNotice')}
              </p>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                  noValidate
                >
                  <FormField
                    control={form.control}
                    name="score"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('instructor:grading.scoreLabelWithScale', {
                            max: formatNumber(MAX_SUBMISSION_SCORE, language),
                          })}
                          <RequiredMark />
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={MIN_SUBMISSION_SCORE}
                            max={MAX_SUBMISSION_SCORE}
                            step="0.01"
                            className="max-w-40"
                            placeholder={t(
                              'instructor:grading.scorePlaceholder',
                              {
                                min: formatNumber(
                                  MIN_SUBMISSION_SCORE,
                                  language
                                ),
                                max: formatNumber(
                                  MAX_SUBMISSION_SCORE,
                                  language
                                ),
                              }
                            )}
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ''
                                  ? undefined
                                  : Number(e.target.value)
                              )
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          {t('instructor:grading.scoreHint', {
                            min: formatNumber(MIN_SUBMISSION_SCORE, language),
                            max: formatNumber(MAX_SUBMISSION_SCORE, language),
                          })}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="feedback"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('instructor:grading.feedbackLabel')}{' '}
                          <span className="text-xs text-muted-foreground">
                            ({t('instructor:grading.optional')})
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            rows={5}
                            dir="auto"
                            placeholder={t(
                              'instructor:grading.feedbackPlaceholder'
                            )}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription
                          className={
                            feedbackLength > MAX_GRADING_FEEDBACK_LENGTH
                              ? 'text-xs font-medium tabular-nums text-destructive'
                              : 'text-xs tabular-nums text-muted-foreground'
                          }
                        >
                          {t('instructor:grading.characterCount', {
                            count: feedbackLength,
                            max: MAX_GRADING_FEEDBACK_LENGTH,
                          })}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {mutationError && !fieldFailure ? (
                    <SaveFailedAlert
                      error={mutationError}
                      titleKey="instructor:grading.error"
                    />
                  ) : null}

                  <div className="flex items-center justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => navigate(-1)}
                    >
                      {t('instructor:grading.cancelButton')}
                    </Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : null}
                      {t('instructor:grading.submitButton')}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
