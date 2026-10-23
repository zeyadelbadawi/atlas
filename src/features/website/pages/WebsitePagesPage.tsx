/**
 * Website Pages Page.
 *
 * Lists core + custom pages, toggles visibility (a presentation/config
 * state — never authorization; a hidden page's content is preserved, only
 * navigation/visibility changes, see `Reports/ARCHITECTURE.md`, Prompt 9,
 * "Page Visibility Is Not Security"), and manages custom pages.
 *
 * CMS phase 4 — one primary path: a page opens in the visual editor (its
 * row, and its "Edit" button; a new page too). The classic editor and the
 * page's draft preview are in each row's "More" menu, with Delete. Course
 * details, which the visual editor cannot open, still edits in the classic
 * editor.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Eye,
  FileCode2,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { SectionTabs } from '@components/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  getWebsiteTabs,
  opensInVisualEditor,
  pageEditPath,
  websitePreviewPath,
} from '../utils/website-navigation.utils';
import { isContentValidationFailure } from '../utils/save-validation.utils';
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
 * draws it. CMS phase 4: a template's sections go WITH the create request
 * — the API creates the page and its sections in one transaction, so a
 * template page is either created whole or not at all (never an empty
 * page left behind by a failed second save).
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
  const academy = useAcademy(academyId).data;
  const [choice, setChoice] = useState<string>(BLANK_PAGE);

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
            // Buttons link only to pages visitors can reach; the slug
            // above stays unique across hidden pages too.
            presetContextOf({ configuration, pages: visiblePages })
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
    createPage.reset();
  };
  // A new page opens where pages are edited: the visual editor.
  const openEditor = (page: WebsitePage) => {
    close();
    navigate(pageEditPath(academyId, page));
  };
  const onSubmit = (data: CreateWebsitePageFormData) => {
    createPage.mutate(
      {
        academyId,
        // The sections previewed are the sections created — a blank page
        // sends none, exactly as before.
        payload: sections.length > 0 ? { ...data, sections } : data,
      },
      { onSuccess: openEditor }
    );
  };

  const isBusy = createPage.isPending;
  // The API refused the template's sections (they are checked with the
  // page-save rules: a section limit, the site's language, a page a button
  // links to). Nothing was created, and sending the same sections again
  // would fail the same way, so there is no retry — the Owner can pick a
  // blank page or another template.
  const sectionsRejected =
    sections.length > 0 &&
    createPage.error !== null &&
    isContentValidationFailure(createPage.error) &&
    (createPage.error?.violations ?? []).some((violation) =>
      /^\d/.test(violation.field)
    );

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
              <PageTemplateOptions
                value={choice}
                onChange={(key) => {
                  createPage.reset();
                  choose(key);
                }}
                disabled={isBusy}
              />
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
                      <Input {...field} disabled={isBusy} />
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
                      <Input {...field} disabled={isBusy} dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {sectionsRejected ? (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-foreground"
                  data-testid="template-sections-rejected"
                >
                  {t('website:pageTemplates.sectionsRejected')}
                </div>
              ) : createPage.error ? (
                <ErrorState onRetry={form.handleSubmit(onSubmit)} />
              ) : null}
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
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function WebsitePagesPage(): JSX.Element {
  const { t } = useTranslation();
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
    {
      labelKey: 'website:overview.title',
      path: buildPath(DASHBOARD_ROUTES.websiteOverview, { academyId }),
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
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="h-11 sm:h-10">
              <Link to={websitePreviewPath(academyId)}>
                <Eye className="size-4" strokeWidth={2} aria-hidden />
                {t('website:pages.previewAction')}
              </Link>
            </Button>
            {canManage ? (
              <Button
                type="button"
                className="h-11 sm:h-10"
                onClick={createDialog.open}
              >
                <Plus className="size-4" strokeWidth={2} aria-hidden />
                {t('website:pages.createAction')}
              </Button>
            ) : null}
          </div>
        }
      />

      <SectionTabs items={getWebsiteTabs(academyId, { canManage })} />

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {pages.map((page) => {
            const editPath = pageEditPath(academyId, page);
            const visual = opensInVisualEditor(page);
            return (
              <div
                key={page.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                data-testid="website-page-row"
              >
                {/* The whole title area opens the page; the Edit button is
                    its one stop for the keyboard. */}
                <Link
                  to={editPath}
                  tabIndex={-1}
                  className="flex min-h-11 min-w-0 flex-1 flex-col justify-center text-start"
                >
                  <span className="truncate font-medium text-foreground">
                    {page.title}
                  </span>
                  <span className="truncate text-sm text-muted-foreground">
                    <bdi dir="ltr">/{page.slug}</bdi>
                  </span>
                </Link>

                <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
                  {page.pageType === 'core' ? (
                    <StatusBadge
                      labelKey="website:pages.coreBadge"
                      tone="neutral"
                    />
                  ) : null}
                  {page.coreType === 'courseDetails' ? (
                    <span
                      className="flex size-11 items-center justify-center text-muted-foreground"
                      title={t('website:pages.alwaysVisible')}
                    >
                      <Lock className="size-4" aria-hidden />
                      <span className="sr-only">
                        {t('website:pages.alwaysVisible')}
                      </span>
                    </span>
                  ) : (
                    <label className="flex min-h-11 cursor-pointer items-center gap-2">
                      <Switch
                        checked={page.visible}
                        disabled={
                          !canManage ||
                          (updatePage.isPending && pendingId === page.id)
                        }
                        onCheckedChange={() => toggleVisibility(page)}
                        aria-label={`${t('website:pages.visibilityToggle')}: ${page.title}`}
                      />
                      <span className="hidden w-14 text-xs text-muted-foreground sm:inline">
                        {page.visible
                          ? t('website:pages.visibleState')
                          : t('website:pages.hiddenState')}
                      </span>
                    </label>
                  )}
                  <div className="ms-auto flex items-center gap-2 sm:ms-0">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-11 px-4 sm:h-9"
                    >
                      <Link
                        to={editPath}
                        aria-label={t(
                          visual
                            ? 'website:pages.editAria'
                            : 'website:pages.editClassicAria',
                          { title: page.title }
                        )}
                        data-testid="website-page-edit"
                      >
                        <Pencil className="size-4" aria-hidden />
                        {t('website:pages.editAction')}
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-11 sm:size-9"
                          aria-label={t('website:pages.moreActions', {
                            title: page.title,
                          })}
                          data-testid="website-page-more"
                        >
                          <MoreHorizontal className="size-4" aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-52">
                        {visual ? (
                          <DropdownMenuItem asChild className="min-h-11 gap-2">
                            <Link
                              to={buildPath(
                                DASHBOARD_ROUTES.websitePageEditor,
                                { academyId, pageId: page.id }
                              )}
                            >
                              <FileCode2 className="size-4" aria-hidden />
                              {t('website:pages.classicEditor')}
                            </Link>
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem asChild className="min-h-11 gap-2">
                          <Link to={websitePreviewPath(academyId, page.id)}>
                            <Eye className="size-4" aria-hidden />
                            {t('website:pages.previewPage')}
                          </Link>
                        </DropdownMenuItem>
                        {page.pageType === 'custom' && canManage ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="min-h-11 gap-2 text-destructive focus:text-destructive"
                              onSelect={() => void handleDelete(page)}
                            >
                              <Trash2 className="size-4" aria-hidden />
                              {t('website:pages.deleteAction')}
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}

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
                className="flex min-h-11 flex-1 flex-col justify-center rounded-md text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  <bdi dir="ltr">
                    /{page === 'signIn' ? 'sign-in' : 'sign-up'}
                  </bdi>
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
