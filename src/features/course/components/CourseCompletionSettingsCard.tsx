/**
 * Course Completion and Certificate settings card (P64 Phase 3 §E.5/§E.6,
 * AD-11, D6).
 *
 * What "completing this course" means — which lessons, whether required
 * quizzes and assignments count, a minimum overall score — and whether a
 * certificate is issued for it. Reads `GET …/completion-rule` and writes
 * `PUT …/completion-rule` through `useCompletionRule` /
 * `useUpdateCompletionRule`.
 *
 * Only owners and managers may save. `canEdit` (from the session's
 * organization role) disables the controls up front so nobody sees a Save
 * that can only 403 — but a 403 is still mapped to the `errors:forbidden`
 * copy inline, because the session role is a hint and the server is the
 * authority. A 400 maps onto the field that caused it through
 * `useServerValidation`; anything else shows the error's own
 * `messageKey`, falling back to the generic copy.
 */
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Award, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { toast } from '@/hooks/use-toast';
import { isApiError } from '@api';
import { useServerValidation } from '@forms';
import { useCompletionRule, useUpdateCompletionRule } from '@features/learning';
import type {
  CompletionRuleItem,
  CourseCompletionRule,
  UpdateCompletionRulePayload,
} from '@types';
import {
  getLessonStatusLabelKey,
  getLessonStatusTone,
} from '../utils/course-status.utils';

/* ---------- form schema ---------- */

/** Blank numeric inputs read as "none", never as `0`. */
function optionalNumber(min: number, max: number) {
  return z.preprocess(
    (value) =>
      value === '' || value === undefined || value === null ? undefined : value,
    z.coerce
      .number()
      .min(min, 'validation:min')
      .max(max, 'validation:max')
      .optional()
  );
}

const completionSettingsSchema = z
  .object({
    lessons: z.enum(['all', 'none', 'min']),
    minLessons: z.preprocess(
      (value) =>
        value === '' || value === undefined || value === null
          ? undefined
          : value,
      z.coerce
        .number()
        .int('validation:integer')
        .min(1, 'validation:min')
        .optional()
    ),
    requiredQuizzes: z.boolean(),
    requiredAssignments: z.boolean(),
    requiredQuizIds: z.array(z.string()),
    requiredAssignmentIds: z.array(z.string()),
    minOverallScore: optionalNumber(0, 100),
    certificatesEnabled: z.boolean(),
    certificateMinScore: optionalNumber(0, 100),
  })
  .superRefine((values, ctx) => {
    if (values.lessons === 'min' && values.minLessons === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation:required',
        path: ['minLessons'],
      });
    }
  });

type CompletionSettingsFormData = z.infer<typeof completionSettingsSchema>;

function toFormValues(rule: CourseCompletionRule): CompletionSettingsFormData {
  const lessons = rule.rule.lessons;
  return {
    lessons: typeof lessons === 'number' ? 'min' : lessons,
    minLessons: typeof lessons === 'number' ? lessons : undefined,
    requiredQuizzes: rule.rule.requiredQuizzes,
    requiredAssignments: rule.rule.requiredAssignments,
    requiredQuizIds: rule.quizzes
      .filter((quiz) => quiz.requiredForCompletion)
      .map((quiz) => quiz.id),
    requiredAssignmentIds: rule.assignments
      .filter((assignment) => assignment.requiredForCompletion)
      .map((assignment) => assignment.id),
    minOverallScore: rule.rule.minOverallScore ?? undefined,
    certificatesEnabled: rule.certificatesEnabled,
    certificateMinScore: rule.certificateMinScore ?? undefined,
  };
}

function toPayload(
  data: CompletionSettingsFormData
): UpdateCompletionRulePayload {
  return {
    lessons:
      data.lessons === 'min' ? (data.minLessons as number) : data.lessons,
    requiredQuizzes: data.requiredQuizzes,
    requiredAssignments: data.requiredAssignments,
    requiredQuizIds: data.requiredQuizIds,
    requiredAssignmentIds: data.requiredAssignmentIds,
    minOverallScore: data.minOverallScore ?? null,
    certificatesEnabled: data.certificatesEnabled,
    certificateMinScore: data.certificateMinScore ?? null,
  };
}

/* ---------- component ---------- */

export interface CourseCompletionSettingsCardProps {
  readonly academyId: string;
  readonly courseId: string;
  /** Whether the viewer may save (owner or manager). */
  readonly canEdit: boolean;
}

export function CourseCompletionSettingsCard({
  academyId,
  courseId,
  canEdit,
}: CourseCompletionSettingsCardProps): JSX.Element {
  const { t } = useTranslation();

  const { data, isLoading, error, refetch } = useCompletionRule(
    academyId,
    courseId
  );
  const update = useUpdateCompletionRule(academyId, courseId);

  const form = useForm<CompletionSettingsFormData>({
    resolver: zodResolver(completionSettingsSchema),
    values: data ? toFormValues(data) : undefined,
  });

  useServerValidation(form, update.error ?? null);

  const lessonsMode = form.watch('lessons');
  const requiredQuizzes = form.watch('requiredQuizzes');
  const requiredAssignments = form.watch('requiredAssignments');
  const certificatesEnabled = form.watch('certificatesEnabled');

  const readOnly = !canEdit || update.isPending;

  const onSubmit = async (values: CompletionSettingsFormData) => {
    try {
      await update.mutateAsync(toPayload(values));
      toast({ title: t('course:settings.completion.saved') });
    } catch {
      // Rendered inline below from `update.error`; a validation error is
      // already on its field through `useServerValidation`.
    }
  };

  /** The inline message for anything that is not a field violation. */
  const inlineError = (() => {
    const failure = update.error;
    if (!failure || !isApiError(failure)) return null;
    if (failure.kind === 'validation' && failure.violations?.length) {
      return null;
    }
    if (failure.kind === 'forbidden') {
      return t('errors:forbidden.description');
    }
    return t(failure.messageKey, {
      defaultValue: t('errors:generic.description'),
    });
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award
            className="size-4 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
          {t('course:settings.completion.title')}
        </CardTitle>
        <CardDescription>
          {t('course:settings.completion.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3" aria-busy>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : error || !data ? (
          <ErrorState kind={error?.kind} onRetry={() => refetch()} />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Lessons rule */}
              <FormField
                control={form.control}
                name="lessons"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>
                      {t('course:settings.completion.lessons.label')}
                    </FormLabel>
                    <FormDescription>
                      {t('course:settings.completion.lessons.published', {
                        count: data.publishedLessons,
                      })}
                    </FormDescription>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={readOnly}
                        className="gap-2"
                      >
                        {(['all', 'none', 'min'] as const).map((mode) => (
                          <div
                            key={mode}
                            className="flex items-start gap-3 rounded-lg border border-border p-3"
                          >
                            <RadioGroupItem
                              value={mode}
                              id={`completion-lessons-${mode}`}
                              className="mt-0.5"
                            />
                            <Label
                              htmlFor={`completion-lessons-${mode}`}
                              className="flex-1 cursor-pointer space-y-1 font-normal"
                            >
                              <span className="block text-sm font-medium text-foreground">
                                {t(
                                  `course:settings.completion.lessons.options.${mode}.label`
                                )}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {t(
                                  `course:settings.completion.lessons.options.${mode}.description`
                                )}
                              </span>
                              {mode === 'min' && lessonsMode === 'min' ? (
                                <FormField
                                  control={form.control}
                                  name="minLessons"
                                  render={({ field: minField }) => (
                                    <FormItem className="pt-2 sm:max-w-[10rem]">
                                      <FormControl>
                                        <Input
                                          type="number"
                                          inputMode="numeric"
                                          min={1}
                                          step={1}
                                          disabled={readOnly}
                                          aria-label={t(
                                            'course:settings.completion.lessons.minInputLabel'
                                          )}
                                          {...minField}
                                          value={
                                            minField.value === undefined ||
                                            minField.value === null
                                              ? ''
                                              : String(minField.value)
                                          }
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              ) : null}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Required quizzes */}
              <RequiredItemsSection
                switchName="requiredQuizzes"
                idsName="requiredQuizIds"
                enabled={requiredQuizzes}
                items={data.quizzes}
                readOnly={readOnly}
                labelKey="course:settings.completion.quizzes.label"
                descriptionKey="course:settings.completion.quizzes.description"
                emptyKey="course:settings.completion.quizzes.empty"
                form={form}
              />

              {/* Required assignments */}
              <RequiredItemsSection
                switchName="requiredAssignments"
                idsName="requiredAssignmentIds"
                enabled={requiredAssignments}
                items={data.assignments}
                readOnly={readOnly}
                labelKey="course:settings.completion.assignments.label"
                descriptionKey="course:settings.completion.assignments.description"
                emptyKey="course:settings.completion.assignments.empty"
                form={form}
              />

              {/* Minimum overall score */}
              <FormField
                control={form.control}
                name="minOverallScore"
                render={({ field }) => (
                  <FormItem className="sm:max-w-xs">
                    <FormLabel>
                      {t('course:settings.completion.minOverallScore.label')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={100}
                        disabled={readOnly}
                        placeholder={t(
                          'course:settings.completion.minOverallScore.placeholder'
                        )}
                        {...field}
                        value={
                          field.value === undefined || field.value === null
                            ? ''
                            : String(field.value)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        'course:settings.completion.minOverallScore.description'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Certificates */}
              <div className="space-y-4 border-t border-border pt-6">
                <FormField
                  control={form.control}
                  name="certificatesEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>
                          {t('course:settings.completion.certificates.label')}
                        </FormLabel>
                        <FormDescription>
                          {t(
                            data.certificatesFeatureEnabled
                              ? 'course:settings.completion.certificates.description'
                              : 'course:settings.completion.certificates.featureDisabled'
                          )}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={
                            readOnly || !data.certificatesFeatureEnabled
                          }
                          aria-label={t(
                            'course:settings.completion.certificates.label'
                          )}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {certificatesEnabled ? (
                  <FormField
                    control={form.control}
                    name="certificateMinScore"
                    render={({ field }) => (
                      <FormItem className="sm:max-w-xs">
                        <FormLabel>
                          {t(
                            'course:settings.completion.certificateMinScore.label'
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={100}
                            disabled={readOnly}
                            placeholder={t(
                              'course:settings.completion.certificateMinScore.placeholder'
                            )}
                            {...field}
                            value={
                              field.value === undefined || field.value === null
                                ? ''
                                : String(field.value)
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          {t(
                            'course:settings.completion.certificateMinScore.description'
                          )}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </div>

              {!canEdit ? (
                <p className="text-xs text-muted-foreground">
                  {t('course:settings.completion.ownerOrManagerOnly')}
                </p>
              ) : null}

              {inlineError ? (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{inlineError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={readOnly || !form.formState.isDirty}
                >
                  {update.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Save className="size-4" strokeWidth={2} aria-hidden />
                  )}
                  {t('course:settings.completion.save')}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- required quizzes / assignments ---------- */

interface RequiredItemsSectionProps {
  readonly switchName: 'requiredQuizzes' | 'requiredAssignments';
  readonly idsName: 'requiredQuizIds' | 'requiredAssignmentIds';
  readonly enabled: boolean;
  readonly items: readonly CompletionRuleItem[];
  readonly readOnly: boolean;
  readonly labelKey: string;
  readonly descriptionKey: string;
  readonly emptyKey: string;
  readonly form: ReturnType<typeof useForm<CompletionSettingsFormData>>;
}

function RequiredItemsSection({
  switchName,
  idsName,
  enabled,
  items,
  readOnly,
  labelKey,
  descriptionKey,
  emptyKey,
  form,
}: RequiredItemsSectionProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <FormField
        control={form.control}
        name={switchName}
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
            <div className="space-y-0.5">
              <FormLabel>{t(labelKey)}</FormLabel>
              <FormDescription>{t(descriptionKey)}</FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={readOnly}
                aria-label={t(labelKey)}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {enabled ? (
        <FormField
          control={form.control}
          name={idsName}
          render={({ field }) => (
            <FormItem className="ps-3">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t(emptyKey)}</p>
              ) : (
                <ul className="space-y-2" aria-label={t(labelKey)}>
                  {items.map((item) => {
                    const checked = field.value.includes(item.id);
                    const inputId = `${idsName}-${item.id}`;
                    return (
                      <li key={item.id} className="flex items-center gap-3">
                        <Checkbox
                          id={inputId}
                          checked={checked}
                          disabled={readOnly}
                          onCheckedChange={(next) =>
                            field.onChange(
                              next
                                ? [...field.value, item.id]
                                : field.value.filter((id) => id !== item.id)
                            )
                          }
                        />
                        <Label
                          htmlFor={inputId}
                          className="flex flex-1 cursor-pointer items-center gap-2 font-normal"
                        >
                          <span className="truncate text-sm text-foreground">
                            {item.title}
                          </span>
                          <StatusBadge
                            labelKey={getLessonStatusLabelKey(
                              item.status === 'published'
                                ? 'published'
                                : 'draft'
                            )}
                            tone={getLessonStatusTone(
                              item.status === 'published'
                                ? 'published'
                                : 'draft'
                            )}
                          />
                        </Label>
                      </li>
                    );
                  })}
                </ul>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </div>
  );
}
