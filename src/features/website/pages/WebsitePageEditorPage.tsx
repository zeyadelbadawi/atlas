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
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Save, Search, UploadCloud } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { ApiError } from '@api';
import type { BreadcrumbItem, WebsitePage } from '@types';
import {
  usePublishWebsitePage,
  useUpdateWebsitePage,
  useWebsiteConfiguration,
  useWebsitePage,
  useWebsitePages,
} from '../hooks';
import { WebsitePublishBar } from '../components/WebsitePublishBar';
import { SectionTree } from '../components/SectionTree';
import { SectionConfigForm } from '../components/SectionConfigForm';
import { WebsitePageSeoDialog } from '../components/WebsitePageSeoDialog';
import {
  PreviewViewport,
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
  DEFAULT_PUBLIC_WEBSITE_LOCALE,
  PUBLIC_WEBSITE_LOCALES,
  PUBLIC_WEBSITE_LOCALE_DIRECTION,
  PUBLIC_WEBSITE_LOCALE_LABELS,
  type PublicWebsiteLocale,
} from '../constants/locale.constants';
import { SECTION_METADATA, getDefaultSectionConfig } from '../sections';
import { useEditingPresence } from '../hooks/useEditingPresence';
import { EditingPresenceBanner } from '../components/EditingPresenceBanner';
import { SaveConflictDialog } from '../components/SaveConflictDialog';
import {
  readSaveConflict,
  type SaveConflict,
} from '../utils/save-conflict.utils';
import { stableJsonKey } from '../utils/stable-json.utils';
import {
  isContentValidationFailure,
  rejectedSections,
} from '../utils/save-validation.utils';
import { DEFAULT_RESPONSIVE_VISIBILITY } from '@types';
import type {
  ResponsiveVisibility,
  SectionInstance,
  SectionType,
} from '@types';

/** Which action a conflict interrupted, so "keep my changes" can finish it. */
type ConflictIntent = 'save' | 'publish';

interface PendingConflict {
  readonly value: SaveConflict;
  readonly intent: ConflictIntent;
  /** False when there is no local work left to re-apply. */
  readonly canKeepMine: boolean;
}

export default function WebsitePageEditorPage(): JSX.Element {
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
  const updatePage = useUpdateWebsitePage();
  const publishPage = usePublishWebsitePage();
  const canPublish = hasPermission('academy.website.publish');

  const [draftSections, setDraftSections] = useState<SectionInstance[]>([]);
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
  const [previewLocale, setPreviewLocale] = useState<PublicWebsiteLocale>(
    DEFAULT_PUBLIC_WEBSITE_LOCALE
  );
  const [breakpoint, setBreakpoint] = useState<PreviewBreakpoint>('desktop');
  const seoDialog = useDisclosure();

  /*
    CONCURRENT EDITING. Two things, doing different jobs:

    - Presence is advisory and non-blocking. It announces this editor and
      names colleagues with the same page open, so a collision is avoided
      rather than resolved. Only announced when the user can actually
      manage the page — a read-only viewer is not editing.
    - The conflict below is the load-bearing half: the save carries the
      version it was based on, and the server refuses a stale one instead
      of overwriting whoever committed in between.
  */
  const participants = useEditingPresence({
    academyId: academyId ?? '',
    pageId: pageId ?? '',
    enabled: canManage,
  });
  const [conflict, setConflict] = useState<PendingConflict | null>(null);

  /*
    THE DRAFT AND THE SERVER COPY IT WAS STARTED FROM.

    The draft used to be overwritten by every refetch of the page — after
    an SEO save, a site publish, a window refocus — silently discarding
    unsaved edits. Now a refetch only replaces the draft when there is
    nothing local to lose. `baseRef` is the server copy the draft is based
    on: its version is what a save is checked against. When the server
    copy moves under unsaved edits, the version is only moved along if the
    sections did not change (your own SEO save, say); if a colleague
    changed the sections, the draft keeps its old base so the save
    surfaces the conflict instead of overwriting their work.
  */
  const draftRef = useRef<SectionInstance[]>(draftSections);
  const baseRef = useRef<{ version: number; key: string } | null>(null);
  useEffect(() => {
    draftRef.current = draftSections;
  }, [draftSections]);

  const adoptServerPage = useCallback((data: WebsitePage) => {
    const sections = data.sections as SectionInstance[];
    baseRef.current = { version: data.version, key: stableJsonKey(sections) };
    draftRef.current = sections;
    setDraftSections(sections);
  }, []);

  useEffect(() => {
    const data = pageQuery.data;
    if (!data) return;
    const base = baseRef.current;
    if (!base || stableJsonKey(draftRef.current) === base.key) {
      adoptServerPage(data);
    } else if (stableJsonKey(data.sections) === base.key) {
      baseRef.current = { version: data.version, key: base.key };
    }
  }, [pageQuery.data, adoptServerPage]);

  const serverKey = useMemo(
    () => (pageQuery.data ? stableJsonKey(pageQuery.data.sections) : null),
    [pageQuery.data]
  );
  const draftKey = useMemo(() => stableJsonKey(draftSections), [draftSections]);
  const isDirty = serverKey !== null && draftKey !== serverKey;

  // One save or publish at a time, whichever button started it.
  const busyRef = useRef(false);

  /**
   * Saves the draft against the version it was based on. Resolves the
   * saved page, or `null` when the save failed (the error or the conflict
   * dialog is already showing).
   *
   * `overrideVersion` is supplied only by "keep my changes" after a
   * conflict: it re-bases this editor's work on the version the server
   * just reported, so the colleague's committed save is built on rather
   * than erased. It is never a way to skip the check.
   */
  const saveSections = async (
    intent: ConflictIntent,
    overrideVersion?: number
  ): Promise<WebsitePage | null> => {
    if (!academyId || !pageId) return null;
    const sections = draftRef.current;
    const sentKey = stableJsonKey(sections);
    try {
      const saved = await updatePage.mutateAsync({
        academyId,
        pageId,
        payload: {
          sections,
          expectedVersion: overrideVersion ?? baseRef.current?.version,
        },
      });
      setConflict(null);
      if (stableJsonKey(draftRef.current) === sentKey) {
        adoptServerPage(saved);
      } else {
        // Edited again while the save was in flight: keep those edits,
        // based on the version that was just saved.
        baseRef.current = {
          version: saved.version,
          key: stableJsonKey(saved.sections),
        };
      }
      return saved;
    } catch (error) {
      // A 409 that is NOT a stale version (a duplicate slug, say) reads
      // as `null` here and falls through to ordinary error handling —
      // see `readSaveConflict`.
      const stale = readSaveConflict(error as ApiError);
      setConflict(stale ? { value: stale, intent, canKeepMine: true } : null);
      return null;
    }
  };

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
    setDraftSections((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, enabled: !section.enabled } : section
      )
    );

  const handleToggleVisibility = (
    id: string,
    breakpointKey: keyof ResponsiveVisibility
  ) =>
    setDraftSections((prev) =>
      prev.map((section) =>
        section.id === id
          ? {
              ...section,
              visibility: {
                ...section.visibility,
                [breakpointKey]: !section.visibility[breakpointKey],
              },
            }
          : section
      )
    );

  const handleMove = (index: number, direction: -1 | 1) =>
    setDraftSections((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });

  const handleDuplicate = (id: string) =>
    setDraftSections((prev) => {
      const index = prev.findIndex((section) => section.id === id);
      if (index === -1) return prev;
      const clone: SectionInstance = {
        ...prev[index],
        id: crypto.randomUUID(),
      };
      const next = [...prev];
      next.splice(index + 1, 0, clone);
      return next;
    });

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      titleKey: 'website:editor.deleteConfirmTitle',
      descriptionKey: 'website:editor.deleteConfirmDescription',
      confirmLabelKey: 'website:editor.deleteSection',
      intent: 'destructive',
    });
    if (!confirmed) return;
    setDraftSections((prev) => prev.filter((section) => section.id !== id));
  };

  const handleAdd = (type: SectionType) => {
    const instance = {
      id: crypto.randomUUID(),
      type,
      enabled: true,
      visibility: DEFAULT_RESPONSIVE_VISIBILITY,
      config: getDefaultSectionConfig(type),
    } as SectionInstance;
    setDraftSections((prev) => [...prev, instance]);
    setSelectedId(instance.id);
  };

  const handleSaveSectionConfig = (config: SectionInstance['config']) => {
    setDraftSections((prev) =>
      prev.map((section) =>
        section.id === selectedId
          ? ({ ...section, config } as SectionInstance)
          : section
      )
    );
    setSelectedId(undefined);
  };

  const handleSaveDraft = async (overrideVersion?: number) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await saveSections('save', overrideVersion);
    } finally {
      busyRef.current = false;
    }
  };

  /**
   * Saves (when there is anything to save), then publishes THIS page,
   * pinned to the version just saved — or, with nothing to save, to the
   * version on screen. If anyone saved the page in between, the publish is
   * refused and the conflict dialog says who; nothing unseen goes live.
   */
  const publishThisPage = async (overrideVersion?: number) => {
    if (!academyId || !pageId || busyRef.current) return;
    busyRef.current = true;
    try {
      let version = baseRef.current?.version;
      if (isDirty || overrideVersion !== undefined) {
        const saved = await saveSections('publish', overrideVersion);
        if (!saved) return;
        version = saved.version;
      }
      try {
        await publishPage.mutateAsync({
          academyId,
          pageId,
          expectedVersion: version,
        });
      } catch (error) {
        const stale = readSaveConflict(error as ApiError);
        // A colleague's save landed after the copy being published: there
        // is nothing of this editor's left to re-apply, so the only
        // honest choice is to look at their version first.
        if (stale)
          setConflict({ value: stale, intent: 'publish', canKeepMine: false });
      }
    } finally {
      busyRef.current = false;
    }
  };

  const handlePublishPage = async () => {
    if (busyRef.current) return;
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
    setConflict(null);
    const refreshed = await pageQuery.refetch();
    if (refreshed.data) adoptServerPage(refreshed.data);
  };

  /** Re-applies this editor's work ON TOP of the newer version — never over it. */
  const handleKeepMine = () => {
    if (!conflict?.canKeepMine) return;
    const { value, intent } = conflict;
    setConflict(null);
    if (intent === 'publish') void publishThisPage(value.currentVersion);
    else void handleSaveDraft(value.currentVersion);
  };

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
              <div className="flex items-center gap-2">
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
                  disabled={!isDirty || isBusy}
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
                      (!isDirty && !page.hasUnpublishedChanges) || isBusy
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
        {updatePage.error && updatePage.error.kind !== 'conflict' ? (
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
              pages={pages}
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
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
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
