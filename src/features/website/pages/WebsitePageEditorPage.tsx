/**
 * Website Page Editor Page.
 *
 * EditorShell for one page: `SectionTree` (composition) + a Section
 * Editor dialog (`SectionConfigForm`) + `PreviewViewport` (the real
 * `WebsiteRenderer`, desktop/tablet/mobile). All composition changes
 * (add/remove/hide/reorder/edit/duplicate) are held in local draft state
 * and persisted together — the draft is never auto-saved, and nothing is
 * sent to the backend until the Tenant Owner explicitly confirms (see
 * `Reports/ARCHITECTURE.md`, Prompt 9, "Draft / Publish Model").
 *
 * ONE ACTION TO GO LIVE. On a published site, "Publish page" saves the
 * local edits and publishes this page in one step, pinned to the exact
 * version just saved, so a colleague's later save is never put live
 * unseen. "Save draft" stays for work that should not go live yet. Before
 * the site is first published, "Save changes" is the only page action.
 *
 * CONTENT LIMITS. The API validates the whole `sections` array on every
 * save, so one section holding text over a current limit (saved before
 * the limit tightened — reads never re-validate) blocks saving the page.
 * Such sections are marked in the tree, a notice lists them with a way
 * into each, and saving is held back until they are shortened. A refused
 * save's path-level violations reach the same messages: the tree marker
 * and the section editor's field errors.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Loader2,
  MousePointerClick,
  Save,
  Search,
  UploadCloud,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirmDialog } from '@app/providers';
import { useDisclosure, useUnsavedChanges, usePermissions } from '@hooks';
import { useAcademy } from '@features/academy';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import {
  useWebsiteConfiguration,
  useWebsitePage,
  useWebsitePages,
} from '../hooks';
import { WebsiteContentLocaleProvider } from '../components/website-content-locale';
import { resolveDefaultLocale } from '../constants/locale.constants';
import { WebsitePublishBar } from '../components/WebsitePublishBar';
import { SectionTree } from '../components/SectionTree';
import { SectionConfigForm } from '../components/SectionConfigForm';
import { WebsitePageSeoDialog } from '../components/WebsitePageSeoDialog';
import {
  PreviewViewport,
  initialPreviewBreakpoint,
  type PreviewBreakpoint,
} from '../components/PreviewViewport';
import { WebsiteRenderer } from '../renderer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PUBLIC_WEBSITE_LOCALES,
  PUBLIC_WEBSITE_LOCALE_DIRECTION,
  PUBLIC_WEBSITE_LOCALE_LABELS,
  type PublicWebsiteLocale,
} from '../constants/locale.constants';
import { SECTION_METADATA } from '../sections';
import { useEditingPresence } from '../hooks/useEditingPresence';
import { EditingPresenceBanner } from '../components/EditingPresenceBanner';
import { SaveConflictDialog } from '../components/SaveConflictDialog';
import { readSaveConflict } from '../utils/save-conflict.utils';
import { usePageDraft } from '../hooks/usePageDraft';
import {
  duplicateSection,
  insertSection,
  moveSection,
  removeSection,
  replaceSectionConfig,
  toggleSectionEnabled,
  toggleSectionVisibility,
} from '../utils/section-list.utils';
import {
  isContentValidationFailure,
  rejectedSections,
} from '../utils/save-validation.utils';
import { isOverLimitIssue } from '../schemas/section-content-issues';
import { SectionPresetDialog } from '../presets/SectionPresetDialog';
import { hasPresets } from '../presets/section-presets.registry';
import type { SectionStart } from '../presets/section-presets.types';
import type {
  ResponsiveVisibility,
  SectionInstance,
  SectionType,
} from '@types';

/**
 * B0-WEB-02 — every bilingual field on this page requires the site's main
 * language (`LocalizedTextField`): the saved configuration (the same cached
 * query the page reads) says which.
 */
export default function WebsitePageEditorPage(): JSX.Element {
  const { academyId } = useParams<{ academyId: string }>();
  const configQuery = useWebsiteConfiguration(academyId ?? '');
  return (
    <WebsiteContentLocaleProvider
      value={resolveDefaultLocale(configQuery.data?.defaultLocale)}
    >
      <WebsitePageEditor />
    </WebsiteContentLocaleProvider>
  );
}

function WebsitePageEditor(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { academyId, pageId } = useParams<{
    academyId: string;
    pageId: string;
  }>();
  const { confirm } = useConfirmDialog();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('academy.website.manage');

  const academyQuery = useAcademy(academyId ?? '');
  const configQuery = useWebsiteConfiguration(academyId ?? '');
  const pagesQuery = useWebsitePages(academyId ?? '', {
    query: { pagination: { page: 1, pageSize: 50 } },
  });
  const pageQuery = useWebsitePage(academyId ?? '', pageId ?? '');
  const canPublish = hasPermission('academy.website.publish');

  // `?section=<id>` opens that section's editor once the page loads (the
  // launch checklist and the publish warning link straight to a section).
  const [searchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | undefined>(
    () => searchParams.get('section') ?? undefined
  );
  // THE PAGE EDITOR PREVIEW USED TO BE HARDCODED TO ENGLISH. This page
  // never passed `locale` to `WebsiteRenderer`, so it fell back to
  // `DEFAULT_PUBLIC_WEBSITE_LOCALE` ('en') — meaning an admin editing the
  // Arabic side of their site previewed it in English AND left-to-right,
  // which is exactly the RTL-preview defect. `WebsitePreviewPage` already
  // had this selector; the editor, where admins actually spend their
  // time, did not.
  //
  // It opens in the site's main language (`chosenLocale` null until the
  // admin picks one), as the section editor's own preview does.
  const [chosenLocale, setPreviewLocale] = useState<PublicWebsiteLocale | null>(
    null
  );
  const [breakpoint, setBreakpoint] = useState<PreviewBreakpoint>(
    initialPreviewBreakpoint
  );
  // CMS phase 3e — the section whose looks are being chosen, if any.
  const [looksOf, setLooksOf] = useState<SectionType | null>(null);
  const seoDialog = useDisclosure();

  /*
    CONCURRENT EDITING. Two things, doing different jobs:

    - Presence is advisory and non-blocking. It announces this editor and
      names colleagues with the same page open, so a collision is avoided
      rather than resolved. Only announced when the user can actually
      manage the page — a read-only viewer is not editing.
    - The conflict (`usePageDraft`) is the load-bearing half: the save
      carries the version it was based on, and the server refuses a stale
      one instead of overwriting whoever committed in between.
  */
  const participants = useEditingPresence({
    academyId: academyId ?? '',
    pageId: pageId ?? '',
    enabled: canManage,
  });

  const {
    draftSections,
    setDraftSections,
    isDirty,
    serverIssuesById,
    clearServerIssues,
    needsShorteningIds,
    isBlockedByLimits,
    conflict,
    setConflict,
    saveSections,
    saveDraft,
    publishThisPage,
    reloadLatest,
    keepMine,
    isWorking,
    updatePage,
    publishPage,
  } = usePageDraft({
    academyId,
    pageId,
    page: pageQuery.data,
    refetchPage: pageQuery.refetch,
  });

  useUnsavedChanges({
    isDirty,
    messageKey: 'website:editor.unsavedChanges',
    onSave: canManage
      ? async () => (await saveSections('save')) !== null
      : undefined,
  });

  const isLoading =
    academyQuery.isLoading ||
    configQuery.isLoading ||
    pagesQuery.isLoading ||
    pageQuery.isLoading;
  const error =
    academyQuery.error ??
    configQuery.error ??
    pagesQuery.error ??
    pageQuery.error;

  const refetchAll = () => {
    void academyQuery.refetch();
    void configQuery.refetch();
    void pagesQuery.refetch();
    void pageQuery.refetch();
  };

  if (isLoading) {
    return (
      <PageContainer fullWidth>
        <div className="space-y-6 px-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (
    error ||
    !academyQuery.data ||
    !configQuery.data ||
    !pagesQuery.data ||
    !pageQuery.data ||
    !academyId ||
    !pageId
  ) {
    return (
      <PageContainer>
        <PageHeader titleKey="website:editor.title" />
        <ErrorState onRetry={refetchAll} />
      </PageContainer>
    );
  }

  const academy = academyQuery.data;
  const configuration = configQuery.data;
  const pages = pagesQuery.data.items;
  const page = pageQuery.data;
  const previewLocale =
    chosenLocale ?? resolveDefaultLocale(configuration.defaultLocale);
  // The site's navigation and links are built from the pages a visitor
  // can reach; a hidden page is not among them. (The section editor's
  // link pickers still offer every page.)
  const previewPages = pages.filter((candidate) => candidate.visible);
  const sectionPagePreview = (
    sectionId: string,
    config: SectionInstance['config'],
    locale: PublicWebsiteLocale
  ) => (
    <WebsiteRenderer
      academyId={academyId}
      academyName={academy.name}
      academyLogo={academy.logo}
      configuration={configuration}
      pages={previewPages}
      page={{
        ...page,
        sections: draftSections.map((section) =>
          section.id === sectionId
            ? ({ ...section, config } as SectionInstance)
            : section
        ),
      }}
      locale={locale}
      onNavigate={() => undefined}
    />
  );
  const selectedSection = draftSections.find(
    (section) => section.id === selectedId
  );
  const previewPage = { ...page, sections: draftSections };

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.academyOverview',
      label: academy.name,
      path: DASHBOARD_ROUTES.academy,
    },
    {
      labelKey: 'website:pages.title',
      path: buildPath(DASHBOARD_ROUTES.websitePages, {
        academyId: academyId ?? '',
      }),
    },
    { labelKey: 'website:editor.title', label: page.title },
  ];

  const handleToggleEnabled = (id: string) =>
    setDraftSections((prev) => toggleSectionEnabled(prev, id));

  const handleToggleVisibility = (
    id: string,
    breakpointKey: keyof ResponsiveVisibility
  ) =>
    setDraftSections((prev) =>
      toggleSectionVisibility(prev, id, breakpointKey)
    );

  const handleMove = (index: number, direction: -1 | 1) =>
    setDraftSections((prev) => moveSection(prev, index, direction));

  const handleDuplicate = (id: string) =>
    setDraftSections((prev) => duplicateSection(prev, id).sections);

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      titleKey: 'website:editor.deleteConfirmTitle',
      descriptionKey: 'website:editor.deleteConfirmDescription',
      confirmLabelKey: 'website:editor.deleteSection',
      intent: 'destructive',
    });
    if (!confirmed) return;
    setDraftSections((prev) => removeSection(prev, id));
  };

  // A section with presets first offers its looks (CMS phase 3e).
  const handleAdd = (type: SectionType) => {
    if (hasPresets(type)) {
      setLooksOf(type);
      return;
    }
    addSection(type);
  };
  const addSection = (type: SectionType, start?: SectionStart) => {
    const added = insertSection(
      draftSections,
      type,
      undefined,
      undefined,
      start
    );
    setDraftSections(added.sections);
    setLooksOf(null);
    setSelectedId(added.id);
  };

  const handleSaveSectionConfig = (config: SectionInstance['config']) => {
    if (selectedId) {
      clearServerIssues(selectedId);
      setDraftSections((prev) =>
        replaceSectionConfig(prev, selectedId, config)
      );
    }
    setSelectedId(undefined);
  };

  const handleSaveDraft = async (overrideVersion?: number) => {
    await saveDraft(overrideVersion);
  };

  const handlePublishPage = async () => {
    if (isWorking()) return;
    const confirmed = await confirm({
      titleKey: 'website:editor.publishPageConfirmTitle',
      descriptionKey: 'website:editor.publishPageConfirmDescription',
      confirmLabelKey: 'website:editor.publishPageAction',
    });
    if (!confirmed) return;
    await publishThisPage();
  };

  /** Throws this editor's local work away and shows the server's copy. */
  const handleReloadLatest = async () => {
    await reloadLatest();
  };

  /** Re-applies this editor's work ON TOP of the newer version — never over it. */
  const handleKeepMine = keepMine;

  const isSiteLive = configuration.status === 'published';
  const showPublishPage = canPublish && isSiteLive;
  const isBusy = updatePage.isPending || publishPage.isPending;
  const publishConflict = readSaveConflict(publishPage.error);

  return (
    <PageContainer fullWidth>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8">
        <EditingPresenceBanner participants={participants} />

        <PageHeader
          titleKey="website:editor.title"
          title={page.title}
          descriptionKey="website:editor.subtitle"
          breadcrumbs={breadcrumbs}
          actions={
            canManage ? (
              <div className="flex flex-wrap items-center gap-2">
                {page.coreType !== 'courseDetails' ? (
                  <Button asChild variant="secondary">
                    <Link
                      to={buildPath(DASHBOARD_ROUTES.websiteVisualEditor, {
                        academyId,
                        pageId,
                      })}
                      title={t('website:visualEditor.openHint')}
                    >
                      <MousePointerClick
                        className="size-4"
                        strokeWidth={2}
                        aria-hidden
                      />
                      {t('website:visualEditor.open')}
                    </Link>
                  </Button>
                ) : null}
                <Select
                  value={previewLocale}
                  onValueChange={(value) =>
                    setPreviewLocale(value as PublicWebsiteLocale)
                  }
                >
                  <SelectTrigger
                    className="w-32"
                    aria-label={t('website:preview.localeLabel')}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PUBLIC_WEBSITE_LOCALES.map((locale) => (
                      <SelectItem key={locale} value={locale}>
                        {PUBLIC_WEBSITE_LOCALE_LABELS[locale]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={seoDialog.open}
                >
                  <Search className="size-4" strokeWidth={2} aria-hidden />
                  {t('website:editor.seoAction')}
                </Button>
                <Button
                  type="button"
                  variant={showPublishPage ? 'outline' : 'default'}
                  data-testid="website-save-page"
                  onClick={() => void handleSaveDraft()}
                  disabled={!isDirty || isBusy || isBlockedByLimits}
                >
                  {updatePage.isPending && !publishPage.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Save className="size-4" strokeWidth={2} aria-hidden />
                  )}
                  {showPublishPage
                    ? t('website:editor.saveDraft')
                    : t('website:editor.saveChanges')}
                </Button>
                {/* One page goes live without republishing the site — only
                    while the site is live (publishing the site publishes
                    every page anyway). Unsaved edits are saved first, in
                    the same click. */}
                {showPublishPage ? (
                  <Button
                    type="button"
                    data-testid="website-publish-page"
                    onClick={() => void handlePublishPage()}
                    disabled={
                      (!isDirty && !page.hasUnpublishedChanges) ||
                      isBusy ||
                      (isDirty && isBlockedByLimits)
                    }
                  >
                    {publishPage.isPending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <UploadCloud
                        className="size-4"
                        strokeWidth={2}
                        aria-hidden
                      />
                    )}
                    {t('website:editor.publishPageAction')}
                  </Button>
                ) : null}
              </div>
            ) : undefined
          }
        />

        <WebsitePublishBar
          academyId={academyId}
          status={configuration.status}
          lastPublishedAt={configuration.publishedAt}
          unpublishedChanges={configuration.unpublishedChanges}
          pendingLocalEdits={isDirty}
          onBeforePublish={async () =>
            !isDirty || (await saveSections('save')) !== null
          }
        />
        {isSiteLive ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="website-page-publish-state"
          >
            {isDirty
              ? t('website:editor.pageHasLocalChanges')
              : page.hasUnpublishedChanges
                ? t('website:editor.pageHasUnpublishedChanges')
                : t('website:editor.pageUpToDate')}
          </p>
        ) : null}
        {/* A stale publish has the conflict dialog, not a retry strip. */}
        {publishPage.error && !publishConflict ? (
          publishPage.error.messageKey ===
          'errors.website.publishedSlugTaken' ? (
            <ErrorState
              kind="conflict"
              descriptionKey="website:editor.publishedSlugTaken"
              values={{
                title: String(publishPage.error.details?.title ?? ''),
                slug: page.slug,
              }}
            />
          ) : (
            <ErrorState
              kind={publishPage.error.kind}
              onRetry={() => void handlePublishPage()}
            />
          )
        ) : null}
        {/*
          A conflict is NOT an error state — it has its own dialog with real
          choices. Showing the generic retry strip for it would offer
          "retry", which for a stale save means "try to overwrite again".
        */}
        {isBlockedByLimits ? (
          <Alert
            variant="destructive"
            role="status"
            data-testid="website-page-over-limit"
          >
            <AlertTitle>{t('website:editor.pageOverLimitTitle')}</AlertTitle>
            <AlertDescription className="space-y-2 text-foreground">
              <p>
                {t('website:editor.pageOverLimit', {
                  count: needsShorteningIds.size,
                })}
              </p>
              <ul className="flex flex-wrap gap-2">
                {draftSections.map((section, index) =>
                  needsShorteningIds.has(section.id) ? (
                    <li key={section.id}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedId(section.id)}
                      >
                        {t('website:editor.openSectionToShorten', {
                          section: `${index + 1}. ${t(SECTION_METADATA[section.type].labelKey)}`,
                        })}
                      </Button>
                    </li>
                  ) : null
                )}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}
        {updatePage.error &&
        updatePage.error.kind !== 'conflict' &&
        // Over-limit refusals are explained by the notice above.
        !(
          isContentValidationFailure(updatePage.error) &&
          (updatePage.error.violations ?? []).every(isOverLimitIssue)
        ) ? (
          isContentValidationFailure(updatePage.error) ? (
            /*
              The server said exactly which sections it refused, so say so.
              And no Retry: resubmitting the same invalid content fails the
              same way every time, which is a trap rather than an offer —
              the author has to open the named section and fix it.
            */
            <ErrorState
              kind="validation"
              descriptionKey="website:editor.invalidSections"
              values={{
                // `Intl.ListFormat` rather than a hardcoded separator: the
                // comma between list items is not the same character in
                // Arabic, and the conjunction differs too.
                sections: new Intl.ListFormat(i18n.language, {
                  style: 'long',
                  type: 'conjunction',
                }).format(
                  rejectedSections(
                    updatePage.error.violations,
                    draftSections
                  ).map(({ index, type }) =>
                    type
                      ? `${index + 1}. ${t(`website:sections.${type}.label`)}`
                      : String(index + 1)
                  )
                ),
              }}
            />
          ) : (
            <ErrorState
              kind={updatePage.error.kind}
              onRetry={() => void handleSaveDraft()}
            />
          )
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">
                {t('website:editor.compositionTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SectionTree
                sections={draftSections}
                selectedId={selectedId}
                canManage={canManage}
                onSelect={setSelectedId}
                onToggleEnabled={handleToggleEnabled}
                onToggleVisibility={handleToggleVisibility}
                onMove={handleMove}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onAdd={handleAdd}
                needsShorteningIds={needsShorteningIds}
              />
            </CardContent>
          </Card>

          <PreviewViewport
            breakpoint={breakpoint}
            onBreakpointChange={setBreakpoint}
            dir={PUBLIC_WEBSITE_LOCALE_DIRECTION[previewLocale]}
            lang={previewLocale}
          >
            <WebsiteRenderer
              academyId={academyId}
              academyName={academy.name}
              academyLogo={academy.logo}
              configuration={configuration}
              pages={previewPages}
              page={previewPage}
              locale={previewLocale}
              onNavigate={() => undefined}
            />
          </PreviewViewport>
        </div>
      </div>

      <Dialog
        open={!!selectedSection}
        onOpenChange={(open) => !open && setSelectedId(undefined)}
      >
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
          {selectedSection ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {t(SECTION_METADATA[selectedSection.type].labelKey)}
                </DialogTitle>
              </DialogHeader>
              <SectionConfigForm
                type={selectedSection.type}
                academyId={academyId}
                initialConfig={selectedSection.config}
                pages={pages}
                configuration={configuration}
                isSaving={false}
                onSave={handleSaveSectionConfig}
                onCancel={() => setSelectedId(undefined)}
                serverIssues={serverIssuesById[selectedSection.id]}
                renderPagePreview={(config, locale) =>
                  sectionPagePreview(selectedSection.id, config, locale)
                }
                previewSectionId={selectedSection.id}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {canManage ? (
        <WebsitePageSeoDialog
          academyId={academyId}
          academyName={academy.name}
          configuration={configuration}
          page={page}
          open={seoDialog.isOpen}
          onOpenChange={seoDialog.setOpen}
        />
      ) : null}
      {canManage ? (
        <SectionPresetDialog
          type={looksOf}
          source={{
            academyId,
            academyName: academy.name,
            academyLogo: academy.logo,
            configuration,
            pages: previewPages,
            locale: previewLocale,
          }}
          onClose={() => setLooksOf(null)}
          onAdd={addSection}
        />
      ) : null}
      <SaveConflictDialog
        conflict={conflict?.value ?? null}
        canKeepMine={conflict?.canKeepMine ?? true}
        onReload={() => void handleReloadLatest()}
        onKeepMine={handleKeepMine}
        onOpenChange={(open) => {
          if (!open) setConflict(null);
        }}
        isSaving={isBusy}
      />
    </PageContainer>
  );
}
