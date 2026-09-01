/**
 * Course Edit Page.
 *
 * Edits an existing course's identity, thumbnail, category, pricing and
 * visibility, and links onward to the Builder and Settings for this course.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, Upload } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { Button } from '@/components/ui/button';
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
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useFilePicker, useUnsavedChanges } from '@hooks';
import { useServerValidation } from '@forms';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useCourse, useUpdateCourse, useCourseCategories } from '../hooks';
import { CourseInstructorsCard } from '../components/CourseInstructorsCard';
import {
  updateCourseSchema,
  type UpdateCourseFormData,
} from '../schemas/course.schemas';
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
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    null
  );

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
  const { data: categoriesData } = useCourseCategories(academyId ?? '');
  const categories = categoriesData?.items ?? [];

  const form = useForm<UpdateCourseFormData>({
    resolver: zodResolver(updateCourseSchema),
    values: course
      ? {
          title: course.title,
          slug: course.slug,
          shortDescription: course.shortDescription ?? '',
          description: course.description ?? '',
          thumbnail: course.thumbnail,
          categoryId: course.categoryId,
          visibility: course.visibility,
          pricingType: course.pricing.type,
          pricingAmount: course.pricing.amount,
          pricingCurrency: course.pricing.currency ?? DEFAULT_COURSE_PRICING_CURRENCY,
        }
      : undefined,
  });

  useServerValidation(form, mutationError);
  useUnsavedChanges({
    isDirty: form.formState.isDirty,
    messageKey: 'course:edit.unsavedChanges',
  });

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

  const onSubmit = async (data: UpdateCourseFormData) => {
    if (!academyId || !courseId) return;

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
          categoryId: data.categoryId,
          pricing,
          visibility: data.visibility,
        },
      });
      toast({
        title: t('course:edit.success'),
        description: t('common:states.success.description'),
      });
    } catch {
      toast({
        title: t('course:edit.error'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

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

  return (
    <PageContainer>
      <PageHeader
        title={course.title}
        titleKey="course:edit.title"
        descriptionKey="course:edit.subtitle"
        actions={
          academyId && courseId ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  navigate(
                    buildPath(DASHBOARD_ROUTES.academyCourseBuilder, {
                      academyId,
                      courseId,
                    })
                  )
                }
              >
                {t('course:edit.goToBuilder')}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  navigate(
                    buildPath(DASHBOARD_ROUTES.academyCourseSettings, {
                      academyId,
                      courseId,
                    })
                  )
                }
              >
                {t('course:edit.goToSettings')}
              </Button>
            </div>
          ) : undefined
        }
      />

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
              <CardTitle>{t('course:edit.configuration')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('course:create.categoryLabel')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('course:create.categoryPlaceholder')}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('course:create.visibilityLabel')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <FormLabel>{t('course:create.pricingTypeLabel')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
