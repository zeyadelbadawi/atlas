/**
 * Blog Editor Page.
 *
 * Handles both create and edit — the mode is derived from whether a
 * `:postId` route param is present. Featured image goes through the same
 * `useFilePicker` + base64 pattern used everywhere else in Atlas, since no
 * upload endpoint exists anywhere in this codebase.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Upload } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
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
import { useFilePicker, useUnsavedChanges } from '@hooks';
import { useServerValidation } from '@forms';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useBlogPost, useCreateBlogPost, useUpdateBlogPost } from '../hooks';
import { blogPostSchema, type BlogPostFormData } from '../schemas/blog.schemas';
import {
  ALLOWED_BLOG_FEATURED_IMAGE_TYPES,
  MAX_BLOG_FEATURED_IMAGE_SIZE,
} from '../constants/blog.constants';

export default function BlogEditorPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();
  const isEditMode = !!postId;

  const {
    data: existingPost,
    isLoading: isLoadingPost,
    error: loadError,
    refetch,
  } = useBlogPost(postId ?? '', { enabled: isEditMode });

  const {
    mutateAsync: createPost,
    isPending: isCreating,
    error: createError,
  } = useCreateBlogPost();
  const {
    mutateAsync: updatePost,
    isPending: isUpdating,
    error: updateError,
  } = useUpdateBlogPost();

  const [featuredImagePreview, setFeaturedImagePreview] = useState<
    string | null
  >(null);

  const form = useForm<BlogPostFormData>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      featuredImage: undefined,
      category: '',
      tags: '',
    },
  });

  useServerValidation(form, isEditMode ? updateError : createError);
  useUnsavedChanges({
    isDirty: form.formState.isDirty,
    messageKey: 'common:unsavedChanges',
  });

  useEffect(() => {
    if (existingPost) {
      form.reset({
        title: existingPost.title,
        slug: existingPost.slug,
        excerpt: existingPost.excerpt ?? '',
        content: existingPost.content,
        featuredImage: existingPost.featuredImage,
        category: existingPost.category ?? '',
        tags: existingPost.tags.join(', '),
      });
      setFeaturedImagePreview(existingPost.featuredImage ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingPost]);

  const imagePicker = useFilePicker({
    accept: ALLOWED_BLOG_FEATURED_IMAGE_TYPES.join(','),
  });

  useEffect(() => {
    const file = imagePicker.files?.[0];
    if (!file) return;

    if (file.size > MAX_BLOG_FEATURED_IMAGE_SIZE) {
      form.setError('featuredImage', {
        type: 'validation',
        message: 'blog:editor.imageTooLarge',
      });
      imagePicker.clearFiles();
      return;
    }
    if (!ALLOWED_BLOG_FEATURED_IMAGE_TYPES.includes(file.type)) {
      form.setError('featuredImage', {
        type: 'validation',
        message: 'blog:editor.imageInvalidType',
      });
      imagePicker.clearFiles();
      return;
    }

    form.clearErrors('featuredImage');
    const previewUrl = imagePicker.getPreviewUrl(file);
    setFeaturedImagePreview((previous) => {
      if (previous) imagePicker.revokePreviewUrl(previous);
      return previewUrl;
    });

    const reader = new FileReader();
    reader.onload = () => {
      form.setValue('featuredImage', reader.result as string, {
        shouldDirty: true,
      });
    };
    reader.readAsDataURL(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagePicker.files]);

  const onSubmit = async (data: BlogPostFormData) => {
    const tags = data.tags
      ? data.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

    try {
      if (isEditMode && postId) {
        await updatePost({
          id: postId,
          payload: {
            title: data.title,
            slug: data.slug,
            excerpt: data.excerpt || undefined,
            content: data.content,
            featuredImage: data.featuredImage,
            category: data.category || undefined,
            tags,
          },
        });
        toast({
          title: t('blog:editor.updateSuccess'),
          description: t('common:states.success.description'),
        });
        navigate(buildPath(DASHBOARD_ROUTES.blogPost, { postId }));
      } else {
        const created = await createPost({
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt || undefined,
          content: data.content,
          featuredImage: data.featuredImage,
          category: data.category || undefined,
          tags,
        });
        toast({
          title: t('blog:editor.createSuccess'),
          description: t('common:states.success.description'),
        });
        navigate(buildPath(DASHBOARD_ROUTES.blogPost, { postId: created.id }));
      }
    } catch {
      toast({
        title: t('blog:editor.saveError'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

  if (isEditMode && isLoadingPost) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96" />
        </div>
      </PageContainer>
    );
  }

  if (isEditMode && (loadError || !existingPost)) {
    return (
      <PageContainer>
        <PageHeader titleKey="blog:editor.editTitle" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  const isPending = isCreating || isUpdating;

  return (
    <PageContainer>
      <PageHeader
        titleKey={isEditMode ? 'blog:editor.editTitle' : 'blog:editor.createTitle'}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('blog:editor.contentSection')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('blog:editor.titleLabel')}</FormLabel>
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
                    <FormLabel>{t('blog:editor.slugLabel')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('blog:editor.slugHelp')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('blog:editor.excerptLabel')}{' '}
                      <span className="text-xs text-muted-foreground">
                        ({t('blog:editor.optional')})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('blog:editor.contentLabel')}</FormLabel>
                    <FormControl>
                      <Textarea rows={10} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('blog:editor.metadataSection')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="featuredImage"
                render={() => (
                  <FormItem>
                    <FormLabel>
                      {t('blog:editor.featuredImageLabel')}{' '}
                      <span className="text-xs text-muted-foreground">
                        ({t('blog:editor.optional')})
                      </span>
                    </FormLabel>
                    {featuredImagePreview ? (
                      <div className="space-y-3">
                        <img
                          src={featuredImagePreview}
                          alt=""
                          className="h-32 w-auto rounded-lg border border-border"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={imagePicker.openFilePicker}
                        >
                          {t('blog:editor.changeImage')}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={imagePicker.openFilePicker}
                      >
                        <Upload className="size-4" strokeWidth={2} aria-hidden />
                        {t('blog:editor.uploadImage')}
                      </Button>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('blog:editor.categoryLabel')}{' '}
                        <span className="text-xs text-muted-foreground">
                          ({t('blog:editor.optional')})
                        </span>
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
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('blog:editor.tagsLabel')}{' '}
                        <span className="text-xs text-muted-foreground">
                          ({t('blog:editor.optional')})
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('blog:editor.tagsPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => navigate(-1)}
            >
              {t('blog:editor.cancelButton')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {t('blog:editor.saveButton')}
            </Button>
          </div>
        </form>
      </Form>
    </PageContainer>
  );
}
