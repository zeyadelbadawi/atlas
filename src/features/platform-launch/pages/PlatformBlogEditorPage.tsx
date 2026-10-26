/**
 * B3 — Blog post editor (`/dashboard/platform/blog/new`, `/blog/:postId`).
 *
 * English and Arabic tabs (title, excerpt, Markdown body with toolbar and a
 * live preview from the public renderer, cover description, search title
 * and description, each with a counter); post settings (slug, type, topic,
 * featured, author), cover upload, related posts (≤ 3) and publishing.
 *
 * Saving sends the `version` the editor read; a 409 means someone else
 * saved first — nothing is overwritten and the page says so, with a way to
 * reload. Publishing (now or scheduled) needs both languages complete
 * (checked here first, enforced by the server). Unsaved edits are guarded
 * on navigation and on tab close. The route guard hides the page; the
 * API's PlatformOwnerGuard + RLS are the control.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Archive,
  CalendarClock,
  ChevronDown,
  Eye,
  ExternalLink,
  Loader2,
  RotateCcw,
  Save,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@app/providers';
import { useDateFormatter, useLanguage, useUnsavedChanges } from '@hooks';
import { cn, toErrorsNamespaceKey } from '@utils';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { appMarketingHref } from '@app/routes/marketing-href';
import type { ApiError } from '@api';
import type { BreadcrumbItem } from '@types';
import {
  useBlogPostTransition,
  useCreateBlogPost,
  useDeleteBlogPost,
  usePlatformBlogPost,
  useUpdateBlogPost,
  useUploadBlogImage,
  type BlogTransition,
} from '../hooks/usePlatformBlog';
import {
  BLOG_LOCALES,
  BLOG_POST_KINDS,
  BLOG_TOPICS,
  type BlogCoverImage,
  type BlogLocale,
  type BlogPost,
  type BlogPostKind,
  type BlogPostWritePayload,
  type BlogTopic,
  type BlogTranslation,
} from '../types';
import {
  BLOG_LIMITS,
  K,
  blogStatusTone,
  fromLocalInput,
  isSlugValid,
  isStaleError,
  isTranslationEmpty,
  slugify,
  toLocalInput,
  translationFields,
  trimTranslation,
  validateTranslation,
  type BlogTranslationField,
} from '../utils/launch.utils';
import { Field } from '../components/fields';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { CoverImageField } from '../components/CoverImageField';
import { RelatedPostsPicker } from '../components/RelatedPostsPicker';
import { BlogPreviewDialog } from '../components/BlogPreviewDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';

const DEFAULT_AUTHOR = 'Atlas team';

export interface BlogEditorState {
  readonly slug: string;
  readonly kind: BlogPostKind;
  readonly topic: BlogTopic;
  readonly featured: boolean;
  readonly authorName: string;
  readonly coverImage: BlogCoverImage | null;
  readonly relatedPostIds: readonly string[];
  readonly translations: Readonly<Record<BlogLocale, BlogTranslation>>;
}

export function editorStateOf(post: BlogPost | undefined): BlogEditorState {
  return {
    slug: post?.slug ?? '',
    kind: post?.kind ?? 'article',
    topic: post?.topic ?? 'news',
    featured: post?.featured ?? false,
    authorName: post?.authorName ?? DEFAULT_AUTHOR,
    coverImage: post?.coverImage ?? null,
    relatedPostIds: post?.relatedPostIds ?? [],
    translations: {
      en: translationFields(post?.translations.en),
      ar: translationFields(post?.translations.ar),
    },
  };
}

export interface EditorErrors {
  readonly slug?: string;
  readonly authorName?: string;
  readonly languages?: string;
  readonly translations: Readonly<
    Record<BlogLocale, Partial<Record<BlogTranslationField, string>>>
  >;
}

/**
 * `live` = the post is scheduled or published: the API then applies the
 * parity rule to every save, so both languages must be complete; a draft
 * only has to respect the maximum lengths (backend notes §4).
 */
export function validateEditor(
  state: BlogEditorState,
  live = false
): EditorErrors {
  const hasCover = Boolean(state.coverImage);
  const check = (locale: BlogLocale) => {
    const value = state.translations[locale];
    if (isTranslationEmpty(value)) return {};
    return validateTranslation(value, hasCover, live);
  };
  const translations = { en: check('en'), ar: check('ar') };
  const authorName = state.authorName.trim();
  return {
    ...(isSlugValid(state.slug) ? {} : { slug: 'editor.validation.slug' }),
    ...(authorName.length < 1 || authorName.length > BLOG_LIMITS.authorMax
      ? { authorName: 'editor.validation.authorName' }
      : {}),
    ...(isTranslationEmpty(state.translations.en) &&
    isTranslationEmpty(state.translations.ar)
      ? { languages: 'editor.validation.oneLanguage' }
      : {}),
    translations,
  };
}

export function hasErrors(errors: EditorErrors): boolean {
  return Boolean(
    errors.slug ||
    errors.authorName ||
    errors.languages ||
    Object.keys(errors.translations.en).length ||
    Object.keys(errors.translations.ar).length
  );
}

export function toPayload(state: BlogEditorState): BlogPostWritePayload {
  const translation = (locale: BlogLocale) =>
    isTranslationEmpty(state.translations[locale])
      ? null
      : trimTranslation(state.translations[locale]);
  return {
    slug: state.slug.trim(),
    kind: state.kind,
    topic: state.topic,
    featured: state.featured,
    authorName: state.authorName.trim(),
    coverImage: state.coverImage,
    relatedPostIds: [...state.relatedPostIds],
    translations: { en: translation('en'), ar: translation('ar') },
  };
}

/** What blocks publishing: per language, missing or invalid. */
export interface PublishProblem {
  readonly locale: BlogLocale;
  readonly kind: 'missing' | 'invalid';
}

export function publishProblems(state: BlogEditorState): PublishProblem[] {
  const hasCover = Boolean(state.coverImage);
  return BLOG_LOCALES.flatMap((locale): PublishProblem[] => {
    const translation = state.translations[locale];
    if (isTranslationEmpty(translation)) return [{ locale, kind: 'missing' }];
    return Object.keys(validateTranslation(translation, hasCover)).length > 0
      ? [{ locale, kind: 'invalid' }]
      : [];
  });
}

type Pending =
  'publish' | 'schedule' | 'unpublish' | 'archive' | 'delete' | null;

export default function PlatformBlogEditorPage(): JSX.Element {
  const { postId } = useParams<{ postId?: string }>();
  const isNew = !postId;
  const { t } = useTranslation();
  const { language, direction } = useLanguage();
  const fmt = useDateFormatter();
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useToast();

  const postQuery = usePlatformBlogPost(postId ?? null);
  const create = useCreateBlogPost();
  const update = useUpdateBlogPost();
  const transition = useBlogPostTransition();
  const remove = useDeleteBlogPost();
  const uploadImage = useUploadBlogImage();

  const post = postQuery.data;
  const [baseline, setBaseline] = useState<BlogEditorState>(() =>
    editorStateOf(undefined)
  );
  const [state, setState] = useState<BlogEditorState>(() =>
    editorStateOf(undefined)
  );
  const [version, setVersion] = useState<number | null>(null);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [tab, setTab] = useState<BlogLocale>(language === 'ar' ? 'ar' : 'en');
  const [submitted, setSubmitted] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [slugTaken, setSlugTaken] = useState(false);
  const [confirm, setConfirm] = useState<Pending>(null);
  const [scheduleAt, setScheduleAt] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishBlocked, setPublishBlocked] = useState<PublishProblem[]>([]);
  const loadedVersion = useRef<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Load (and reload after a save or a conflict) from the server's copy.
  useEffect(() => {
    if (!post) return;
    const key = `${post.id}:${post.version}`;
    if (loadedVersion.current === key) return;
    loadedVersion.current = key;
    const next = editorStateOf(post);
    setBaseline(next);
    setState(next);
    setVersion(post.version);
  }, [post]);

  const dirty = useMemo(
    () => JSON.stringify(state) !== JSON.stringify(baseline),
    [state, baseline]
  );
  const isLive = post?.status === 'published' || post?.status === 'scheduled';
  const errors = useMemo(() => validateEditor(state, isLive), [state, isLive]);
  const shown: EditorErrors = submitted
    ? errors
    : { translations: { en: {}, ar: {} } };
  const busy =
    create.isPending ||
    update.isPending ||
    transition.isPending ||
    remove.isPending;

  const set = <F extends keyof BlogEditorState>(
    field: F,
    value: BlogEditorState[F]
  ) => setState((current) => ({ ...current, [field]: value }));
  const setTranslation = (
    locale: BlogLocale,
    field: BlogTranslationField,
    value: string
  ) =>
    setState((current) => {
      const translations = {
        ...current.translations,
        [locale]: { ...current.translations[locale], [field]: value },
      };
      const autoSlug = !slugTouched && locale === 'en' && field === 'title';
      return {
        ...current,
        translations,
        ...(autoSlug ? { slug: slugify(value) } : {}),
      };
    });

  const handleError = (error: ApiError) => {
    if (isStaleError(error)) {
      setConflict(true);
      return;
    }
    if (/slugTaken/.test(error.messageKey ?? '')) setSlugTaken(true);
    notifyError(
      `${K}common.toasts.failed`,
      toErrorsNamespaceKey(error.messageKey)
    );
  };

  const { markSaved } = useUnsavedChanges({
    isDirty: dirty && !conflict,
    onSave: () => save().then(Boolean),
  });

  /** Saves the editor; resolves the saved post, or null when it could not. */
  async function save(): Promise<BlogPost | null> {
    setSubmitted(true);
    setSlugTaken(false);
    if (hasErrors(errors)) {
      const firstBad = BLOG_LOCALES.find(
        (locale) => Object.keys(errors.translations[locale]).length > 0
      );
      if (firstBad) setTab(firstBad);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return null;
    }
    const payload = toPayload(state);
    try {
      if (isNew || !postId) {
        const created = await create.mutateAsync(payload);
        markSaved();
        notifySuccess(`${K}editor.toasts.created`);
        navigate(
          buildPath(DASHBOARD_ROUTES.platformBlogEdit, { postId: created.id }),
          { replace: true }
        );
        return created;
      }
      const saved = await update.mutateAsync({
        id: postId,
        payload: { ...payload, version: version ?? 0 },
      });
      markSaved();
      loadedVersion.current = `${saved.id}:${saved.version}`;
      const next = editorStateOf(saved);
      setBaseline(next);
      setState(next);
      setVersion(saved.version);
      return saved;
    } catch (error) {
      handleError(error as ApiError);
      return null;
    }
  }

  const onSave = async () => {
    const saved = await save();
    if (saved && !isNew) notifySuccess(`${K}editor.toasts.saved`);
  };

  const runTransition = async (next: BlogTransition, toast: string) => {
    const saved =
      dirty || isNew
        ? await save()
        : post
          ? { ...post, version: version ?? post.version }
          : null;
    if (!saved) {
      setConfirm(null);
      return;
    }
    try {
      const result = await transition.mutateAsync({
        id: saved.id,
        version: saved.version,
        transition: next,
      });
      loadedVersion.current = null;
      setVersion(result.version);
      notifySuccess(toast);
    } catch (error) {
      handleError(error as ApiError);
    } finally {
      setConfirm(null);
    }
  };

  const requestPublish = (kind: 'publish' | 'schedule') => {
    const problems = publishProblems(state);
    setPublishBlocked(problems);
    if (problems.length > 0) {
      setTab(problems[0].locale);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    if (kind === 'schedule') {
      const existing = post?.status === 'scheduled' ? post.publishAt : null;
      setScheduleAt(
        toLocalInput(
          existing ?? new Date(Date.now() + 24 * 3600_000).toISOString()
        )
      );
    }
    setConfirm(kind);
  };

  const reloadLatest = async () => {
    loadedVersion.current = null;
    setConflict(false);
    setSubmitted(false);
    markSaved();
    await postQuery.refetch();
  };

  const breadcrumbs: BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.platformDashboard',
      path: DASHBOARD_ROUTES.platform,
    },
    {
      labelKey: 'navigation:items.platformBlog',
      path: DASHBOARD_ROUTES.platformBlog,
    },
    { labelKey: `${K}editor.${isNew ? 'newTitle' : 'editTitle'}` },
  ];

  if (!isNew && postQuery.error) {
    return (
      <PageContainer>
        <PageHeader
          titleKey={`${K}editor.editTitle`}
          breadcrumbs={breadcrumbs}
        />
        <ErrorState
          kind={postQuery.error.kind}
          descriptionKey={
            postQuery.error.kind === 'notFound'
              ? `${K}editor.notFound`
              : undefined
          }
          onRetry={() => void postQuery.refetch()}
        />
      </PageContainer>
    );
  }
  if (!isNew && (postQuery.isLoading || !post || version === null)) {
    return (
      <PageContainer>
        <PageHeader
          titleKey={`${K}editor.editTitle`}
          breadcrumbs={breadcrumbs}
        />
        <div
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
          aria-busy="true"
        >
          <Skeleton className="h-[32rem] w-full" />
          <Skeleton className="h-[24rem] w-full" />
        </div>
      </PageContainer>
    );
  }

  const status = post?.status ?? 'draft';
  const canUnpublish = status === 'published' || status === 'scheduled';
  const canDelete = !isNew && (status === 'draft' || status === 'archived');
  const languageName = (locale: BlogLocale) =>
    t(`${K}common.${locale === 'en' ? 'english' : 'arabic'}`);
  const tabHasErrors = (locale: BlogLocale) =>
    Object.keys(shown.translations[locale]).length > 0;
  const fieldError = (locale: BlogLocale, field: BlogTranslationField) => {
    const key = shown.translations[locale][field];
    return key ? t(`${K}${key}`) : undefined;
  };
  const hasSummary = submitted && hasErrors(errors);

  const translationFields = (locale: BlogLocale) => {
    const value = state.translations[locale];
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    const id = (field: string) => `blog-${locale}-${field}`;
    return (
      <div className="space-y-5" lang={locale}>
        <Field
          id={id('title')}
          label={t(`${K}editor.fields.title`)}
          error={fieldError(locale, 'title')}
          counter={{ count: value.title.length, max: BLOG_LIMITS.titleMax }}
        >
          <Input
            value={value.title}
            onChange={(e) => setTranslation(locale, 'title', e.target.value)}
            dir={dir}
            className="text-base"
          />
        </Field>
        <Field
          id={id('excerpt')}
          label={t(`${K}editor.fields.excerpt`)}
          hint={t(`${K}editor.fields.excerptHint`)}
          error={fieldError(locale, 'excerpt')}
          counter={{ count: value.excerpt.length, max: BLOG_LIMITS.excerptMax }}
        >
          <Textarea
            rows={3}
            value={value.excerpt}
            onChange={(e) => setTranslation(locale, 'excerpt', e.target.value)}
            dir={dir}
          />
        </Field>
        <MarkdownEditor
          id={id('body')}
          value={value.body}
          onChange={(next) => setTranslation(locale, 'body', next)}
          lang={locale}
          label={t(`${K}editor.fields.body`)}
          hint={t(`${K}editor.fields.bodyHint`)}
          error={fieldError(locale, 'body')}
          onUploadImage={async (file) => {
            try {
              return (await uploadImage.mutateAsync(file)).url;
            } catch (error) {
              notifyError(
                `${K}editor.cover.failed`,
                toErrorsNamespaceKey((error as ApiError).messageKey)
              );
              throw error;
            }
          }}
        />
        <fieldset className="space-y-5 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-semibold text-foreground">
            {t(`${K}editor.sections.seo`)}
          </legend>
          {state.coverImage ? (
            <Field
              id={id('coverAlt')}
              label={t(`${K}editor.fields.coverAlt`)}
              hint={t(`${K}editor.fields.coverAltHint`)}
              error={fieldError(locale, 'coverAlt')}
              counter={{
                count: value.coverAlt.length,
                max: BLOG_LIMITS.coverAltMax,
              }}
            >
              <Input
                value={value.coverAlt}
                onChange={(e) =>
                  setTranslation(locale, 'coverAlt', e.target.value)
                }
                dir={dir}
              />
            </Field>
          ) : null}
          <Field
            id={id('seoTitle')}
            label={t(`${K}editor.fields.seoTitle`)}
            hint={t(`${K}editor.fields.seoTitleHint`)}
            optional
            error={fieldError(locale, 'seoTitle')}
            counter={{
              count: value.seoTitle.length,
              max: BLOG_LIMITS.seoTitleMax,
            }}
          >
            <Input
              value={value.seoTitle}
              onChange={(e) =>
                setTranslation(locale, 'seoTitle', e.target.value)
              }
              dir={dir}
            />
          </Field>
          <Field
            id={id('seoDescription')}
            label={t(`${K}editor.fields.seoDescription`)}
            hint={t(`${K}editor.fields.seoDescriptionHint`)}
            optional
            error={fieldError(locale, 'seoDescription')}
            counter={{
              count: value.seoDescription.length,
              max: BLOG_LIMITS.seoDescriptionMax,
            }}
          >
            <Textarea
              rows={2}
              value={value.seoDescription}
              onChange={(e) =>
                setTranslation(locale, 'seoDescription', e.target.value)
              }
              dir={dir}
            />
          </Field>
        </fieldset>
      </div>
    );
  };

  const selectField = (
    id: string,
    label: string,
    value: string,
    options: readonly string[],
    optionKey: (option: string) => string,
    onChange: (value: string) => void
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {t(optionKey(option))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const liveHref =
    post && status === 'published'
      ? appMarketingHref(`/blog/${post.slug}`)
      : null;

  return (
    <PageContainer>
      <PageHeader
        titleKey={`${K}editor.${isNew ? 'newTitle' : 'editTitle'}`}
        descriptionKey={`${K}editor.subtitle`}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="size-4" aria-hidden />
              {t(`${K}editor.actions.preview`)}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || conflict}
              onClick={() => void onSave()}
            >
              {create.isPending || update.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              {t(`${K}editor.actions.${isNew ? 'create' : 'save'}`)}
            </Button>
            <Button
              type="button"
              disabled={busy || conflict}
              onClick={() => requestPublish('publish')}
            >
              <Send className="size-4 rtl:-scale-x-100" aria-hidden />
              {t(`${K}editor.actions.publish`)}
            </Button>
            <DropdownMenu dir={direction}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || conflict}
                >
                  {t(`${K}editor.actions.more`)}
                  <ChevronDown className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => requestPublish('schedule')}>
                  <CalendarClock className="size-4" aria-hidden />
                  {t(
                    `${K}editor.actions.${status === 'scheduled' ? 'reschedule' : 'schedule'}`
                  )}
                </DropdownMenuItem>
                {canUnpublish ? (
                  <DropdownMenuItem onSelect={() => setConfirm('unpublish')}>
                    <Undo2 className="size-4" aria-hidden />
                    {t(`${K}editor.actions.unpublish`)}
                  </DropdownMenuItem>
                ) : null}
                {!isNew && status !== 'archived' ? (
                  <DropdownMenuItem onSelect={() => setConfirm('archive')}>
                    <Archive className="size-4" aria-hidden />
                    {t(`${K}editor.actions.archive`)}
                  </DropdownMenuItem>
                ) : null}
                {liveHref ? (
                  <DropdownMenuItem asChild>
                    <a
                      href={liveHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink
                        className="size-4 rtl:-scale-x-100"
                        aria-hidden
                      />
                      {t(`${K}editor.actions.viewLive`)}
                    </a>
                  </DropdownMenuItem>
                ) : null}
                {canDelete ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => setConfirm('delete')}
                    >
                      <Trash2 className="size-4" aria-hidden />
                      {t(`${K}editor.actions.delete`)}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <StatusBadge
          labelKey={`${K}blog.status.${status}`}
          tone={blogStatusTone(status)}
        />
        <span
          className={cn(
            'text-muted-foreground',
            dirty && 'font-medium text-warning'
          )}
          role="status"
        >
          {dirty
            ? t(`${K}common.unsavedChanges`)
            : !isNew
              ? t(`${K}common.allSaved`)
              : null}
        </span>
      </div>

      {conflict ? (
        <Alert variant="destructive" className="mb-4" role="alert">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertTitle>{t(`${K}common.conflictTitle`)}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{t(`${K}common.conflictBody`)}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void reloadLatest()}
            >
              <RotateCcw className="size-4" aria-hidden />
              {t(`${K}common.reload`)}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div
        ref={summaryRef}
        tabIndex={-1}
        className="focus-visible:outline-none"
      >
        {hasSummary ? (
          <Alert variant="destructive" className="mb-4" role="alert">
            <AlertTitle>{t(`${K}editor.validation.summary`)}</AlertTitle>
            <AlertDescription>
              <ul className="list-disc ps-5">
                {errors.languages ? (
                  <li>{t(`${K}${errors.languages}`)}</li>
                ) : null}
                {errors.slug ? <li>{t(`${K}${errors.slug}`)}</li> : null}
                {errors.authorName ? (
                  <li>{t(`${K}${errors.authorName}`)}</li>
                ) : null}
                {BLOG_LOCALES.filter(
                  (locale) =>
                    Object.keys(errors.translations[locale]).length > 0
                ).map((locale) => (
                  <li key={locale}>
                    {t(`${K}editor.validation.languageHasErrors`, {
                      language: languageName(locale),
                    })}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}
        {publishBlocked.length > 0 && !hasSummary ? (
          <Alert
            className="mb-4 border-warning/40 bg-warning-surface"
            role="alert"
          >
            <AlertTriangle className="size-4 text-warning" aria-hidden />
            <AlertTitle>{t(`${K}editor.publishCheck.title`)}</AlertTitle>
            <AlertDescription>
              <p>{t(`${K}editor.publishCheck.body`)}</p>
              <ul className="mt-1 list-disc ps-5">
                {publishBlocked.map((problem) => (
                  <li key={problem.locale}>
                    {t(`${K}editor.publishCheck.${problem.kind}`, {
                      language: languageName(problem.locale),
                    })}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="min-w-0">
          <CardContent className="p-4 sm:p-6">
            <Tabs
              value={tab}
              onValueChange={(value) => setTab(value as BlogLocale)}
              dir={direction}
            >
              <TabsList
                aria-label={t(`${K}editor.tabs.label`)}
                className="mb-5"
              >
                {BLOG_LOCALES.map((locale) => (
                  <TabsTrigger
                    key={locale}
                    value={locale}
                    className="min-h-9 gap-2"
                  >
                    {t(`${K}editor.tabs.${locale}`)}
                    {tabHasErrors(locale) ? (
                      <>
                        <span
                          aria-hidden
                          className="size-2 rounded-full bg-destructive"
                        />
                        <span className="sr-only">
                          {t(`${K}editor.validation.languageHasErrors`, {
                            language: languageName(locale),
                          })}
                        </span>
                      </>
                    ) : isTranslationEmpty(state.translations[locale]) ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        ({t(`${K}common.empty`)})
                      </span>
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>
              {BLOG_LOCALES.map((locale) => (
                <TabsContent
                  key={locale}
                  value={locale}
                  className="mt-0 focus-visible:ring-offset-0"
                >
                  {translationFields(locale)}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t(`${K}editor.sections.settings`)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field
                id="blog-slug"
                label={t(`${K}editor.fields.slug`)}
                hint={t(`${K}editor.fields.slugHint`)}
                error={
                  slugTaken
                    ? t('errors:blog.slugTaken')
                    : shown.slug
                      ? t(`${K}${shown.slug}`)
                      : undefined
                }
                counter={{ count: state.slug.length, max: BLOG_LIMITS.slugMax }}
              >
                <Input
                  value={state.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlugTaken(false);
                    set('slug', e.target.value.toLowerCase());
                  }}
                  dir="ltr"
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              {state.translations.en.title.trim() ? (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto min-h-11 px-0"
                  onClick={() => {
                    setSlugTouched(true);
                    set('slug', slugify(state.translations.en.title));
                  }}
                >
                  {t(`${K}editor.fields.slugGenerate`)}
                </Button>
              ) : null}
              {selectField(
                'blog-kind',
                t(`${K}editor.fields.kind`),
                state.kind,
                BLOG_POST_KINDS,
                (o) => `${K}blog.kinds.${o}`,
                (v) => set('kind', v as BlogPostKind)
              )}
              {selectField(
                'blog-topic',
                t(`${K}editor.fields.topic`),
                state.topic,
                BLOG_TOPICS,
                (o) => `${K}blog.topics.${o}`,
                (v) => set('topic', v as BlogTopic)
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <Label htmlFor="blog-featured">
                    {t(`${K}editor.fields.featured`)}
                  </Label>
                  <p
                    id="blog-featured-hint"
                    className="text-xs text-muted-foreground"
                  >
                    {t(`${K}editor.fields.featuredHint`)}
                  </p>
                </div>
                <Switch
                  id="blog-featured"
                  checked={state.featured}
                  onCheckedChange={(value) => set('featured', value)}
                  aria-describedby="blog-featured-hint"
                />
              </div>
              <Field
                id="blog-author"
                label={t(`${K}editor.fields.authorName`)}
                error={
                  shown.authorName ? t(`${K}${shown.authorName}`) : undefined
                }
              >
                <Input
                  value={state.authorName}
                  onChange={(e) => set('authorName', e.target.value)}
                  dir="auto"
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t(`${K}editor.sections.cover`)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CoverImageField
                id="blog-cover"
                value={state.coverImage}
                onChange={(value) => set('coverImage', value)}
                upload={(file) => uploadImage.mutateAsync(file)}
                alt={state.translations[tab].coverAlt}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t(`${K}editor.sections.related`)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RelatedPostsPicker
                id="blog-related"
                postId={postId ?? null}
                value={state.relatedPostIds}
                onChange={(ids) => set('relatedPostIds', ids)}
              />
            </CardContent>
          </Card>

          {post ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t(`${K}editor.sections.publishing`)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">
                      {t(`${K}editor.publishing.publishAt`)}
                    </dt>
                    <dd className="font-medium">
                      {post.publishAt
                        ? fmt.dateTime(post.publishAt)
                        : t(`${K}editor.publishing.notPublished`)}
                    </dd>
                  </div>
                  {post.publishedAt ? (
                    <div>
                      <dt className="text-muted-foreground">
                        {t(`${K}editor.publishing.firstPublished`)}
                      </dt>
                      <dd className="font-medium">
                        {fmt.dateTime(post.publishedAt)}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-muted-foreground">
                      {t(`${K}editor.publishing.liveUrl`)}
                    </dt>
                    <dd className="break-all font-mono text-xs" dir="ltr">
                      /blog/{post.slug}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {t(`${K}editor.publishing.readingTime`)}
                    </dt>
                    <dd className="font-medium">
                      {BLOG_LOCALES.map((locale) =>
                        post.readingMinutes[locale]
                          ? `${t(`${K}blog.languageBadge.${locale}`)} ${t(`${K}editor.publishing.minutes`, { count: post.readingMinutes[locale] ?? 0 })}`
                          : null
                      )
                        .filter(Boolean)
                        .join(' · ') || t(`${K}common.noValue`)}
                    </dd>
                  </div>
                  <div className="border-t border-border pt-3 text-xs text-muted-foreground">
                    {post.updatedByName
                      ? t(`${K}common.updatedBy`, {
                          date: fmt.dateTime(post.updatedAt),
                          name: post.updatedByName,
                        })
                      : t(`${K}common.updatedAt`, {
                          date: fmt.dateTime(post.updatedAt),
                        })}
                  </div>
                </dl>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <BlogPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        postId={postId ?? null}
        dirty={dirty}
        initialLocale={tab}
        local={{
          topic: state.topic,
          authorName: state.authorName,
          coverImage: state.coverImage,
          publishAt: post?.publishAt ?? null,
          translations: state.translations,
        }}
      />

      <ConfirmDialog
        open={confirm === 'publish'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t(`${K}editor.confirm.publishTitle`)}
        description={t(`${K}editor.confirm.publishBody`)}
        confirmLabel={t(`${K}editor.confirm.confirmPublish`)}
        pending={busy}
        onConfirm={() =>
          void runTransition(
            { action: 'publish' },
            `${K}editor.toasts.published`
          )
        }
      />
      <ConfirmDialog
        open={confirm === 'schedule'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t(`${K}editor.confirm.scheduleTitle`)}
        description={t(`${K}editor.confirm.scheduleBody`)}
        confirmLabel={t(`${K}editor.confirm.confirmSchedule`)}
        pending={busy}
        confirmDisabled={
          !scheduleAt ||
          Date.parse(fromLocalInput(scheduleAt) ?? '') <= Date.now()
        }
        onConfirm={() => {
          const iso = fromLocalInput(scheduleAt);
          if (!iso) return;
          void runTransition(
            { action: 'publish', publishAt: iso },
            `${K}editor.toasts.scheduled`
          );
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="blog-schedule-at">
            {t(`${K}editor.fields.publishAt`)}
          </Label>
          <Input
            id="blog-schedule-at"
            type="datetime-local"
            value={scheduleAt}
            min={toLocalInput(new Date().toISOString())}
            onChange={(e) => setScheduleAt(e.target.value)}
            aria-describedby="blog-schedule-hint"
            dir="ltr"
          />
          {scheduleAt &&
          Date.parse(fromLocalInput(scheduleAt) ?? '') <= Date.now() ? (
            <p
              id="blog-schedule-hint"
              className="text-xs font-medium text-destructive"
            >
              {t(`${K}editor.confirm.schedulePast`)}
            </p>
          ) : (
            <span id="blog-schedule-hint" hidden />
          )}
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'unpublish'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t(`${K}editor.confirm.unpublishTitle`)}
        description={t(`${K}editor.confirm.unpublishBody`)}
        confirmLabel={t(`${K}editor.confirm.confirmUnpublish`)}
        destructive
        pending={busy}
        onConfirm={() =>
          void runTransition(
            { action: 'unpublish' },
            `${K}editor.toasts.unpublished`
          )
        }
      />
      <ConfirmDialog
        open={confirm === 'archive'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t(`${K}editor.confirm.archiveTitle`)}
        description={t(`${K}editor.confirm.archiveBody`)}
        confirmLabel={t(`${K}editor.confirm.confirmArchive`)}
        destructive
        pending={busy}
        onConfirm={() =>
          void runTransition(
            { action: 'archive' },
            `${K}editor.toasts.archived`
          )
        }
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t(`${K}editor.confirm.deleteTitle`)}
        description={t(`${K}editor.confirm.deleteBody`)}
        confirmLabel={t(`${K}editor.confirm.confirmDelete`)}
        destructive
        pending={busy}
        onConfirm={() => {
          if (!postId) return;
          remove.mutate(postId, {
            onSuccess: () => {
              markSaved();
              notifySuccess(`${K}editor.toasts.deleted`);
              navigate(DASHBOARD_ROUTES.platformBlog, { replace: true });
            },
            onError: (error) => {
              setConfirm(null);
              handleError(error);
            },
          });
        }}
      />
    </PageContainer>
  );
}
