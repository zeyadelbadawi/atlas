/**
 * Wizard step 1 — Basics (W6): title, web address (slug) and short
 * description.
 *
 * CREATE (no course yet): submitting creates the course as a private,
 * free DRAFT — the create DTO requires visibility and pricing, and the
 * Pricing step changes them later — with an idempotency key, so a double
 * submit or a retried request returns the same course. The page then
 * REPLACES the URL with the new course's setup address, so Back or a
 * refresh can never create it twice.
 *
 * EDIT (course exists): submitting PATCHes only the changed fields.
 */
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { toast } from '@/hooks/use-toast';
import { useSlugSuggestion, useUnsavedChanges } from '@hooks';
import { useServerValidation } from '@forms';
import { isApiError } from '@api';
import type { Course } from '@types';
import { useCreateCourse } from '../hooks';
import {
  DEFAULT_COURSE_VISIBILITY,
  MAX_COURSE_SHORT_DESCRIPTION_LENGTH,
  MAX_COURSE_SLUG_LENGTH,
  MAX_COURSE_TITLE_LENGTH,
} from '../constants/course.constants';
import {
  clearCourseCreateIdempotencyKey,
  getCourseCreateIdempotencyKey,
} from './create-idempotency-key';
import { useStepSave } from './useStepSave';
import { WizardStepFooter } from './WizardStepFooter';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const basicsStepSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'validation:required')
    .max(MAX_COURSE_TITLE_LENGTH, 'validation:maxLength'),
  slug: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_COURSE_SLUG_LENGTH, 'validation:maxLength')
    .regex(SLUG_REGEX, 'validation:invalidSlug'),
  shortDescription: z
    .string()
    .max(MAX_COURSE_SHORT_DESCRIPTION_LENGTH, 'validation:maxLength')
    .optional(),
});

type BasicsStepValues = z.infer<typeof basicsStepSchema>;

export interface BasicsStepProps {
  readonly academyId: string;
  /** Absent = create mode. */
  readonly course?: Course;
  readonly onCreated?: (course: Course) => void;
  readonly onNext?: () => void;
  /** Create mode: leave the wizard (back to the course list). */
  readonly onCancel?: () => void;
}

export function BasicsStep(props: BasicsStepProps): JSX.Element {
  return props.course ? (
    <EditBasics {...props} course={props.course} />
  ) : (
    <CreateBasics {...props} />
  );
}

function CreateBasics({
  academyId,
  onCreated,
  onCancel,
}: BasicsStepProps): JSX.Element {
  const { t } = useTranslation();
  const create = useCreateCourse(academyId);
  const form = useForm<BasicsStepValues>({
    resolver: zodResolver(basicsStepSchema),
    defaultValues: { title: '', slug: '', shortDescription: '' },
  });
  useServerValidation(form, create.error ?? null);
  const { markSaved } = useUnsavedChanges({ isDirty: form.formState.isDirty });

  // The slug follows the title until the author edits it (see
  // `useSlugSuggestion`); uniqueness is the server's 409, shown on the field.
  const slugSuggestion = useSlugSuggestion({
    title: form.watch('title'),
    slug: form.watch('slug'),
    maxLength: MAX_COURSE_SLUG_LENGTH,
    onSuggest: (next) =>
      form.setValue('slug', next, { shouldDirty: true, shouldValidate: true }),
  });

  const onSubmit = async (values: BasicsStepValues) => {
    try {
      const course = await create.mutateAsync({
        title: values.title.trim(),
        slug: values.slug,
        shortDescription: values.shortDescription?.trim() || undefined,
        visibility: DEFAULT_COURSE_VISIBILITY,
        pricing: { type: 'free' },
        idempotencyKey: getCourseCreateIdempotencyKey(academyId),
      });
      clearCourseCreateIdempotencyKey(academyId);
      toast({ title: t('course:create.success') });
      markSaved();
      onCreated?.(course);
    } catch (error) {
      if (isApiError(error) && error.code === 'ENTITLEMENT_LIMIT_REACHED') {
        toast({
          title: t('course:create.errors.limitReachedTitle'),
          description: t('course:create.errors.limitReachedDescription'),
          variant: 'destructive',
        });
        return;
      }
      if (
        isApiError(error) &&
        error.kind === 'validation' &&
        error.violations?.length
      ) {
        return; // Shown on the fields.
      }
      toast({
        title: t('course:create.error'),
        description: t('errors:generic.description'),
        variant: 'destructive',
      });
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        <BasicsFields
          form={form}
          onSlugEdited={slugSuggestion.onSlugEdited}
          slugHelpKey={
            slugSuggestion.isCustomized
              ? 'course:create.slugHelp'
              : 'course:create.slugSuggested'
          }
        />
        <WizardStepFooter
          onBack={onCancel}
          backLabel={t('course:create.cancelButton')}
          nextType="submit"
          nextLabel={t('course:create.createButton')}
          pending={create.isPending}
        />
      </form>
    </Form>
  );
}

function EditBasics({
  academyId,
  course,
  onNext,
}: BasicsStepProps & { readonly course: Course }): JSX.Element {
  const form = useForm<BasicsStepValues>({
    resolver: zodResolver(basicsStepSchema),
    defaultValues: {
      title: course.title,
      slug: course.slug,
      shortDescription: course.shortDescription ?? '',
    },
  });
  const { save, markSaved, isSaving } = useStepSave({
    academyId,
    courseId: course.id,
    form,
    toPayload: (values, dirty) => ({
      ...(dirty.title ? { title: values.title.trim() } : {}),
      ...(dirty.slug ? { slug: values.slug } : {}),
      // '' clears it (the server stores what it is sent).
      ...(dirty.shortDescription
        ? { shortDescription: values.shortDescription?.trim() ?? '' }
        : {}),
    }),
  });

  const onSubmit = async (values: BasicsStepValues) => {
    if (!(await save(values))) return;
    markSaved();
    onNext?.();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        <BasicsFields form={form} slugHelpKey="course:create.slugHelp" />
        <WizardStepFooter nextType="submit" pending={isSaving} />
      </form>
    </Form>
  );
}

function BasicsFields({
  form,
  onSlugEdited,
  slugHelpKey,
}: {
  readonly form: ReturnType<typeof useForm<BasicsStepValues>>;
  readonly onSlugEdited?: () => void;
  readonly slugHelpKey: string;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('course:create.titleLabel')}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('course:create.titlePlaceholder')}
                autoComplete="off"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="slug"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('course:create.slugLabel')}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('course:create.slugPlaceholder')}
                {...field}
                // ASCII and part of a URL: left-to-right even on an Arabic page.
                dir="ltr"
                autoComplete="off"
                onChange={(event) => {
                  onSlugEdited?.();
                  field.onChange(event);
                }}
              />
            </FormControl>
            <FormDescription>{t(slugHelpKey)}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="shortDescription"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('course:create.shortDescriptionLabel')}{' '}
              <span className="text-xs text-muted-foreground">
                ({t('course:create.optional')})
              </span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t('course:create.shortDescriptionPlaceholder')}
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
