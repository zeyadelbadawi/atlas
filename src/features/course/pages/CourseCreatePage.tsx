/**
 * Course Create Page.
 *
 * Guided course creation with form validation and a next-step prompt into
 * the Course Builder once the course exists.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, BookOpen, Loader2, Upload } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
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
import { toast } from '@/hooks/use-toast';
import { useFilePicker } from '@hooks';
import { useServerValidation } from '@forms';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useCreateCourse, useCourseCategories } from '../hooks';
import {
  createCourseSchema,
  type CreateCourseFormData,
} from '../schemas/course.schemas';
import {
  ALLOWED_COURSE_THUMBNAIL_TYPES,
  DEFAULT_COURSE_PRICING_CURRENCY,
  DEFAULT_COURSE_VISIBILITY,
  MAX_COURSE_THUMBNAIL_FILE_SIZE,
} from '../constants/course.constants';
import type { Course, CoursePricing } from '@types';

export default function CourseCreatePage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { academyId } = useParams<{ academyId: string }>();
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    null
  );
  const [createdCourse, setCreatedCourse] = useState<Course | null>(null);

  const {
    mutateAsync: createCourse,
    isPending,
    error: mutationError,
  } = useCreateCourse(academyId ?? '');
  const { data: categoriesData } = useCourseCategories(academyId ?? '');
  const categories = categoriesData?.items ?? [];

  const form = useForm<CreateCourseFormData>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      title: '',
      slug: '',
      shortDescription: '',
      description: '',
      categoryId: undefined,
      visibility: DEFAULT_COURSE_VISIBILITY,
      pricingType: 'free',
      pricingAmount: undefined,
      pricingCurrency: DEFAULT_COURSE_PRICING_CURRENCY,
    },
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

  const onSubmit = async (data: CreateCourseFormData) => {
    if (!academyId) return;

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
        categoryId: data.categoryId,
        pricing,
        visibility: data.visibility,
      });
      toast({
        title: t('course:create.success'),
        description: t('common:states.success.description'),
      });
      setCreatedCourse(course);
    } catch {
      toast({
        title: t('course:create.error'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    if (academyId) navigate(buildPath(DASHBOARD_ROUTES.academyCourses, { academyId }));
  };

  if (createdCourse && academyId) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="course:create.title"
          descriptionKey="course:create.subtitle"
        />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-pill bg-success-surface text-success">
              <BookOpen className="size-6" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="space-y-1.5">
              <h3 className="font-display text-base font-semibold text-foreground">
                {t('course:create.success')}
              </h3>
              <p className="text-sm font-medium text-muted-foreground">
                {t('course:create.successNextStepTitle')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('course:create.successNextStepDescription')}
              </p>
            </div>
            <Button
              onClick={() =>
                navigate(
                  buildPath(DASHBOARD_ROUTES.academyCourseBuilder, {
                    academyId,
                    courseId: createdCourse.id,
                  })
                )
              }
            >
              {t('course:create.continueToBuilder')}
              <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey="course:create.title"
        descriptionKey="course:create.subtitle"
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
                      />
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
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('course:create.categoryLabel')}{' '}
                        <span className="text-xs text-muted-foreground">
                          ({t('course:create.optional')})
                        </span>
                      </FormLabel>
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
                      <FormLabel>{t('course:create.pricingTypeLabel')}</FormLabel>
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
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
            >
              {t('course:create.cancelButton')}
            </Button>
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
    </PageContainer>
  );
}
