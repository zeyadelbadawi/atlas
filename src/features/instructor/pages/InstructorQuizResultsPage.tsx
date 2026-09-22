/**
 * Instructor Quiz Results Page.
 *
 * Every enrolled student's attempts at one course quiz. Reads the quiz's
 * own title/description through the existing, unmodified student-facing
 * `QuizService` (definitions aren't role-specific) — only the cross-student
 * attempt list needs the instructor-scoped service.
 *
 * P64 Phase 3 (§E.7): the roster shows the engine-v2 facts a reviewer
 * triages by — points, duration, violations, late flag, auto-submit
 * reason and grading state — and links each row to the attempt detail.
 * The header offers the integrity CSV export and the per-student
 * overrides sheet (extra time, extra attempts, a different window).
 */
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Download,
  Flag,
  Loader2,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { DataTable } from '@components/table';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { isApiError } from '@api';
import { useConfirmDialog } from '@app/providers';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useServerValidation } from '@forms';
import {
  useDateFormatter,
  useLanguage,
  usePagination,
  usePermissions,
} from '@hooks';
import {
  apiErrorMessage,
  formatNumber,
  isolateNumericExpression,
} from '@utils';
import { useQuiz } from '@features/learning';
import { getQuizAttemptStatusTone } from '@features/learning';
import {
  useCourseStudents,
  useDeleteQuizOverride,
  useInstructorQuizAttempts,
  useIntegrityCsv,
  useQuizOverrides,
  useUpsertQuizOverride,
} from '../hooks';
import {
  MAX_TIME_MULTIPLIER,
  MIN_TIME_MULTIPLIER,
  TIME_MULTIPLIER_STEP,
  quizOverrideSchema,
  type QuizOverrideFormData,
} from '../schemas/instructor.schemas';
import {
  autoSubmittedReasonLabelKey,
  formatAttemptDuration,
  fromDateTimeLocalValue,
} from '../utils/attempt-review.utils';
import type { QuizAttemptSummary, QuizStudentOverride } from '@types';

/** Enough roster to pick from in one select; the roster page paginates for reading. */
const OVERRIDE_STUDENT_PAGE_SIZE = 100;

const EMPTY_OVERRIDE_FORM: QuizOverrideFormData = {
  studentId: '',
  timeMultiplier: 1,
  extraAttempts: 0,
  availableFrom: '',
  availableUntil: '',
  reason: '',
};

function downloadTextFile(name: string, text: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

interface OverridesSheetProps {
  readonly courseId: string;
  readonly quizId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly canEdit: boolean;
}

function OverridesSheet({
  courseId,
  quizId,
  open,
  onOpenChange,
  canEdit,
}: OverridesSheetProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  const { language } = useLanguage();
  const { confirm } = useConfirmDialog();

  const {
    data: overrides,
    isLoading: overridesLoading,
    error: overridesError,
    refetch: refetchOverrides,
  } = useQuizOverrides(courseId, quizId, { enabled: open });

  const { data: students } = useCourseStudents(courseId, {
    query: { pagination: { page: 1, pageSize: OVERRIDE_STUDENT_PAGE_SIZE } },
    enabled: open,
  });

  const {
    mutateAsync: upsertOverride,
    isPending: isSaving,
    error: saveError,
  } = useUpsertQuizOverride(courseId, quizId);
  const { mutateAsync: deleteOverride, isPending: isDeleting } =
    useDeleteQuizOverride(courseId, quizId);

  const form = useForm<QuizOverrideFormData>({
    resolver: zodResolver(quizOverrideSchema),
    defaultValues: EMPTY_OVERRIDE_FORM,
  });
  useServerValidation(form, saveError);

  const studentOptions = students?.items ?? [];

  const onSubmit = async (data: QuizOverrideFormData) => {
    try {
      await upsertOverride({
        studentId: data.studentId,
        timeMultiplier: data.timeMultiplier,
        extraAttempts: data.extraAttempts,
        availableFrom: fromDateTimeLocalValue(data.availableFrom),
        availableUntil: fromDateTimeLocalValue(data.availableUntil),
        reason: data.reason?.trim() ? data.reason.trim() : undefined,
      });
      toast({ title: t('instructor:quizResults.overrides.saved') });
      form.reset(EMPTY_OVERRIDE_FORM);
    } catch (error) {
      toast({
        title: t('instructor:quizResults.overrides.saveError'),
        description: apiErrorMessage(t, i18n, error),
        variant: 'destructive',
      });
    }
  };

  const onRemove = async (override: QuizStudentOverride) => {
    const confirmed = await confirm({
      titleKey: 'instructor:quizResults.overrides.removeConfirm.title',
      descriptionKey:
        'instructor:quizResults.overrides.removeConfirm.description',
      confirmLabelKey:
        'instructor:quizResults.overrides.removeConfirm.confirmLabel',
      cancelLabelKey:
        'instructor:quizResults.overrides.removeConfirm.cancelLabel',
      values: { student: override.studentName ?? override.studentId },
      intent: 'destructive',
    });
    if (!confirmed) return;
    try {
      await deleteOverride(override.studentId);
      toast({ title: t('instructor:quizResults.overrides.removed') });
    } catch (error) {
      toast({
        title: t('instructor:quizResults.overrides.removeError'),
        description: apiErrorMessage(t, i18n, error),
        variant: 'destructive',
      });
    }
  };

  const numberField = (field: {
    value: number | undefined;
    onChange: (v: unknown) => void;
  }) => ({
    value: field.value ?? '',
    onChange: (e: ChangeEvent<HTMLInputElement>) =>
      field.onChange(
        e.target.value === '' ? undefined : Number(e.target.value)
      ),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-6 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t('instructor:quizResults.overrides.title')}</SheetTitle>
          <SheetDescription>
            {t('instructor:quizResults.overrides.description')}
          </SheetDescription>
        </SheetHeader>

        <section aria-labelledby="overrides-current" className="space-y-3">
          <h3 id="overrides-current" className="text-sm font-semibold">
            {t('instructor:quizResults.overrides.current')}
          </h3>
          {overridesError ? (
            <ErrorState
              kind={overridesError.kind}
              onRetry={() => refetchOverrides()}
            />
          ) : overridesLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t('common:states.loading')}
            </p>
          ) : !overrides || overrides.length === 0 ? (
            <EmptyState
              titleKey="instructor:quizResults.overrides.empty"
              descriptionKey="instructor:quizResults.overrides.emptyDescription"
              className="py-6"
            />
          ) : (
            <ul className="space-y-2">
              {overrides.map((override) => (
                <li
                  key={override.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-foreground">
                      {override.studentName ?? override.studentId}
                    </p>
                    <p className="text-muted-foreground">
                      {t('instructor:quizResults.overrides.summary', {
                        multiplier: formatNumber(
                          override.timeMultiplier,
                          language
                        ),
                        attempts: formatNumber(
                          override.extraAttempts,
                          language
                        ),
                      })}
                    </p>
                    {override.availableFrom ? (
                      <p className="text-xs text-muted-foreground">
                        {t('instructor:quizResults.overrides.windowFrom', {
                          date: fmt.dateTime(override.availableFrom),
                        })}
                      </p>
                    ) : null}
                    {override.availableUntil ? (
                      <p className="text-xs text-muted-foreground">
                        {t('instructor:quizResults.overrides.windowUntil', {
                          date: fmt.dateTime(override.availableUntil),
                        })}
                      </p>
                    ) : null}
                    {override.reason ? (
                      <p className="text-xs text-muted-foreground">
                        {override.reason}
                      </p>
                    ) : null}
                  </div>
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isDeleting}
                      onClick={() => onRemove(override)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                      {t('instructor:quizResults.overrides.remove')}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {canEdit ? (
          <>
            <Separator />
            <section aria-labelledby="overrides-form" className="space-y-3">
              <h3 id="overrides-form" className="text-sm font-semibold">
                {t('instructor:quizResults.overrides.formTitle')}
              </h3>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('instructor:quizResults.overrides.student')}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t(
                                  'instructor:quizResults.overrides.selectStudent'
                                )}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {studentOptions.map((student) => (
                              <SelectItem
                                key={student.studentId}
                                value={student.studentId}
                              >
                                {student.name} · {student.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {studentOptions.length === 0 ? (
                          <FormDescription>
                            {t('instructor:quizResults.overrides.noStudents')}
                          </FormDescription>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="timeMultiplier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t(
                              'instructor:quizResults.overrides.timeMultiplier'
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={MIN_TIME_MULTIPLIER}
                              max={MAX_TIME_MULTIPLIER}
                              step={TIME_MULTIPLIER_STEP}
                              {...field}
                              {...numberField(field)}
                            />
                          </FormControl>
                          <FormDescription>
                            {t(
                              'instructor:quizResults.overrides.timeMultiplierHelp'
                            )}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="extraAttempts"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t(
                              'instructor:quizResults.overrides.extraAttempts'
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              step={1}
                              {...field}
                              {...numberField(field)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="availableFrom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t(
                              'instructor:quizResults.overrides.availableFrom'
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="availableUntil"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t(
                              'instructor:quizResults.overrides.availableUntil'
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormDescription>
                            {t('instructor:quizResults.overrides.windowHelp')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('instructor:quizResults.overrides.reason')}{' '}
                          <span className="text-xs text-muted-foreground">
                            ({t('instructor:grading.optional')})
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            placeholder={t(
                              'instructor:quizResults.overrides.reasonPlaceholder'
                            )}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : null}
                      {t('instructor:quizResults.overrides.save')}
                    </Button>
                  </div>
                </form>
              </Form>
            </section>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export default function InstructorQuizResultsPage(): JSX.Element {
  const fmt = useDateFormatter();
  const { t, i18n } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('instructor.assignment.grade');
  const { courseId, quizId } = useParams<{
    courseId: string;
    quizId: string;
  }>();

  const { data: quiz } = useQuiz(courseId ?? '', quizId ?? '');

  const [totalItems, setTotalItems] = useState(0);
  const [overridesOpen, setOverridesOpen] = useState(false);
  const pagination = usePagination({ totalItems });

  const { data, isLoading, error, refetch } = useInstructorQuizAttempts(
    courseId ?? '',
    quizId ?? '',
    {
      query: {
        pagination: { page: pagination.page, pageSize: pagination.pageSize },
      },
      enabled: !!courseId && !!quizId,
    }
  );

  const { mutateAsync: exportCsv, isPending: isExporting } = useIntegrityCsv(
    courseId ?? '',
    quizId ?? ''
  );

  useEffect(() => {
    if (data) setTotalItems(data.pagination.totalItems);
  }, [data]);

  const attempts = data?.items ?? [];

  const onExportCsv = async () => {
    if (!quizId) return;
    try {
      const csv = await exportCsv();
      downloadTextFile(
        `quiz-${quizId}-integrity.csv`,
        csv,
        'text/csv;charset=utf-8'
      );
      toast({ title: t('instructor:quizResults.csv.success') });
    } catch (exportError) {
      toast({
        title: t('instructor:quizResults.csv.error'),
        description: apiErrorMessage(t, i18n, exportError),
        variant: 'destructive',
      });
    }
  };

  const formatPart = (value: number, minimumDigits: number) =>
    formatNumber(value, language, {
      minimumIntegerDigits: minimumDigits,
      useGrouping: false,
    });

  const columns: ColumnDef<QuizAttemptSummary, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'studentName',
        header: t('instructor:quizResults.table.student'),
        cell: ({ row }) => row.original.studentName,
      },
      {
        accessorKey: 'attemptNumber',
        header: t('instructor:quizResults.table.attempt'),
        cell: ({ row }) => formatNumber(row.original.attemptNumber, language),
      },
      {
        accessorKey: 'status',
        header: t('instructor:quizResults.table.status'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`instructor:studentProgress.quizStatus.${row.original.status}`}
            tone={getQuizAttemptStatusTone(row.original.status)}
          />
        ),
      },
      {
        accessorKey: 'score',
        header: t('instructor:quizResults.table.score'),
        cell: ({ row }) =>
          typeof row.original.score === 'number'
            ? formatNumber(Math.round(row.original.score) / 100, language, {
                style: 'percent',
              })
            : '—',
      },
      {
        id: 'points',
        header: t('instructor:quizResults.table.points'),
        cell: ({ row }) =>
          row.original.pointsEarned !== null &&
          row.original.pointsTotal !== null
            ? isolateNumericExpression(
                `${formatNumber(row.original.pointsEarned, language)} / ${formatNumber(row.original.pointsTotal, language)}`
              )
            : '—',
      },
      {
        id: 'duration',
        header: t('instructor:quizResults.table.duration'),
        cell: ({ row }) => {
          const duration = formatAttemptDuration(
            row.original.startedAt,
            row.original.submittedAt,
            null,
            formatPart
          );
          return duration ? (
            <span className="tabular-nums">
              {isolateNumericExpression(duration)}
            </span>
          ) : (
            '—'
          );
        },
      },
      {
        accessorKey: 'violationCount',
        header: t('instructor:quizResults.table.violations'),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5">
            {formatNumber(row.original.violationCount, language)}
            {row.original.integrityFlagged ? (
              <span className="inline-flex items-center gap-1 text-warning">
                <Flag className="size-3.5" aria-hidden />
                {t('instructor:quizResults.flagged')}
              </span>
            ) : null}
          </span>
        ),
      },
      {
        accessorKey: 'isLate',
        header: t('instructor:quizResults.table.late'),
        cell: ({ row }) =>
          row.original.isLate
            ? t('instructor:quizResults.late.yes')
            : t('instructor:quizResults.late.no'),
      },
      {
        accessorKey: 'autoSubmittedReason',
        header: t('instructor:quizResults.table.autoSubmitted'),
        cell: ({ row }) => {
          if (!row.original.autoSubmitted) return '—';
          const key = autoSubmittedReasonLabelKey(
            row.original.autoSubmittedReason
          );
          return key ? t(key) : (row.original.autoSubmittedReason ?? '—');
        },
      },
      {
        accessorKey: 'gradingStatus',
        header: t('instructor:quizResults.table.grading'),
        cell: ({ row }) =>
          t(
            `instructor:quizResults.gradingStatus.${row.original.gradingStatus}`
          ),
      },
      {
        accessorKey: 'submittedAt',
        header: t('instructor:quizResults.table.submittedAt'),
        cell: ({ row }) =>
          row.original.submittedAt ? fmt.date(row.original.submittedAt) : '—',
      },
    ],
    // `formatPart` is derived from `language`, which is already listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, language, fmt]
  );

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={isExporting || !quizId}
        onClick={onExportCsv}
      >
        {isExporting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Download className="size-4" aria-hidden />
        )}
        {t('instructor:quizResults.actions.exportCsv')}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={!quizId}
        onClick={() => setOverridesOpen(true)}
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        {t('instructor:quizResults.actions.overrides')}
      </Button>
    </div>
  );

  if (error) {
    return (
      <PageContainer>
        <PageHeader titleKey="instructor:quizResults.title" />
        <ErrorState
          kind={isApiError(error) ? error.kind : undefined}
          onRetry={() => refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={quiz?.title}
        titleKey="instructor:quizResults.title"
        actions={headerActions}
      />

      <DataTable
        columns={columns}
        data={attempts}
        isLoading={isLoading}
        pagination={pagination}
        getRowId={(attempt) => attempt.id}
        onRowSelect={(attempt) =>
          courseId &&
          quizId &&
          navigate(
            buildPath(DASHBOARD_ROUTES.instructorQuizAttempt, {
              courseId,
              quizId,
              attemptId: attempt.id,
            })
          )
        }
        emptyTitleKey="instructor:quizResults.empty"
        emptyDescriptionKey="instructor:quizResults.emptyDescription"
      />

      {courseId && quizId ? (
        <OverridesSheet
          courseId={courseId}
          quizId={quizId}
          open={overridesOpen}
          onOpenChange={setOverridesOpen}
          canEdit={canEdit}
        />
      ) : null}
    </PageContainer>
  );
}
