/**
 * Website Pages Page.
 *
 * Lists core + custom pages, toggles visibility (a presentation/config
 * state — never authorization; a hidden page's content is preserved, only
 * navigation/visibility changes, see `Reports/ARCHITECTURE.md`, Prompt 9,
 * "Page Visibility Is Not Security"), and manages custom pages.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Lock, MousePointerClick, Plus, Trash2 } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { SectionTabs } from '@components/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useConfirmDialog } from '@app/providers';
import { useDisclosure, usePermissions } from '@hooks';
import { useServerValidation } from '@forms';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useAcademy } from '@features/academy';
import { cn } from '@utils';
import {
  useCreateWebsitePage,
  useDeleteWebsitePage,
  useUpdateWebsitePage,
  useWebsiteConfiguration,
  useWebsitePages,
} from '../hooks';
import {
  createWebsitePageSchema,
  type CreateWebsitePageFormData,
} from '../schemas/website.schemas';
import { getWebsiteTabs } from '../utils/website-navigation.utils';
import { AuthPageCopyDialog } from '../components/AuthPageCopyDialog';
import type { AuthPageKey } from '../utils/auth-page-copy.utils';
import { resolveDefaultLocale } from '../constants/locale.constants';
import {
  BLANK_PAGE,
  PageTemplateOptions,
  PageTemplatePreview,
} from '../presets/PageTemplatePicker';
import {
  availableTemplateSlug,
  buildTemplateSections,
  findPageTemplate,
  pageTemplateLabelKeys,
} from '../presets/page-templates.registry';
import {
  presetContextOf,
  type PresetPreviewSource,
} from '../presets/preset-preview-source';
import type {
  BreadcrumbItem,
  SectionInstance,
  WebsiteConfiguration,
  WebsitePage,
} from '@types';

/**
 * "New page": a title and an address, and — CMS phase 3e — how to start:
 * a blank page or a page template («صفحات جاهزة»), previewed as the site
 * draws it. A template's sections are saved through the pages API right
 * after the page is created, in one save; if that save fails, the page
 * exists (empty) and the dialog offers to try the save again or to open it.
 */
function CreatePageDialog({
  academyId,
  open,
  onOpenChange,
  pages,
  configuration,
}: {
  readonly academyId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly pages: readonly WebsitePage[];
  readonly configuration: WebsiteConfiguration;
}): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createPage = useCreateWebsitePage();
  const updatePage = useUpdateWebsitePage();
  const academy = useAcademy(academyId).data;
  const [choice, setChoice] = useState<string>(BLANK_PAGE);
  // A page created from a template whose sections are not saved yet.
  const [unsaved, setUnsaved] = useState<{
    readonly page: WebsitePage;
    readonly sections: readonly SectionInstance[];
  } | null>(null);
  const [sectionsFailed, setSectionsFailed] = useState(false);

  const form = useForm<CreateWebsitePageFormData>({
    resolver: zodResolver(createWebsitePageSchema),
    defaultValues: { title: '', slug: '' },
  });
  useServerValidation(form, createPage.error);

  const visiblePages = useMemo(
    () => pages.filter((candidate) => candidate.visible),
    [pages]
  );
  const source: PresetPreviewSource = {
    academyId,
    academyName: academy?.name ?? '',
    academyLogo: academy?.logo,
    configuration,
    pages: visiblePages,
    locale: resolveDefaultLocale(configuration.defaultLocale),
  };
  const template = choice === BLANK_PAGE ? undefined : findPageTemplate(choice);
  // Built once per choice: the sections previewed are the sections saved.
  const [sections, setSections] = useState<readonly SectionInstance[]>([]);

  // A template suggests a title and an address, unless the Owner typed their own.
  const suggestion = (key: string) => {
    const next = key === BLANK_PAGE ? undefined : findPageTemplate(key);
    return next
      ? {
          title: t(pageTemplateLabelKeys(next).pageTitle),
          slug: availableTemplateSlug(next, pages),
        }
      : { title: '', slug: '' };
  };
  const choose = (key: string) => {
    const previous = suggestion(choice);
    const next = suggestion(key);
    const { title, slug } = form.getValues();
    if (title === previous.title) form.setValue('title', next.title);
    if (slug === previous.slug) form.setValue('slug', next.slug);
    const chosen = key === BLANK_PAGE ? undefined : findPageTemplate(key);
    setSections(
      chosen
        ? buildTemplateSections(
            chosen,
            presetContextOf({ configuration, pages })
          )
        : []
    );
    setChoice(key);
  };

  const close = () => {
    onOpenChange(false);
    form.reset();
    setChoice(BLANK_PAGE);
    setSections([]);
    setUnsaved(null);
    setSectionsFailed(false);
  };
  const openEditor = (page: WebsitePage) => {
    close();
    navigate(
      buildPath(DASHBOARD_ROUTES.websitePageEditor, {
        academyId,
        pageId: page.id,
      })
    );
  };
  const saveSections = (
    page: WebsitePage,
    pageSections: readonly SectionInstance[]
  ) => {
    setSectionsFailed(false);
    updatePage.mutate(
      {
        academyId,
        pageId: page.id,
        payload: { sections: pageSections, expectedVersion: page.version },
      },
      {
        onSuccess: (saved) => openEditor(saved),
        onError: () => {
          setUnsaved({ page, sections: pageSections });
          setSectionsFailed(true);
        },
      }
    );
  };

  const onSubmit = (data: CreateWebsitePageFormData) => {
    const pageSections = sections;
    createPage.mutate(
      { academyId, payload: data },
      {
        onSuccess: (page) => {
          if (pageSections.length === 0) openEditor(page);
          else saveSections(page, pageSections);
        },
      }
    );
  };

  const isBusy = createPage.isPending || updatePage.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
        else onOpenChange(next);
      }}
    >
      <DialogContent
        className={cn('max-h-[92dvh] overflow-y-auto', template && 'max-w-5xl')}
        data-testid="create-page-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t('website:pages.createTitle')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className={cn(
              'grid gap-6',
              template &&
                'lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:[grid-template-areas:"options_preview""options_fields"] lg:grid-rows-[auto_1fr]'
            )}
          >
            <div className={cn(template && 'lg:[grid-area:options]')}>
              <PageTemplateOptions value={choice} onChange={choose} />
            </div>
            {template ? (
              <div className="min-w-0 lg:[grid-area:preview]">
                <PageTemplatePreview
                  source={source}
                  title={
                    form.watch('title') ||
                    t(pageTemplateLabelKeys(template).pageTitle)
                  }
                  slug={form.watch('slug') || template.slug}
                  sections={sections}
                />
              </div>
            ) : null}
            <div
              className={cn('space-y-4', template && 'lg:[grid-area:fields]')}
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('website:pages.titleLabel')}</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!!unsaved} />
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
                    <FormLabel>{t('website:pages.slugLabel')}</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!!unsaved} dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {createPage.error ? (
                <ErrorState onRetry={form.handleSubmit(onSubmit)} />
              ) : null}
              {sectionsFailed && unsaved ? (
                <div
                  role="alert"
                  className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
                  data-testid="template-sections-failed"
                >
                  <p className="text-foreground">
                    {t('website:pageTemplates.sectionsFailed')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-10"
                      disabled={updatePage.isPending}
                      onClick={() =>
                        saveSections(unsaved.page, unsaved.sections)
                      }
                    >
                      {t('website:pageTemplates.retrySections')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-10"
                      onClick={() => openEditor(unsaved.page)}
                    >
                      {t('website:pageTemplates.openEmpty')}
                    </Button>
                  </div>
                </div>
              ) : null}
              {unsaved ? null : (
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={isBusy}
                    className="h-11"
                    data-testid="create-page-submit"
                  >
                    {isBusy ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : null}
                    {template
                      ? t('website:pageTemplates.createFromTemplate')
                      : t('website:pages.createAction')}
                  </Button>
                </DialogFooter>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function WebsitePagesPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { academyId } = useParams<{ academyId: string }>();
  const { confirm } = useConfirmDialog();
  const { hasPermission } = usePermissions();
  const createDialog = useDisclosure();

  const { data, isLoading, error, refetch } = useWebsitePages(academyId ?? '', {
    query: { pagination: { page: 1, pageSize: 50 } },
  });
  // Sign In/Sign Up have no `WebsitePage` row of their own — their heading
  // copy lives on `header.authPages` (see `AuthPageCopyDialog`'s doc
  // comment) — so this page also needs the configuration, not just pages.
  const configQuery = useWebsiteConfiguration(academyId ?? '');
  const updatePage = useUpdateWebsitePage();
  const deletePage = useDeleteWebsitePage();
  const [pendingId, setPendingId] = useState<string>();
  const [openAuthPage, setOpenAuthPage] = useState<AuthPageKey | null>(null);

  useEffect(() => {
    if (!updatePage.isPending) setPendingId(undefined);
  }, [updatePage.isPending]);

  const canManage = hasPermission('academy.website.manage');

  if (isLoading || configQuery.isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || configQuery.error || !data || !configQuery.data || !academyId) {
    return (
      <PageContainer>
        <PageHeader titleKey="website:pages.title" />
        <ErrorState
          onRetry={() => {
            void refetch();
            void configQuery.refetch();
          }}
        />
      </PageContainer>
    );
  }

  const pages = data.items;
  const configuration = configQuery.data;

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.academyOverview',
      path: DASHBOARD_ROUTES.academy,
    },
    { labelKey: 'website:pages.title' },
  ];

  const toggleVisibility = (page: WebsitePage) => {
    setPendingId(page.id);
    updatePage.mutate({
      academyId,
      pageId: page.id,
      // Derived from the row this list loaded, so it is exactly as stale
      // as `page.visible` is — sending it means a toggle computed from an
      // out-of-date list is refused rather than applied to a page someone
      // else has since changed.
      payload: { visible: !page.visible, expectedVersion: page.version },
    });
  };

  const handleDelete = async (page: WebsitePage) => {
    const confirmed = await confirm({
      titleKey: 'website:pages.deleteConfirmTitle',
      descriptionKey: 'website:pages.deleteConfirmDescription',
      confirmLabelKey: 'website:pages.deleteAction',
      intent: 'destructive',
      values: { title: page.title },
    });
    if (!confirmed) return;
    deletePage.mutate({ academyId, pageId: page.id });
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey="website:pages.title"
        descriptionKey="website:pages.subtitle"
        breadcrumbs={breadcrumbs}
        actions={
          canManage ? (
            <Button type="button" onClick={createDialog.open}>
              <Plus className="size-4" strokeWidth={2} aria-hidden />
              {t('website:pages.createAction')}
            </Button>
          ) : undefined
        }
      />

      <SectionTabs items={getWebsiteTabs(academyId, { canManage })} />

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center justify-between gap-3 p-4"
            >
              <button
                type="button"
                className="flex-1 text-start"
                onClick={() =>
                  navigate(
                    buildPath(DASHBOARD_ROUTES.websitePageEditor, {
                      academyId,
                      pageId: page.id,
                    })
                  )
                }
              >
                <p className="font-medium text-foreground">{page.title}</p>
                <p className="text-sm text-muted-foreground">/{page.slug}</p>
              </button>

              <div className="flex items-center gap-3">
                {page.coreType !== 'courseDetails' ? (
                  <Button asChild variant="outline" size="sm" className="h-9">
                    <Link
                      to={buildPath(DASHBOARD_ROUTES.websiteVisualEditor, {
                        academyId,
                        pageId: page.id,
                      })}
                      aria-label={`${t('website:visualEditor.open')}: ${page.title}`}
                    >
                      <MousePointerClick className="size-4" aria-hidden />
                      <span className="hidden sm:inline">
                        {t('website:visualEditor.open')}
                      </span>
                    </Link>
                  </Button>
                ) : null}
                {page.pageType === 'core' ? (
                  <StatusBadge
                    labelKey="website:pages.coreBadge"
                    tone="neutral"
                  />
                ) : null}
                {page.coreType === 'courseDetails' ? (
                  <Lock className="size-4 text-muted-foreground" aria-hidden />
                ) : (
                  <Switch
                    checked={page.visible}
                    disabled={
                      !canManage ||
                      (updatePage.isPending && pendingId === page.id)
                    }
                    onCheckedChange={() => toggleVisibility(page)}
                    aria-label={t('website:pages.visibilityToggle')}
                  />
                )}
                {page.pageType === 'custom' && canManage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(page)}
                    aria-label={t('website:pages.deleteAction')}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}

          {/*
            Sign In/Sign Up are fixed, dedicated pages — not `WebsitePage`
            records — so they never showed up here, even though they are
            genuinely part of the site an admin browses and customizes
            like every other page. These two rows make them discoverable
            in the one place admins already look, without pretending they
            are full page-editor pages (locked, same as Course Details;
            no visibility toggle since they must always be reachable, no
            delete since they aren't real records to delete).
          */}
          {(['signIn', 'signUp'] as const).map((page) => (
            <div
              key={page}
              className="flex items-center justify-between gap-3 p-4"
            >
              <button
                type="button"
                className="flex-1 text-start"
                onClick={() => setOpenAuthPage(page)}
              >
                <p className="font-medium text-foreground">
                  {t(
                    page === 'signIn'
                      ? 'website:navigation.ctaTargetSignIn'
                      : 'website:navigation.ctaTargetSignUp'
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  /{page === 'signIn' ? 'sign-in' : 'sign-up'}
                </p>
              </button>

              <div className="flex items-center gap-3">
                <StatusBadge
                  labelKey="website:pages.coreBadge"
                  tone="neutral"
                />
                <Lock className="size-4 text-muted-foreground" aria-hidden />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {canManage ? (
        <CreatePageDialog
          academyId={academyId}
          open={createDialog.isOpen}
          onOpenChange={createDialog.setOpen}
          pages={pages}
          configuration={configuration}
        />
      ) : null}

      {openAuthPage ? (
        <AuthPageCopyDialog
          academyId={academyId}
          configuration={configuration}
          page={openAuthPage}
          open={!!openAuthPage}
          onOpenChange={(open) => setOpenAuthPage(open ? openAuthPage : null)}
        />
      ) : null}
    </PageContainer>
  );
}
