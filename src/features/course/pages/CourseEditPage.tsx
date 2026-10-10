/**
 * Course Edit Page.
 *
 * Edits an existing course's identity, thumbnail, pricing and
 * visibility, and links onward to the Builder and Settings for this course.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FileText,
  Loader2,
  Save,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { SectionTabs } from '@components/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useFilePicker, useUnsavedChanges } from '@hooks';
import { saveViaForm } from '@utils';
import { CourseLanguageSelect } from '../components/CourseLanguageSelect';
import { LinesTextarea, normalizeLines } from '../components/LinesTextarea';
import {
  parseCourseLanguages,
  serializeCourseLanguages,
} from '../constants/course-languages';
import { useServerValidation } from '@forms';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useCourse, useUpdateCourse } from '../hooks';
import { CourseInstructorsCard } from '../components/CourseInstructorsCard';
import { getCourseEditorTabs } from '../utils/course-navigation.utils';
import {
  updateCourseSchema,
  type UpdateCourseFormData,
} from '../schemas/course.schemas';
import type { BreadcrumbItem } from '@types';
import {
  ALLOWED_COURSE_THUMBNAIL_TYPES,
  DEFAULT_COURSE_PRICING_CURRENCY,
  MAX_COURSE_THUMBNAIL_FILE_SIZE,
} from '../constants/course.constants';
import type { CoursePricing } from '@types';

export default function CourseEditPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { academyId, courseId } = useParams<{
    academyId: string;
    courseId: string;
  }>();
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const {
    data: course,
    isLoading,
    error: loadError,
    refetch,
  } = useCourse(academyId ?? '', courseId ?? '');
  const {
    mutateAsync: updateCourse,
    isPending,
    error: mutationError,
  } = useUpdateCourse(academyId ?? '');

  const form = useForm<UpdateCourseFormData>({
    resolver: zodResolver(updateCourseSchema),
    values: course
      ? {
          title: course.title,
          slug: course.slug,
          shortDescription: course.shortDescription ?? '',
          description: course.description ?? '',
          thumbnail: course.thumbnail,
          visibility: course.visibility,
          pricingType: course.pricing.type,
          pricingAmount: course.pricing.amount,
          pricingCurrency:
            course.pricing.currency ?? DEFAULT_COURSE_PRICING_CURRENCY,
          level: course.level,
          language: course.language ?? '',
          outcomes: course.outcomes ? [...course.outcomes] : [],
          requirements: course.requirements ? [...course.requirements] : [],
        }
      : undefined,
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

  // `save` resolves false after a failure it already reported, so both the
  // Save button and the unsaved-changes dialog's "Save and leave" share it.
  const save = async (data: UpdateCourseFormData): Promise<boolean> => {
    if (!academyId || !courseId) return false;

    const pricing: CoursePricing =
      data.pricingType === 'paid'
        ? {
            type: 'paid',
            amount: data.pricingAmount,
            currency: data.pricingCurrency || DEFAULT_COURSE_PRICING_CURRENCY,
          }
        : { type: 'free' };

    try {
      await updateCourse({
        courseId,
        payload: {
          title: data.title,
          slug: data.slug,
          shortDescription: data.shortDescription || undefined,
          description: data.description || undefined,
          thumbnail: data.thumbnail,
          // No `categoryId`: the field is not shown to Academy Owners and
          // Managers (Task 9). Omitting it keeps the course's existing
          // category — sending '' would disconnect it.
          pricing,
          visibility: data.visibility,
          level: data.level,
          // `LinesTextarea` normalises on blur; normalising again here
          // covers the submit that never blurred (Enter, or a click the
          // browser dispatched before the blur landed) so a half-typed
          // blank line can never reach the API as an empty item.
          language: serializeCourseLanguages(
            parseCourseLanguages(data.language)
          ),
          outcomes: normalizeLines((data.outcomes ?? []).join('\n')),
          requirements: normalizeLines((data.requirements ?? []).join('\n')),
        },
      });
      // The saved values are the new baseline: clean now, not after the
      // refetch catches up.
      form.reset(data);
      toast({
        title: t('course:edit.success'),
        description: t('common:states.success.description'),
      });
      return true;
    } catch {
      toast({
        title: t('course:edit.error'),
        description: t('errors:generic.description'),
        variant: 'destructive',
      });
      return false;
    }
  };

  const onSubmit = async (data: UpdateCourseFormData) => {
    await save(data);
  };

  useUnsavedChanges({
    isDirty: form.formState.isDirty,
    onSave: () => saveViaForm(form, save),
  });

  const handleCancel = () => {
    if (academyId) {
      navigate(buildPath(DASHBOARD_ROUTES.academyCourses, { academyId }));
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (loadError || !course) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="course:edit.title"
          descriptionKey="course:edit.subtitle"
        />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const currentThumbnail = thumbnailPreview ?? course.thumbnail;

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'course:list.title',
      path: buildPath(DASHBOARD_ROUTES.academyCourses, {
        academyId: academyId ?? '',
      }),
    },
    { labelKey: 'course:edit.title', label: course.title },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={course.title}
        titleKey="course:edit.title"
        descriptionKey="course:edit.subtitle"
        breadcrumbs={breadcrumbs}
      />

      {academyId && courseId ? (
        <SectionTabs items={getCourseEditorTabs(academyId, courseId)} />
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText
                  className="size-4 text-muted-foreground"
                  strokeWidth={1.75}
                  aria-hidden
                />
                {t('course:create.basicInformation')}
              </CardTitle>
              <CardDescription>
                {t('course:edit.basicInformationDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('course:create.titleLabel')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('course:create.slugHelp')}
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
                      {t('course:create.shortDescriptionLabel')}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>{t('course:create.descriptionLabel')}</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
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
                    {currentThumbnail ? (
                      <div className="space-y-3">
                        <img
                          src={currentThumbnail}
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
                        <Upload
                          className="size-4"
                          strokeWidth={2}
                          aria-hidden
                        />
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
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal
                  className="size-4 text-muted-foreground"
                  strokeWidth={1.75}
                  aria-hidden
                />
                {t('course:edit.configuration')}
              </CardTitle>
              <CardDescription>
                {t('course:edit.configurationDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('course:create.visibilityLabel')}
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
                      <FormLabel>
                        {t('course:create.pricingTypeLabel')}
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
                              <SelectItem value="EGP">EGP</SelectItem>
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

          <Card>
            <CardHeader>
              <CardTitle>{t('course:edit.catalogTitle')}</CardTitle>
              <CardDescription>
                {t('course:edit.catalogDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('course:edit.levelLabel')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('course:edit.levelPlaceholder')}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="beginner">
                            {t('course:level.beginner')}
                          </SelectItem>
                          <SelectItem value="intermediate">
                            {t('course:level.intermediate')}
                          </SelectItem>
                          <SelectItem value="advanced">
                            {t('course:level.advanced')}
                          </SelectItem>
                          <SelectItem value="all_levels">
                            {t('course:level.all_levels')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('course:edit.languageLabel')}</FormLabel>
                      <FormControl>
                        {/* The field stays the one comma-separated string
                            the column has always held; the picker just
                            stops anyone typing a malformed one. */}
                        <CourseLanguageSelect
                          value={parseCourseLanguages(field.value)}
                          onChange={(next) =>
                            field.onChange(serializeCourseLanguages(next) ?? '')
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {t('course:edit.languageHelp')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="outcomes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('course:edit.outcomesLabel')}</FormLabel>
                    <FormControl>
                      <LinesTextarea
                        rows={4}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t('course:edit.outcomesPlaceholder')}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('course:edit.onemPerLineHelp')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('course:edit.requirementsLabel')}</FormLabel>
                    <FormControl>
                      <LinesTextarea
                        rows={4}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t('course:edit.requirementsPlaceholder')}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('course:edit.onemPerLineHelp')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
            >
              {t('course:edit.cancelButton')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t('course:edit.saving')}
                </>
              ) : (
                <>
                  <Save className="size-4" strokeWidth={2} aria-hidden />
                  {t('course:edit.saveButton')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {academyId ? (
        <div className="mt-6">
          <CourseInstructorsCard academyId={academyId} course={course} />
        </div>
      ) : null}
    </PageContainer>
  );
}
