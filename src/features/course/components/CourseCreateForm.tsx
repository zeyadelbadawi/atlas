/**
 * Course Create Form.
 *
 * The course creation form — title, slug (following the title until
 * edited), descriptions, thumbnail, visibility and pricing —
 * extracted from `CourseCreatePage` so the New Customer Onboarding
 * shell's First-course step creates a course with the SAME form. The
 * course is created as the backend's default (a draft); what happens next
 * is the caller's (`onCreated`).
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldHelp } from '@components/feedback';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useFilePicker, useSlugSuggestion, useUnsavedChanges } from '@hooks';
import { useServerValidation } from '@forms';
import { isApiError } from '@api';
import { useCreateCourse } from '../hooks';
import {
  createCourseSchema,
  type CreateCourseFormData,
} from '../schemas/course.schemas';
import {
  ALLOWED_COURSE_THUMBNAIL_TYPES,
  DEFAULT_COURSE_PRICING_CURRENCY,
  DEFAULT_COURSE_VISIBILITY,
  MAX_COURSE_SLUG_LENGTH,
  MAX_COURSE_THUMBNAIL_FILE_SIZE,
} from '../constants/course.constants';
import type { Course, CoursePricing } from '@types';

export interface CourseCreateFormProps {
  readonly academyId: string;
  /** Called with the created course. */
  readonly onCreated: (course: Course) => void;
  /** The secondary action beside Create. Absent, only Create is shown (the onboarding shell has its own Skip/Back). */
  readonly onCancel?: () => void;
  readonly cancelLabelKey?: string;
}

export function CourseCreateForm({
  academyId,
  onCreated,
  onCancel,
  cancelLabelKey = 'course:create.cancelButton',
}: CourseCreateFormProps): JSX.Element {
  const { t } = useTranslation();
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const {
    mutateAsync: createCourse,
    isPending,
    error: mutationError,
  } = useCreateCourse(academyId);

  const form = useForm<CreateCourseFormData>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      title: '',
      slug: '',
      shortDescription: '',
      description: '',
      visibility: DEFAULT_COURSE_VISIBILITY,
      pricingType: 'free',
      pricingAmount: undefined,
      pricingCurrency: DEFAULT_COURSE_PRICING_CURRENCY,
    },
  });

  // Warns before this editor is left with unsaved work — both on
  // in-app navigation (via the shared registry the route blocker
  // reads) and on tab close or refresh.
  const { markSaved } = useUnsavedChanges({
    isDirty: form.formState.isDirty,
  });

  useServerValidation(form, mutationError);

  const thumbnailPicker = useFilePicker({
    accept: ALLOWED_COURSE_THUMBNAIL_TYPES.join(','),
  });

  useEffect(() => {
    const file = thumbnailPicker.files?.[0];
    if (!file) return;

    if (file.size > MAX_COURSE_THUMBNAIL_FILE_SIZE) {
      form.setError('thumbnail', {
        type: 'validation',
        message: 'course:create.thumbnailTooLarge',
      });
      thumbnailPicker.clearFiles();
      return;
    }
    if (!ALLOWED_COURSE_THUMBNAIL_TYPES.includes(file.type)) {
      form.setError('thumbnail', {
        type: 'validation',
        message: 'course:create.thumbnailInvalidType',
      });
      thumbnailPicker.clearFiles();
      return;
    }

    form.clearErrors('thumbnail');
    const previewUrl = thumbnailPicker.getPreviewUrl(file);
    setThumbnailPreview((previous) => {
      if (previous) thumbnailPicker.revokePreviewUrl(previous);
      return previewUrl;
    });

    const reader = new FileReader();
    reader.onload = () => {
      form.setValue('thumbnail', reader.result as string, {
        shouldDirty: true,
      });
    };
    reader.readAsDataURL(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbnailPicker.files]);

  const pricingType = form.watch('pricingType');

  /*
    P55 — the URL slug follows the course title until the instructor edits
    it. No availability endpoint is called here, deliberately: course slug
    uniqueness is per-academy and is enforced by the `@@unique([academyId,
    slug])` constraint, surfaced as a real 409 (`errors.course.slugTaken`)
    the form already reports. Inventing a "check this course slug" API
    would add a second, weaker uniqueness opinion that the database would
    overrule anyway — and unlike a subdomain (globally unique, allocated
    before provisioning runs), a colliding course slug is an ordinary
    recoverable error at submit, not a wasted onboarding.
  */
  const titleValue = form.watch('title');
  const slugValue = form.watch('slug');
  const slugSuggestion = useSlugSuggestion({
    title: titleValue,
    slug: slugValue,
    maxLength: MAX_COURSE_SLUG_LENGTH,
    onSuggest: (next) =>
      form.setValue('slug', next, { shouldDirty: true, shouldValidate: true }),
  });

  const onSubmit = async (data: CreateCourseFormData) => {
    const pricing: CoursePricing =
      data.pricingType === 'paid'
        ? {
            type: 'paid',
            amount: data.pricingAmount,
            currency: data.pricingCurrency || DEFAULT_COURSE_PRICING_CURRENCY,
          }
        : { type: 'free' };

    try {
      const course = await createCourse({
        title: data.title,
        slug: data.slug,
        shortDescription: data.shortDescription || undefined,
        description: data.description || undefined,
        thumbnail: data.thumbnail,
        pricing,
        visibility: data.visibility,
      });
      toast({
        title: t('course:create.success'),
        description: t('common:states.success.description'),
      });
      // Created: the caller navigates to the new course; the guard must not
      // ask about the form that was just submitted.
      markSaved();
      onCreated(course);
    } catch (caughtError) {
      // Phase 2 — a plan-limit rejection has its own stable `code`, never
      // shown as the same generic message every other failure gets here.
      if (
        isApiError(caughtError) &&
        caughtError.code === 'ENTITLEMENT_LIMIT_REACHED'
      ) {
        toast({
          title: t('course:create.errors.limitReachedTitle'),
          description: t('course:create.errors.limitReachedDescription'),
          variant: 'destructive',
        });
        return;
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('course:create.basicInformation')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('course:create.titleLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('course:create.titlePlaceholder')}
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
                      // A course slug is ASCII and appears in a URL, so it
                      // reads left-to-right even on an Arabic page.
                      dir="ltr"
                      onChange={(event) => {
                        // Latch before applying — see `useSlugSuggestion`.
                        slugSuggestion.onSlugEdited();
                        field.onChange(event);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    {t(
                      slugSuggestion.isCustomized
                        ? 'course:create.slugHelp'
                        : 'course:create.slugSuggested'
                    )}
                  </FormDescription>
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
                      placeholder={t(
                        'course:create.shortDescriptionPlaceholder'
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('course:create.descriptionLabel')}{' '}
                    <span className="text-xs text-muted-foreground">
                      ({t('course:create.optional')})
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder={t('course:create.descriptionPlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="thumbnail"
              render={() => (
                <FormItem>
                  <FormLabel>{t('course:create.thumbnailLabel')}</FormLabel>
                  <FormDescription>
                    {t('course:create.thumbnailHelp')}
                  </FormDescription>
                  {thumbnailPreview ? (
                    <div className="space-y-3">
                      <img
                        src={thumbnailPreview}
                        alt=""
                        className="h-24 w-auto rounded-lg border border-border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={thumbnailPicker.openFilePicker}
                      >
                        {t('course:create.changeThumbnail')}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={thumbnailPicker.openFilePicker}
                    >
                      <Upload className="size-4" strokeWidth={2} aria-hidden />
                      {t('course:create.uploadThumbnail')}
                    </Button>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('course:create.configuration')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      {t('course:create.visibilityLabel')}
                      <FieldHelp contentKey="course:create.help.visibility" />
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="public">
                          {t('course:visibility.public')}
                        </SelectItem>
                        <SelectItem value="private">
                          {t('course:visibility.private')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="pricingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      {t('course:create.pricingTypeLabel')}
                      <FieldHelp contentKey="course:create.help.pricingType" />
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="free">
                          {t('course:pricing.free')}
                        </SelectItem>
                        <SelectItem value="paid">
                          {t('course:pricing.paid')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {pricingType === 'paid' && (
                <>
                  <FormField
                    control={form.control}
                    name="pricingAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('course:create.priceLabel')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder={t('course:create.pricePlaceholder')}
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pricingCurrency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('course:create.currencyLabel')}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="AED">AED</SelectItem>
                            <SelectItem value="SAR">SAR</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isPending}
            >
              {t(cancelLabelKey)}
            </Button>
          ) : null}
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t('course:create.creating')}
              </>
            ) : (
              <>
                <BookOpen className="size-4" strokeWidth={2} aria-hidden />
                {t('course:create.createButton')}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
