/**
 * Instructor Submission Review (Grading) Page.
 *
 * Shows one student's assignment submission and lets an authorized
 * instructor enter a score/feedback. No grading logic runs on the
 * frontend — this only forwards the values the instructor enters to the
 * existing `GradeSubmissionPayload` contract.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
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
import { useServerValidation } from '@forms';
import { usePermissions, useUnsavedChanges } from '@hooks';
import { getSubmissionStatusTone } from '@features/learning';
import { useInstructorSubmission, useGradeSubmission } from '../hooks';
import {
  gradeSubmissionSchema,
  type GradeSubmissionFormData,
} from '../schemas/instructor.schemas';

export default function InstructorSubmissionReviewPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  const {
    mutateAsync: gradeSubmission,
    isPending,
    error: mutationError,
  } = useGradeSubmission(courseId ?? '', assignmentId ?? '');

  const form = useForm<GradeSubmissionFormData>({
    resolver: zodResolver(gradeSubmissionSchema),
    defaultValues: { score: undefined, feedback: '' },
  });

  useServerValidation(form, mutationError);
  useUnsavedChanges({
    isDirty: form.formState.isDirty,
    messageKey: 'common:unsavedChanges',
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

  const onSubmit = async (data: GradeSubmissionFormData) => {
    if (!submissionId) return;
    try {
      await gradeSubmission({
        submissionId,
        payload: { score: data.score, feedback: data.feedback || undefined },
      });
      toast({
        title: t('instructor:grading.success'),
        description: t('common:states.success.description'),
      });
      navigate(-1);
    } catch {
      toast({
        title: t('instructor:grading.error'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
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

  return (
    <PageContainer>
      <PageHeader
        title={submission.studentName}
        titleKey="instructor:grading.title"
        actions={
          <StatusBadge
            labelKey={`learning:assignment.status.${submission.status}`}
            tone={getSubmissionStatusTone(submission.status)}
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('instructor:grading.submissionTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submission.response ? (
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {submission.response}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('instructor:grading.noWrittenResponse')}
              </p>
            )}
            {submission.attachmentUrl ? (
              <a
                href={submission.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-primary underline underline-offset-4"
              >
                {t('instructor:grading.viewAttachment')}
              </a>
            ) : null}
            {submission.submittedAt ? (
              <p className="text-xs text-muted-foreground">
                {t('instructor:grading.submittedAt', {
                  date: new Date(submission.submittedAt).toLocaleString(),
                })}
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
              >
                <FormField
                  control={form.control}
                  name="score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('instructor:grading.scoreLabel')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="1"
                          placeholder={t('instructor:grading.scorePlaceholder')}
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
                          placeholder={t(
                            'instructor:grading.feedbackPlaceholder'
                          )}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
