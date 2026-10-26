/**
 * B3 — Banner / pop-up editor (`/dashboard/platform/announcements/new?surface=`,
 * `/announcements/:announcementId`).
 *
 * Name, style, the message in English and Arabic (title, text, button),
 * the button link, dates, and per surface: pages + closable (marketing),
 * delay + frequency + image (pop-up), audience (dashboard), priority. A
 * live preview shows both languages as visitors will see them. Writes send
 * the `version` read (409 → "someone else saved"); unsaved edits are
 * guarded. Activate / turn off / archive / delete are confirmed.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Archive,
  ImageUp,
  Loader2,
  Plus,
  Power,
  PowerOff,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatNumber, toErrorsNamespaceKey } from '@utils';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { ApiError } from '@api';
import type { BreadcrumbItem } from '@types';
import {
  useAnnouncementTransition,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  usePlatformAnnouncement,
  useUpdateAnnouncement,
} from '../hooks/usePlatformAnnouncements';
import { useUploadBlogImage } from '../hooks/usePlatformBlog';
import {
  ANNOUNCEMENT_SURFACES,
  ANNOUNCEMENT_TONES,
  BLOG_LOCALES,
  DASHBOARD_AUDIENCES,
  POPUP_FREQUENCIES,
  type AnnouncementContent,
  type AnnouncementSurface,
  type AnnouncementTone,
  type AnnouncementWritePayload,
  type BlogLocale,
  type DashboardAudience,
  type PopupFrequency,
  type SiteAnnouncement,
} from '../types';
import {
  ANNOUNCEMENT_LIMITS,
  K,
  MAX_PAGES,
  announcementFields,
  announcementLiveState,
  fromLocalInput,
  isSafeLink,
  isStaleError,
  isValidPagePath,
  liveStateTone,
  normalizePagePath,
  toLocalInput,
} from '../utils/launch.utils';
import { Field } from '../components/fields';
import { AnnouncementPreview } from '../components/AnnouncementPreview';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { imageFileProblem } from '../components/CoverImageField';

export interface AnnouncementEditorState {
  readonly name: string;
  readonly surface: AnnouncementSurface;
  readonly tone: AnnouncementTone;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly content: Readonly<Record<BlogLocale, AnnouncementContent>>;
  readonly ctaUrl: string;
  readonly imageUrl: string | null;
  readonly pages: readonly string[];
  readonly dismissible: boolean;
  readonly popupDelaySeconds: string;
  readonly popupFrequency: PopupFrequency;
  readonly audience: DashboardAudience;
  readonly priority: string;
}

export function announcementStateOf(
  announcement: SiteAnnouncement | undefined,
  surface: AnnouncementSurface
): AnnouncementEditorState {
  return {
    name: announcement?.name ?? '',
    surface: announcement?.surface ?? surface,
    tone: announcement?.tone ?? 'info',
    startsAt: toLocalInput(announcement?.startsAt),
    endsAt: toLocalInput(announcement?.endsAt),
    content: {
      en: announcementFields(announcement?.content.en),
      ar: announcementFields(announcement?.content.ar),
    },
    ctaUrl: announcement?.ctaUrl ?? '',
    imageUrl: announcement?.imageUrl ?? null,
    pages: announcement?.pages ?? [],
    dismissible: announcement?.dismissible ?? true,
    popupDelaySeconds: String(announcement?.popupDelaySeconds ?? 5),
    popupFrequency: announcement?.popupFrequency ?? 'once',
    audience: announcement?.audience ?? 'all',
    priority: String(announcement?.priority ?? 50),
  };
}

const contentEmpty = (value: AnnouncementContent) =>
  !value.title.trim() && !value.body.trim() && !value.ctaLabel.trim();

type ContentField = keyof AnnouncementContent;
export interface AnnouncementErrors {
  readonly name?: string;
  readonly languages?: string;
  readonly ctaUrl?: string;
  readonly endsAt?: string;
  readonly popupDelaySeconds?: string;
  readonly priority?: string;
  readonly content: Readonly<
    Record<BlogLocale, Partial<Record<ContentField, string>>>
  >;
}

const isInt = (value: string, max: number) =>
  /^\d+$/.test(value.trim()) && Number(value) >= 0 && Number(value) <= max;

export function validateAnnouncement(
  state: AnnouncementEditorState
): AnnouncementErrors {
  const popup = state.surface === 'marketing_popup';
  const contentErrors = (value: AnnouncementContent) => {
    if (contentEmpty(value)) return {};
    const errors: Partial<Record<ContentField, string>> = {};
    if (!value.body.trim() || value.body.length > ANNOUNCEMENT_LIMITS.bodyMax)
      errors.body = 'announcementEditor.validation.body';
    if (
      popup &&
      (!value.title.trim() || value.title.length > ANNOUNCEMENT_LIMITS.titleMax)
    )
      errors.title = 'announcementEditor.validation.title';
    else if (value.title.length > ANNOUNCEMENT_LIMITS.titleMax)
      errors.title = 'announcementEditor.validation.titleLength';
    if (value.ctaLabel.length > ANNOUNCEMENT_LIMITS.ctaLabelMax)
      errors.ctaLabel = 'announcementEditor.validation.ctaLabel';
    return errors;
  };
  const anyCta = BLOG_LOCALES.some((locale) =>
    state.content[locale].ctaLabel.trim()
  );
  const name = state.name.trim();
  const starts = fromLocalInput(state.startsAt);
  const ends = fromLocalInput(state.endsAt);
  return {
    ...(name.length < 1 || name.length > ANNOUNCEMENT_LIMITS.nameMax
      ? { name: 'announcementEditor.validation.name' }
      : {}),
    ...(contentEmpty(state.content.en) && contentEmpty(state.content.ar)
      ? { languages: 'announcementEditor.validation.oneLanguage' }
      : {}),
    ...(state.ctaUrl.trim() && !isSafeLink(state.ctaUrl)
      ? { ctaUrl: 'announcementEditor.validation.ctaUrl' }
      : anyCta && !state.ctaUrl.trim()
        ? { ctaUrl: 'announcementEditor.validation.ctaUrlRequired' }
        : {}),
    ...(starts && ends && Date.parse(ends) <= Date.parse(starts)
      ? { endsAt: 'announcementEditor.validation.endsBeforeStart' }
      : {}),
    ...(popup && !isInt(state.popupDelaySeconds, ANNOUNCEMENT_LIMITS.delayMax)
      ? { popupDelaySeconds: 'announcementEditor.validation.delay' }
      : {}),
    ...(!isInt(state.priority, ANNOUNCEMENT_LIMITS.priorityMax)
      ? { priority: 'announcementEditor.validation.priority' }
      : {}),
    content: {
      en: contentErrors(state.content.en),
      ar: contentErrors(state.content.ar),
    },
  };
}

export function announcementHasErrors(errors: AnnouncementErrors): boolean {
  return Boolean(
    errors.name ||
    errors.languages ||
    errors.ctaUrl ||
    errors.endsAt ||
    errors.popupDelaySeconds ||
    errors.priority ||
    Object.keys(errors.content.en).length ||
    Object.keys(errors.content.ar).length
  );
}

/** Only the fields the surface uses (contract §2). */
export function announcementPayload(
  state: AnnouncementEditorState
): AnnouncementWritePayload {
  const content = (locale: BlogLocale) => {
    const value = state.content[locale];
    return contentEmpty(value)
      ? null
      : {
          title: value.title.trim(),
          body: value.body.trim(),
          ctaLabel: value.ctaLabel.trim(),
        };
  };
  const marketing = state.surface !== 'dashboard_banner';
  const popup = state.surface === 'marketing_popup';
  return {
    name: state.name.trim(),
    surface: state.surface,
    tone: state.tone,
    startsAt: fromLocalInput(state.startsAt),
    endsAt: fromLocalInput(state.endsAt),
    content: { en: content('en'), ar: content('ar') },
    ctaUrl: state.ctaUrl.trim() || null,
    dismissible: state.dismissible,
    priority: Number(state.priority),
    ...(marketing ? { pages: [...state.pages] } : {}),
    ...(popup
      ? {
          imageUrl: state.imageUrl,
          popupDelaySeconds: Number(state.popupDelaySeconds),
          popupFrequency: state.popupFrequency,
        }
      : {}),
    ...(state.surface === 'dashboard_banner'
      ? { audience: state.audience }
      : {}),
  };
}

type Confirm = 'activate' | 'deactivate' | 'archive' | 'delete' | null;

export default function PlatformAnnouncementEditorPage(): JSX.Element {
  const { announcementId } = useParams<{ announcementId?: string }>();
  const [params] = useSearchParams();
  const isNew = !announcementId;
  const requestedSurface = (
    ANNOUNCEMENT_SURFACES as readonly string[]
  ).includes(params.get('surface') ?? '')
    ? (params.get('surface') as AnnouncementSurface)
    : 'marketing_banner';
  const { t } = useTranslation();
  const { language, direction } = useLanguage();
  const fmt = useDateFormatter();
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useToast();

  const query = usePlatformAnnouncement(announcementId ?? null);
  const create = useCreateAnnouncement();
  const update = useUpdateAnnouncement();
  const transition = useAnnouncementTransition();
  const remove = useDeleteAnnouncement();
  const upload = useUploadBlogImage();
  const announcement = query.data;

  const [baseline, setBaseline] = useState(() =>
    announcementStateOf(undefined, requestedSurface)
  );
  const [state, setState] = useState(() =>
    announcementStateOf(undefined, requestedSurface)
  );
  const [version, setVersion] = useState<number | null>(null);
  const [tab, setTab] = useState<BlogLocale>(language === 'ar' ? 'ar' : 'en');
  const [submitted, setSubmitted] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [pageInput, setPageInput] = useState('');
  const [pageError, setPageError] = useState(false);
  const [imageProblem, setImageProblem] = useState<string | null>(null);
  const loaded = useRef<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!announcement) return;
    const key = `${announcement.id}:${announcement.version}`;
    if (loaded.current === key) return;
    loaded.current = key;
    const next = announcementStateOf(announcement, announcement.surface);
    setBaseline(next);
    setState(next);
    setVersion(announcement.version);
  }, [announcement]);

  const dirty = useMemo(
    () => JSON.stringify(state) !== JSON.stringify(baseline),
    [state, baseline]
  );
  const errors = useMemo(() => validateAnnouncement(state), [state]);
  const shown: AnnouncementErrors = submitted
    ? errors
    : { content: { en: {}, ar: {} } };
  const busy =
    create.isPending ||
    update.isPending ||
    transition.isPending ||
    remove.isPending;
  const surface = state.surface;
  const surfaceName = t(`${K}announcements.surface.${surface}`);
  const set = <F extends keyof AnnouncementEditorState>(
    field: F,
    value: AnnouncementEditorState[F]
  ) => setState((current) => ({ ...current, [field]: value }));
  const setContent = (locale: BlogLocale, field: ContentField, value: string) =>
    setState((current) => ({
      ...current,
      content: {
        ...current.content,
        [locale]: { ...current.content[locale], [field]: value },
      },
    }));

  const handleError = (error: ApiError) => {
    if (isStaleError(error)) {
      setConflict(true);
      return;
    }
    notifyError(
      `${K}common.toasts.failed`,
      toErrorsNamespaceKey(error.messageKey)
    );
  };

  const { markSaved } = useUnsavedChanges({
    isDirty: dirty && !conflict,
    onSave: () => save().then(Boolean),
  });

  async function save(): Promise<SiteAnnouncement | null> {
    setSubmitted(true);
    if (announcementHasErrors(errors)) {
      const bad = BLOG_LOCALES.find(
        (locale) => Object.keys(errors.content[locale]).length > 0
      );
      if (bad) setTab(bad);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return null;
    }
    const payload = announcementPayload(state);
    try {
      if (!announcementId) {
        const created = await create.mutateAsync(payload);
        markSaved();
        notifySuccess(`${K}announcementEditor.toasts.created`);
        navigate(
          buildPath(DASHBOARD_ROUTES.platformAnnouncementEdit, {
            announcementId: created.id,
          }),
          {
            replace: true,
          }
        );
        return created;
      }
      const saved = await update.mutateAsync({
        id: announcementId,
        payload: { ...payload, version: version ?? 0 },
      });
      markSaved();
      loaded.current = `${saved.id}:${saved.version}`;
      const next = announcementStateOf(saved, saved.surface);
      setBaseline(next);
      setState(next);
      setVersion(saved.version);
      notifySuccess(`${K}announcementEditor.toasts.saved`);
      return saved;
    } catch (error) {
      handleError(error as ApiError);
      return null;
    }
  }

  const runTransition = async (
    action: 'activate' | 'deactivate' | 'archive'
  ) => {
    const saved = dirty
      ? await save()
      : announcement
        ? { ...announcement, version: version ?? announcement.version }
        : null;
    if (!saved) {
      setConfirm(null);
      return;
    }
    try {
      const result = await transition.mutateAsync({
        id: saved.id,
        version: saved.version,
        action,
      });
      loaded.current = null;
      setVersion(result.version);
      notifySuccess(
        `${K}announcementEditor.toasts.${action === 'activate' ? 'activated' : action === 'deactivate' ? 'deactivated' : 'archived'}`
      );
    } catch (error) {
      handleError(error as ApiError);
    } finally {
      setConfirm(null);
    }
  };

  const addPage = () => {
    const path = normalizePagePath(pageInput);
    if (!path || !isValidPagePath(path)) {
      setPageError(true);
      return;
    }
    setPageError(false);
    if (!state.pages.includes(path) && state.pages.length < MAX_PAGES)
      set('pages', [...state.pages, path]);
    setPageInput('');
  };

  const pickImage = async (file: File) => {
    const problem = imageFileProblem(file);
    if (problem) {
      setImageProblem(problem);
      return;
    }
    setImageProblem(null);
    try {
      const image = await upload.mutateAsync(file);
      set('imageUrl', image.url);
    } catch {
      setImageProblem('editor.cover.failed');
    }
  };

  const reloadLatest = async () => {
    loaded.current = null;
    setConflict(false);
    setSubmitted(false);
    markSaved();
    await query.refetch();
  };

  const breadcrumbs: BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.platformDashboard',
      path: DASHBOARD_ROUTES.platform,
    },
    {
      labelKey: 'navigation:items.platformAnnouncements',
      path: DASHBOARD_ROUTES.platformAnnouncements,
    },
    {
      labelKey: `${K}announcementEditor.${isNew ? 'newTitle' : 'editTitle'}`,
      label: t(`${K}announcementEditor.${isNew ? 'newTitle' : 'editTitle'}`, {
        surface: surfaceName,
      }),
    },
  ];

  if (!isNew && query.error) {
    return (
      <PageContainer>
        <PageHeader
          titleKey={`${K}announcements.title`}
          breadcrumbs={breadcrumbs}
        />
        <ErrorState
          kind={query.error.kind}
          descriptionKey={
            query.error.kind === 'notFound'
              ? `${K}announcementEditor.notFound`
              : undefined
          }
          onRetry={() => void query.refetch()}
        />
      </PageContainer>
    );
  }
  if (!isNew && (query.isLoading || !announcement || version === null)) {
    return (
      <PageContainer>
        <PageHeader
          titleKey={`${K}announcements.title`}
          breadcrumbs={breadcrumbs}
        />
        <div className="grid gap-6 lg:grid-cols-2" aria-busy="true">
          <Skeleton className="h-[28rem] w-full" />
          <Skeleton className="h-[20rem] w-full" />
        </div>
      </PageContainer>
    );
  }

  const status = announcement?.status ?? 'draft';
  const live = announcement ? announcementLiveState(announcement) : 'off';
  const languageName = (locale: BlogLocale) =>
    t(`${K}common.${locale === 'en' ? 'english' : 'arabic'}`);
  const fieldError = (key?: string) => (key ? t(`${K}${key}`) : undefined);
  const hasSummary = submitted && announcementHasErrors(errors);
  const n = (value: number) => formatNumber(value, language);

  const select = <T extends string>(
    id: string,
    label: string,
    value: T,
    options: readonly T[],
    optionKey: (option: T) => string,
    onChange: (value: T) => void,
    hint?: string
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger
          id={id}
          aria-label={label}
          aria-describedby={hint ? `${id}-hint` : undefined}
        >
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
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );

  return (
    <PageContainer>
      <PageHeader
        titleKey={`${K}announcementEditor.${isNew ? 'newTitle' : 'editTitle'}`}
        values={{ surface: surfaceName }}
        descriptionKey={`${K}announcements.surfaceHint.${surface}`}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={isNew ? 'default' : 'outline'}
              disabled={busy || conflict}
              onClick={() => void save()}
            >
              {create.isPending || update.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              {t(`${K}announcementEditor.actions.${isNew ? 'create' : 'save'}`)}
            </Button>
            {!isNew && status !== 'active' && status !== 'archived' ? (
              <Button
                type="button"
                disabled={busy || conflict}
                onClick={() => setConfirm('activate')}
              >
                <Power className="size-4" aria-hidden />
                {t(`${K}announcementEditor.actions.activate`)}
              </Button>
            ) : null}
            {!isNew && status === 'active' ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy || conflict}
                onClick={() => setConfirm('deactivate')}
              >
                <PowerOff className="size-4" aria-hidden />
                {t(`${K}announcementEditor.actions.deactivate`)}
              </Button>
            ) : null}
            {!isNew && status !== 'archived' ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy || conflict}
                onClick={() => setConfirm('archive')}
              >
                <Archive className="size-4" aria-hidden />
                {t(`${K}announcementEditor.actions.archive`)}
              </Button>
            ) : null}
            {!isNew && status !== 'active' ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={busy}
                onClick={() => setConfirm('delete')}
              >
                <Trash2 className="size-4" aria-hidden />
                {t(`${K}announcementEditor.actions.delete`)}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        {live === 'off' ? (
          <StatusBadge
            labelKey={`${K}announcements.status.${status}`}
            tone="neutral"
          />
        ) : (
          <StatusBadge
            labelKey={`${K}announcements.live.${live}`}
            tone={liveStateTone(live)}
          />
        )}
        <span
          className={
            dirty ? 'font-medium text-warning' : 'text-muted-foreground'
          }
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
            <AlertTitle>
              {t(`${K}announcementEditor.validation.summary`)}
            </AlertTitle>
            {errors.languages ? (
              <AlertDescription>
                {t(`${K}${errors.languages}`)}
              </AlertDescription>
            ) : null}
          </Alert>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t(`${K}announcementEditor.sections.basics`)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field
                id="ann-name"
                label={t(`${K}announcementEditor.fields.name`)}
                hint={t(`${K}announcementEditor.fields.nameHint`)}
                error={fieldError(shown.name)}
                counter={{
                  count: state.name.length,
                  max: ANNOUNCEMENT_LIMITS.nameMax,
                }}
              >
                <Input
                  value={state.name}
                  onChange={(e) => set('name', e.target.value)}
                  dir="auto"
                />
              </Field>
              {isNew
                ? select(
                    'ann-surface',
                    t(`${K}announcementEditor.fields.surface`),
                    state.surface,
                    ANNOUNCEMENT_SURFACES,
                    (o) => `${K}announcements.surface.${o}`,
                    (v) => set('surface', v),
                    t(`${K}announcements.surfaceHint.${state.surface}`)
                  )
                : null}
              {select(
                'ann-tone',
                t(`${K}announcementEditor.fields.tone`),
                state.tone,
                ANNOUNCEMENT_TONES,
                (o) => `${K}announcements.tone.${o}`,
                (v) => set('tone', v)
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t(`${K}announcementEditor.sections.message`)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs
                value={tab}
                onValueChange={(value) => setTab(value as BlogLocale)}
                dir={direction}
              >
                <TabsList aria-label={t(`${K}editor.tabs.label`)}>
                  {BLOG_LOCALES.map((locale) => (
                    <TabsTrigger
                      key={locale}
                      value={locale}
                      className="min-h-9 gap-2"
                    >
                      {t(`${K}editor.tabs.${locale}`)}
                      {Object.keys(shown.content[locale]).length > 0 ? (
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
                      ) : null}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {BLOG_LOCALES.map((locale) => {
                  const value = state.content[locale];
                  const dir = locale === 'ar' ? 'rtl' : 'ltr';
                  const errs = shown.content[locale];
                  return (
                    <TabsContent
                      key={locale}
                      value={locale}
                      className="space-y-4"
                      lang={locale}
                    >
                      <Field
                        id={`ann-${locale}-title`}
                        label={t(
                          `${K}announcementEditor.fields.${surface === 'marketing_popup' ? 'titleRequired' : 'title'}`
                        )}
                        optional={surface !== 'marketing_popup'}
                        error={fieldError(errs.title)}
                        counter={{
                          count: value.title.length,
                          max: ANNOUNCEMENT_LIMITS.titleMax,
                        }}
                      >
                        <Input
                          value={value.title}
                          onChange={(e) =>
                            setContent(locale, 'title', e.target.value)
                          }
                          dir={dir}
                        />
                      </Field>
                      <Field
                        id={`ann-${locale}-body`}
                        label={t(`${K}announcementEditor.fields.body`)}
                        hint={t(`${K}announcementEditor.fields.bodyHint`)}
                        error={fieldError(errs.body)}
                        counter={{
                          count: value.body.length,
                          max: ANNOUNCEMENT_LIMITS.bodyMax,
                        }}
                      >
                        <Textarea
                          rows={3}
                          value={value.body}
                          onChange={(e) =>
                            setContent(locale, 'body', e.target.value)
                          }
                          dir={dir}
                        />
                      </Field>
                      <Field
                        id={`ann-${locale}-cta`}
                        label={t(`${K}announcementEditor.fields.ctaLabel`)}
                        optional
                        error={fieldError(errs.ctaLabel)}
                        counter={{
                          count: value.ctaLabel.length,
                          max: ANNOUNCEMENT_LIMITS.ctaLabelMax,
                        }}
                      >
                        <Input
                          value={value.ctaLabel}
                          onChange={(e) =>
                            setContent(locale, 'ctaLabel', e.target.value)
                          }
                          dir={dir}
                        />
                      </Field>
                    </TabsContent>
                  );
                })}
              </Tabs>
              <Field
                id="ann-cta-url"
                label={t(`${K}announcementEditor.fields.ctaUrl`)}
                hint={t(`${K}announcementEditor.fields.ctaUrlHint`)}
                error={fieldError(shown.ctaUrl)}
              >
                <Input
                  value={state.ctaUrl}
                  onChange={(e) => set('ctaUrl', e.target.value)}
                  dir="ltr"
                  inputMode="url"
                  autoComplete="off"
                />
              </Field>
              {surface === 'marketing_popup' ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {t(`${K}announcementEditor.fields.image`)}
                  </p>
                  {state.imageUrl ? (
                    <img
                      src={state.imageUrl}
                      alt=""
                      className="aspect-[2/1] w-full max-w-sm rounded-md border border-border object-cover"
                    />
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={upload.isPending}
                      onClick={() => imageInput.current?.click()}
                      aria-describedby="ann-image-hint"
                    >
                      {upload.isPending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <ImageUp className="size-4" aria-hidden />
                      )}
                      {t(
                        `${K}editor.cover.${upload.isPending ? 'uploading' : state.imageUrl ? 'replace' : 'upload'}`
                      )}
                    </Button>
                    {state.imageUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => set('imageUrl', null)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                        {t(`${K}editor.cover.remove`)}
                      </Button>
                    ) : null}
                  </div>
                  <input
                    ref={imageInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (file) void pickImage(file);
                    }}
                  />
                  <p
                    id="ann-image-hint"
                    className="text-xs text-muted-foreground"
                  >
                    {t(`${K}announcementEditor.fields.imageHint`)}
                  </p>
                  <p
                    role="status"
                    className="text-xs font-medium text-destructive empty:hidden"
                  >
                    {imageProblem ? t(`${K}${imageProblem}`) : ''}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t(`${K}announcementEditor.sections.schedule`)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="ann-starts"
                  label={t(`${K}announcementEditor.fields.startsAt`)}
                  optional
                >
                  <Input
                    type="datetime-local"
                    value={state.startsAt}
                    onChange={(e) => set('startsAt', e.target.value)}
                    dir="ltr"
                  />
                </Field>
                <Field
                  id="ann-ends"
                  label={t(`${K}announcementEditor.fields.endsAt`)}
                  optional
                  error={fieldError(shown.endsAt)}
                >
                  <Input
                    type="datetime-local"
                    value={state.endsAt}
                    onChange={(e) => set('endsAt', e.target.value)}
                    dir="ltr"
                  />
                </Field>
              </div>
              <p className="text-xs text-muted-foreground">
                {t(`${K}announcementEditor.fields.scheduleHint`)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t(
                  `${K}announcementEditor.sections.${surface === 'dashboard_banner' ? 'behaviour' : 'targeting'}`
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {surface !== 'dashboard_banner' ? (
                <div className="space-y-2">
                  <Label htmlFor="ann-page-input">
                    {t(`${K}announcementEditor.fields.pages`)}
                  </Label>
                  <p
                    id="ann-pages-hint"
                    className="text-xs text-muted-foreground"
                  >
                    {t(`${K}announcementEditor.fields.pagesHint`)}
                  </p>
                  {state.pages.length === 0 ? (
                    <p className="text-sm font-medium">
                      {t(`${K}announcementEditor.fields.pagesAll`)}
                    </p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {state.pages.map((path) => (
                        <li
                          key={path}
                          className="inline-flex items-center rounded-pill border border-border bg-muted/40 ps-3 font-mono text-xs"
                          dir="ltr"
                        >
                          {path}
                          <button
                            type="button"
                            onClick={() =>
                              set(
                                'pages',
                                state.pages.filter((entry) => entry !== path)
                              )
                            }
                            aria-label={t(
                              `${K}announcementEditor.fields.pagesRemove`,
                              { path }
                            )}
                            className="inline-flex size-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <X className="size-3.5" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <Input
                      id="ann-page-input"
                      value={pageInput}
                      placeholder={t(
                        `${K}announcementEditor.fields.pagesPlaceholder`
                      )}
                      onChange={(e) => {
                        setPageInput(e.target.value);
                        setPageError(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addPage();
                        }
                      }}
                      dir="ltr"
                      aria-describedby={`ann-pages-hint${pageError ? ' ann-page-error' : ''}`}
                      aria-invalid={pageError || undefined}
                      className="font-mono"
                    />
                    <Button type="button" variant="outline" onClick={addPage}>
                      <Plus className="size-4" aria-hidden />
                      {t(`${K}announcementEditor.fields.pagesAdd`)}
                    </Button>
                  </div>
                  {pageError ? (
                    <p
                      id="ann-page-error"
                      className="text-xs font-medium text-destructive"
                    >
                      {t(`${K}announcementEditor.validation.path`)}
                    </p>
                  ) : null}
                </div>
              ) : (
                select(
                  'ann-audience',
                  t(`${K}announcementEditor.fields.audience`),
                  state.audience,
                  DASHBOARD_AUDIENCES,
                  (o) => `${K}announcementEditor.audience.${o}`,
                  (v) => set('audience', v)
                )
              )}
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="ann-dismissible">
                  {t(`${K}announcementEditor.fields.dismissible`)}
                </Label>
                <Switch
                  id="ann-dismissible"
                  checked={state.dismissible}
                  onCheckedChange={(value) => set('dismissible', value)}
                />
              </div>
              {surface === 'marketing_popup' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="ann-delay"
                    label={t(`${K}announcementEditor.fields.popupDelaySeconds`)}
                    error={fieldError(shown.popupDelaySeconds)}
                  >
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={60}
                      value={state.popupDelaySeconds}
                      onChange={(e) => set('popupDelaySeconds', e.target.value)}
                      dir="ltr"
                    />
                  </Field>
                  {select(
                    'ann-frequency',
                    t(`${K}announcementEditor.fields.popupFrequency`),
                    state.popupFrequency,
                    POPUP_FREQUENCIES,
                    (o) => `${K}announcementEditor.frequency.${o}`,
                    (v) => set('popupFrequency', v)
                  )}
                </div>
              ) : null}
              <Field
                id="ann-priority"
                label={t(`${K}announcementEditor.fields.priority`)}
                hint={t(`${K}announcementEditor.fields.priorityHint`)}
                error={fieldError(shown.priority)}
              >
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={state.priority}
                  onChange={(e) => set('priority', e.target.value)}
                  dir="ltr"
                  className="max-w-32"
                />
              </Field>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6 xl:sticky xl:top-4 xl:self-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t(`${K}announcementEditor.sections.preview`)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnnouncementPreview
                surface={surface}
                tone={state.tone}
                content={state.content}
                ctaUrl={state.ctaUrl}
                imageUrl={state.imageUrl}
                dismissible={state.dismissible}
              />
            </CardContent>
          </Card>
          {announcement ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t(`${K}announcementEditor.sections.stats`)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid grid-cols-3 gap-3 text-center">
                  {(['views', 'clicks', 'dismissals'] as const).map((key) => (
                    <div key={key} className="rounded-md bg-muted/40 p-3">
                      <dt className="text-xs text-muted-foreground">
                        {t(`${K}announcements.stats.${key}`)}
                      </dt>
                      <dd
                        className="text-xl font-semibold tabular-nums"
                        data-atlas-numeric="true"
                      >
                        {n(announcement.stats[key])}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="text-xs text-muted-foreground">
                  {announcement.updatedByName
                    ? t(`${K}common.updatedBy`, {
                        date: fmt.dateTime(announcement.updatedAt),
                        name: announcement.updatedByName,
                      })
                    : t(`${K}common.updatedAt`, {
                        date: fmt.dateTime(announcement.updatedAt),
                      })}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {(['activate', 'deactivate', 'archive'] as const).map((action) => (
        <ConfirmDialog
          key={action}
          open={confirm === action}
          onOpenChange={(open) => !open && setConfirm(null)}
          title={t(`${K}announcementEditor.confirm.${action}Title`, {
            surface: surfaceName,
          })}
          description={t(`${K}announcementEditor.confirm.${action}Body`)}
          confirmLabel={t(`${K}announcementEditor.actions.${action}`)}
          destructive={action !== 'activate'}
          pending={busy}
          onConfirm={() => void runTransition(action)}
        />
      ))}
      <ConfirmDialog
        open={confirm === 'delete'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t(`${K}announcementEditor.confirm.deleteTitle`)}
        description={t(`${K}announcementEditor.confirm.deleteBody`)}
        confirmLabel={t(`${K}announcementEditor.actions.delete`)}
        destructive
        pending={busy}
        onConfirm={() => {
          if (!announcementId) return;
          remove.mutate(announcementId, {
            onSuccess: () => {
              markSaved();
              notifySuccess(`${K}announcementEditor.toasts.deleted`);
              navigate(DASHBOARD_ROUTES.platformAnnouncements, {
                replace: true,
              });
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
