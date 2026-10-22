/**
 * The visual editor (المحرر المرئي) — one page of an Academy's website,
 * edited on the page itself.
 *
 * Full screen, without the dashboard's navigation (`DashboardLayout` hands
 * this route the whole window). On a wide screen, three panes: the page's
 * sections (`StructurePanel`), the page itself on a real device
 * (`PreviewViewport`, the same frame and renderer as every preview), and
 * the selected section's settings (`SettingsPanel`). On a phone, the page
 * fills the screen, the sections list opens over it, and the selected
 * section's settings sit in a panel under it — the page stays in view.
 *
 * WHAT IT GUARANTEES, the same as the page editor (both use
 * `usePageDraft`): edits are a draft until published; a save is checked
 * against the version it was based on, so a colleague's work is never
 * overwritten (the conflict dialog says who and offers the choices); text
 * over a content limit holds saving back and says where.
 *
 * WHAT IT ADDS:
 * - Click a section on the page to select it; pick one in the list and the
 *   page scrolls to it. Every change shows on the page as it is typed.
 * - It saves by itself, a moment after the last change, once every section
 *   is valid (a half-typed one would be refused, and the whole page with
 *   it). The bar always says where things stand: saving, saved, a section
 *   needing attention, or a failed save with a way to retry.
 * - Undo / redo (Ctrl+Z, Ctrl+Shift+Z or Ctrl+Y), typing in one section
 *   counting as one step.
 * - Add a section anywhere, from a library that says what each one is for.
 * - Publish is still a separate, confirmed step: nothing reaches visitors
 *   because it was saved.
 * - "Site" opens the whole website's settings in the same pane
 *   (`SiteSettingsPanel`): theme, menu, header, footer, this page's
 *   search-engine text, and publishing the website.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CloudOff,
  Layers,
  Palette,
  Loader2,
  PanelBottomClose,
  PanelBottomOpen,
  Plus,
  Redo2,
  Undo2,
  UploadCloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ErrorState } from '@components/feedback';
import { useConfirmDialog } from '@app/providers';
import { useMediaQuery, usePermissions, useUnsavedChanges } from '@hooks';
import { useAcademy } from '@features/academy';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { cn } from '@utils';
import type {
  ResponsiveVisibility,
  SectionInstance,
  SectionType,
} from '@types';
import {
  useWebsiteConfiguration,
  useWebsitePage,
  useWebsitePages,
} from '../hooks';
import { usePageDraft } from '../hooks/usePageDraft';
import { useEditingPresence } from '../hooks/useEditingPresence';
import { EditingPresenceBanner } from '../components/EditingPresenceBanner';
import { SaveConflictDialog } from '../components/SaveConflictDialog';
import { WebsiteContentLocaleProvider } from '../components/website-content-locale';
import {
  PreviewViewport,
  initialPreviewBreakpoint,
  type PreviewBreakpoint,
} from '../components/PreviewViewport';
import { WebsiteRenderer } from '../renderer';
import {
  PUBLIC_WEBSITE_LOCALES,
  PUBLIC_WEBSITE_LOCALE_DIRECTION,
  PUBLIC_WEBSITE_LOCALE_LABELS,
  resolveDefaultLocale,
  type PublicWebsiteLocale,
} from '../constants/locale.constants';
import { SECTION_METADATA } from '../sections/section-metadata.registry';
import { readSaveConflict } from '../utils/save-conflict.utils';
import { stableJsonKey } from '../utils/stable-json.utils';
import {
  duplicateSection,
  insertSection,
  moveSection,
  moveSectionTo,
  removeSection,
  replaceSectionConfig,
  toggleSectionEnabled,
  toggleSectionVisibility,
} from '../utils/section-list.utils';
import { useEditHistory } from './useEditHistory';
import { invalidSectionIds, parsedSections } from './section-validation';
import { StructurePanel } from './StructurePanel';
import { SettingsPanel } from './SettingsPanel';
import { SectionLibrary } from './SectionLibrary';
import { SiteSettingsPanel } from './SiteSettingsPanel';

/** How long after the last change the draft is saved. */
export const AUTOSAVE_DELAY_MS = 1500;

/** Wide screens get the three panes; below this, the phone layout. */
const WIDE_QUERY = '(min-width: 1024px)';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Typing in a text field undoes there, not in the page. */
function isTextInput(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return (
    element.isContentEditable ||
    element.tagName === 'TEXTAREA' ||
    (element.tagName === 'INPUT' &&
      !['checkbox', 'radio', 'button', 'submit'].includes(
        (element as HTMLInputElement).type
      ))
  );
}

export default function VisualEditorPage(): JSX.Element {
  const { academyId } = useParams<{ academyId: string }>();
  const configQuery = useWebsiteConfiguration(academyId ?? '');
  return (
    <WebsiteContentLocaleProvider
      value={resolveDefaultLocale(configQuery.data?.defaultLocale)}
    >
      <VisualEditor />
    </WebsiteContentLocaleProvider>
  );
}

function VisualEditor(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { academyId, pageId } = useParams<{
    academyId: string;
    pageId: string;
  }>();
  const [searchParams] = useSearchParams();
  const { confirm } = useConfirmDialog();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('academy.website.manage');
  const canPublish = hasPermission('academy.website.publish');
  const isWide = useMediaQuery(WIDE_QUERY);

  const academyQuery = useAcademy(academyId ?? '');
  const configQuery = useWebsiteConfiguration(academyId ?? '');
  const pagesQuery = useWebsitePages(academyId ?? '', {
    query: { pagination: { page: 1, pageSize: 50 } },
  });
  const pageQuery = useWebsitePage(academyId ?? '', pageId ?? '');
  const requiredLocale = resolveDefaultLocale(configQuery.data?.defaultLocale);

  const prepareSections = useCallback(
    (sections: readonly SectionInstance[]) =>
      parsedSections(sections, requiredLocale),
    [requiredLocale]
  );
  const draft = usePageDraft({
    academyId,
    pageId,
    page: pageQuery.data,
    refetchPage: pageQuery.refetch,
    prepareSections,
  });
  const {
    draftSections,
    setDraftSections,
    isDirty,
    conflict,
    setConflict,
    needsShorteningIds,
    isBlockedByLimits,
    serverIssuesById,
    clearServerIssues,
  } = draft;
  const history = useEditHistory(draftSections, setDraftSections);

  const participants = useEditingPresence({
    academyId: academyId ?? '',
    pageId: pageId ?? '',
    enabled: canManage,
  });

  // Selection. Picking in the list (or adding) scrolls the page to the
  // section; clicking it on the page does not — it is already in view.
  const [selectedId, setSelectedId] = useState<string | undefined>(
    () => searchParams.get('section') ?? undefined
  );
  const [focus, setFocus] = useState<{ id?: string; request: number }>(() => ({
    id: searchParams.get('section') ?? undefined,
    request: 0,
  }));
  // The whole website's settings, in the settings pane instead of a
  // section's (`SiteSettingsPanel`).
  const [siteOpen, setSiteOpen] = useState(false);
  const selectAndReveal = useCallback((id: string) => {
    setSiteOpen(false);
    setSelectedId(id);
    setFocus((previous) => ({ id, request: previous.request + 1 }));
  }, []);

  const [chosenLocale, setChosenLocale] = useState<PublicWebsiteLocale | null>(
    null
  );
  const [breakpoint, setBreakpoint] = useState<PreviewBreakpoint>(
    initialPreviewBreakpoint
  );
  const [library, setLibrary] = useState<{ open: boolean; at: number }>({
    open: false,
    at: 0,
  });
  const [structureOpen, setStructureOpen] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const labelOf = useCallback(
    (section: SectionInstance) => t(SECTION_METADATA[section.type].labelKey),
    [t]
  );

  // ----- Autosave --------------------------------------------------------
  const invalidIds = useMemo(
    () => invalidSectionIds(draftSections, requiredLocale),
    [draftSections, requiredLocale]
  );
  const attentionIds = useMemo(
    () => new Set([...invalidIds, ...needsShorteningIds]),
    [invalidIds, needsShorteningIds]
  );
  const draftKey = useMemo(() => stableJsonKey(draftSections), [draftSections]);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [retryTick, setRetryTick] = useState(0);
  const saveDraftRef = useRef(draft.saveDraft);
  saveDraftRef.current = draft.saveDraft;
  const isWorkingRef = useRef(draft.isWorking);
  isWorkingRef.current = draft.isWorking;

  const canAutosave =
    canManage && isDirty && attentionIds.size === 0 && !conflict;
  useEffect(() => {
    if (!canAutosave) return undefined;
    const timer = window.setTimeout(async () => {
      // A publish (which saves first) is under way: look again shortly.
      if (isWorkingRef.current()) {
        setRetryTick((n) => n + 1);
        return;
      }
      setSaveState('saving');
      const saved = await saveDraftRef.current();
      setSaveState(saved ? 'saved' : 'error');
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [canAutosave, draftKey, retryTick]);

  useUnsavedChanges({
    isDirty,
    onSave: canManage
      ? async () => (await draft.saveSections('save')) !== null
      : undefined,
  });

  // ----- Edits (each one an undo step) ----------------------------------
  const record = history.record;
  const announce = (message: string) => setAnnouncement(message);

  const handleConfigChange = (
    id: string,
    config: SectionInstance['config']
  ) => {
    clearServerIssues(id);
    record(replaceSectionConfig(draftSections, id, config), `config:${id}`);
  };
  const handleToggleEnabled = (id: string) =>
    record(toggleSectionEnabled(draftSections, id));
  const handleToggleVisibility = (
    id: string,
    key: keyof ResponsiveVisibility
  ) => record(toggleSectionVisibility(draftSections, id, key));
  const handleMove = (index: number, direction: -1 | 1) => {
    const section = draftSections[index];
    const next = moveSection(draftSections, index, direction);
    record(next);
    if (section) {
      announce(
        t('website:visualEditor.announce.moved', {
          section: labelOf(section),
          position: index + direction + 1,
        })
      );
      selectAndReveal(section.id);
    }
  };
  const handleReorder = (from: number, to: number) => {
    const section = draftSections[from];
    record(moveSectionTo(draftSections, from, to));
    if (section) selectAndReveal(section.id);
  };
  const handleDuplicate = (id: string) => {
    const result = duplicateSection(draftSections, id);
    record(result.sections);
    if (result.id) selectAndReveal(result.id);
  };
  const handleDelete = async (id: string) => {
    const section = draftSections.find((candidate) => candidate.id === id);
    const confirmed = await confirm({
      titleKey: 'website:editor.deleteConfirmTitle',
      descriptionKey: 'website:editor.deleteConfirmDescription',
      confirmLabelKey: 'website:editor.deleteSection',
      intent: 'destructive',
    });
    if (!confirmed) return;
    record(removeSection(draftSections, id));
    if (selectedId === id) setSelectedId(undefined);
    if (section) {
      announce(
        t('website:visualEditor.announce.deleted', {
          section: labelOf(section),
        })
      );
    }
  };
  const handleAdd = (type: SectionType) => {
    const result = insertSection(draftSections, type, library.at);
    record(result.sections);
    setLibrary({ open: false, at: 0 });
    setStructureOpen(false);
    selectAndReveal(result.id);
    announce(
      t('website:visualEditor.announce.added', {
        section: t(SECTION_METADATA[type].labelKey),
      })
    );
  };
  const openLibrary = (at: number) => setLibrary({ open: true, at });

  // ----- Keyboard -------------------------------------------------------
  const undo = history.undo;
  const redo = history.redo;
  useEffect(() => {
    if (!canManage) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (isTextInput(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canManage, undo, redo]);

  // ----- Publish --------------------------------------------------------
  const handlePublish = async () => {
    if (draft.isWorking()) return;
    const confirmed = await confirm({
      titleKey: 'website:editor.publishPageConfirmTitle',
      descriptionKey: 'website:editor.publishPageConfirmDescription',
      confirmLabelKey: 'website:editor.publishPageAction',
    });
    if (!confirmed) return;
    setSaveState('saving');
    // The outcome itself: `draft` is this render's, so its mutation state
    // is from before the publish started.
    const published = await draft.publishThisPage();
    setSaveState(published ? 'saved' : 'error');
  };

  const handleReload = async () => {
    await draft.reloadLatest();
    history.reset();
    setSaveState('idle');
  };

  // ----- Render ---------------------------------------------------------
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

  if (isLoading) {
    return (
      <div className="flex h-dvh flex-col bg-background" aria-busy="true">
        <div className="flex h-14 items-center gap-3 border-b border-border px-3">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex min-h-0 flex-1 gap-3 p-3">
          <Skeleton className="hidden w-72 lg:block" />
          <Skeleton className="flex-1" />
          <Skeleton className="hidden w-96 lg:block" />
        </div>
      </div>
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
      <div className="flex h-dvh items-center justify-center bg-background p-6">
        <ErrorState
          onRetry={() => {
            void academyQuery.refetch();
            void configQuery.refetch();
            void pagesQuery.refetch();
            void pageQuery.refetch();
          }}
        />
      </div>
    );
  }

  const academy = academyQuery.data;
  const configuration = configQuery.data;
  const pages = pagesQuery.data.items;
  const page = pageQuery.data;
  const previewLocale = chosenLocale ?? requiredLocale;
  const previewPages = pages.filter((candidate) => candidate.visible);
  const selectedIndex = draftSections.findIndex(
    (section) => section.id === selectedId
  );
  const selected =
    selectedIndex >= 0 ? draftSections[selectedIndex] : undefined;
  const isSiteLive = configuration.status === 'published';
  const publishConflict = readSaveConflict(draft.publishPage.error);
  const pagesPath = buildPath(DASHBOARD_ROUTES.websitePages, { academyId });
  const classicPath = buildPath(DASHBOARD_ROUTES.websitePageEditor, {
    academyId,
    pageId,
  });

  const structure = (
    <StructurePanel
      sections={draftSections}
      selectedId={selectedId}
      canManage={canManage}
      attentionIds={attentionIds}
      onSelect={(id) => {
        selectAndReveal(id);
        setStructureOpen(false);
      }}
      onReorder={handleReorder}
      onMove={handleMove}
      onDuplicate={handleDuplicate}
      onToggleEnabled={handleToggleEnabled}
      onDelete={(id) => void handleDelete(id)}
      onAddAt={openLibrary}
    />
  );

  const settings = (
    <SettingsPanel
      academyId={academyId}
      section={selected}
      index={selectedIndex}
      total={draftSections.length}
      pages={pages}
      configuration={configuration}
      canManage={canManage}
      revision={history.revision}
      serverIssues={selected ? serverIssuesById[selected.id] : undefined}
      onConfigChange={(config) =>
        selected && handleConfigChange(selected.id, config)
      }
      onToggleVisibility={(key) =>
        selected && handleToggleVisibility(selected.id, key)
      }
      onToggleEnabled={() => selected && handleToggleEnabled(selected.id)}
      onMove={(direction) => handleMove(selectedIndex, direction)}
      onDuplicate={() => selected && handleDuplicate(selected.id)}
      onDelete={() => selected && void handleDelete(selected.id)}
      onClose={() => setSelectedId(undefined)}
    />
  );

  const siteSettings = (
    <SiteSettingsPanel
      academyId={academyId}
      academyName={academy.name}
      academyLogo={academy.logo}
      configuration={configuration}
      pages={pages}
      page={page}
      canManage={canManage}
      pendingLocalEdits={isDirty}
      onBeforePublish={async () =>
        !isDirty || (await draft.saveSections('save')) !== null
      }
      onClose={() => setSiteOpen(false)}
    />
  );
  const sidePanel = siteOpen ? siteSettings : settings;
  const toggleSite = () => {
    setSelectedId(undefined);
    setSiteOpen((open) => !open);
  };

  const canvas = (
    <PreviewViewport
      breakpoint={breakpoint}
      onBreakpointChange={setBreakpoint}
      dir={PUBLIC_WEBSITE_LOCALE_DIRECTION[previewLocale]}
      lang={previewLocale}
      focusSectionId={focus.id}
      focusRequest={focus.request}
      selectedSectionId={selectedId}
      onSectionSelect={(id) => {
        setSiteOpen(false);
        setSelectedId(id);
        const section = draftSections.find((candidate) => candidate.id === id);
        if (section) {
          announce(
            t('website:visualEditor.announce.selected', {
              section: labelOf(section),
            })
          );
        }
      }}
      fill
      toolbarEnd={
        <Select
          value={previewLocale}
          onValueChange={(value) =>
            setChosenLocale(value as PublicWebsiteLocale)
          }
        >
          <SelectTrigger
            className="h-9 w-auto gap-1 border-0 bg-transparent px-2 shadow-none"
            aria-label={t('website:visualEditor.languageLabel')}
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
      }
    >
      <WebsiteRenderer
        academyId={academyId}
        academyName={academy.name}
        academyLogo={academy.logo}
        configuration={configuration}
        pages={previewPages}
        page={{ ...page, sections: draftSections }}
        locale={previewLocale}
        onNavigate={() => undefined}
      />
    </PreviewViewport>
  );

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-background"
      data-testid="visual-editor"
    >
      {/* ---- Top bar ---- */}
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-border px-2 sm:gap-2 sm:px-3">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-10 shrink-0"
          aria-label={t('website:visualEditor.backToPages')}
          title={t('website:visualEditor.backToPages')}
        >
          <Link to={pagesPath}>
            <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />
          </Link>
        </Button>
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden whitespace-nowrap text-sm font-semibold text-foreground md:inline">
            {t('website:visualEditor.title')}
          </span>
          <span className="hidden h-5 w-px bg-border md:block" aria-hidden />
          <Select
            value={pageId}
            onValueChange={(value) =>
              navigate(
                buildPath(DASHBOARD_ROUTES.websiteVisualEditor, {
                  academyId,
                  pageId: value,
                })
              )
            }
          >
            <SelectTrigger
              className="h-9 min-w-0 max-w-[10rem] sm:max-w-[14rem]"
              aria-label={t('website:visualEditor.pageLabel')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pages.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  {candidate.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ms-auto flex items-center gap-1 sm:gap-2">
          <SaveStatus
            state={saveState}
            canManage={canManage}
            isDirty={isDirty}
            invalidCount={invalidIds.size}
            tooLong={isBlockedByLimits}
            onRetry={() => {
              setSaveState('saving');
              void draft
                .saveDraft()
                .then((saved) => setSaveState(saved ? 'saved' : 'error'));
            }}
          />
          {canManage ? (
            <div className="flex items-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10"
                onClick={undo}
                disabled={!history.canUndo}
                aria-label={t('website:visualEditor.actions.undo')}
                title={`${t('website:visualEditor.actions.undo')} (Ctrl+Z)`}
              >
                <Undo2 className="size-4 rtl:-scale-x-100" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10"
                onClick={redo}
                disabled={!history.canRedo}
                aria-label={t('website:visualEditor.actions.redo')}
                title={`${t('website:visualEditor.actions.redo')} (Ctrl+Shift+Z)`}
              >
                <Redo2 className="size-4 rtl:-scale-x-100" aria-hidden />
              </Button>
            </div>
          ) : null}
          <Button
            type="button"
            variant={siteOpen ? 'secondary' : 'ghost'}
            size="sm"
            className="h-9"
            onClick={toggleSite}
            aria-pressed={siteOpen}
            title={t('website:visualEditor.site.buttonHint')}
            data-testid="visual-editor-site"
          >
            <Palette className="size-4" aria-hidden />
            <span className="hidden md:inline">
              {t('website:visualEditor.site.button')}
            </span>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden xl:inline-flex"
          >
            <Link to={classicPath}>
              {t('website:visualEditor.classicEditor')}
            </Link>
          </Button>
          {canPublish ? (
            <Button
              type="button"
              size="sm"
              className="h-9"
              data-testid="visual-editor-publish"
              onClick={() => void handlePublish()}
              disabled={
                !isSiteLive ||
                (!isDirty && !page.hasUnpublishedChanges) ||
                attentionIds.size > 0 ||
                draft.publishPage.isPending
              }
              title={
                !isSiteLive
                  ? t('website:visualEditor.publish.siteNotLive')
                  : !isDirty && !page.hasUnpublishedChanges
                    ? t('website:visualEditor.publish.upToDate')
                    : undefined
              }
            >
              {draft.publishPage.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <UploadCloud className="size-4" aria-hidden />
              )}
              <span className="hidden sm:inline">
                {t('website:visualEditor.publish.button')}
              </span>
            </Button>
          ) : null}
        </div>
      </header>

      {participants.length > 0 ? (
        <div className="shrink-0 border-b border-border px-3 py-2">
          <EditingPresenceBanner participants={participants} />
        </div>
      ) : null}
      {draft.publishPage.error && !publishConflict ? (
        <div className="shrink-0 border-b border-border px-3 py-2">
          <ErrorState
            kind={draft.publishPage.error.kind}
            onRetry={() => void handlePublish()}
          />
        </div>
      ) : null}

      {/* ---- Workspace ---- */}
      {isWide ? (
        <div className="flex min-h-0 flex-1">
          <aside
            className="flex w-72 shrink-0 flex-col border-e border-border"
            aria-label={t('website:visualEditor.structure.title')}
          >
            <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
              <h2 className="text-sm font-semibold text-foreground">
                {t('website:visualEditor.structure.title')}
              </h2>
              {canManage ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openLibrary(draftSections.length)}
                >
                  <Plus className="size-4" aria-hidden />
                  {t('website:visualEditor.add.button')}
                </Button>
              ) : null}
            </div>
            <p className="px-4 pb-2 text-xs text-muted-foreground">
              {t('website:visualEditor.structure.hint')}
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
              {structure}
            </div>
          </aside>
          <main
            className="min-w-0 flex-1 bg-muted/30 p-3"
            aria-label={t('website:visualEditor.canvasLabel')}
          >
            {canvas}
          </main>
          <aside
            className="flex w-[22rem] shrink-0 flex-col border-s border-border xl:w-96"
            aria-label={
              siteOpen
                ? t('website:visualEditor.site.title')
                : t('website:visualEditor.settings.content')
            }
          >
            {sidePanel}
          </aside>
        </div>
      ) : (
        <>
          <main
            className="min-h-0 flex-1 bg-muted/30 p-2"
            aria-label={t('website:visualEditor.canvasLabel')}
          >
            {canvas}
          </main>
          {selected || siteOpen ? (
            <section
              className={cn(
                'flex shrink-0 flex-col border-t border-border bg-background shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.25)] transition-[height] duration-200 motion-reduce:transition-none',
                panelExpanded ? 'h-[80dvh]' : 'h-[48dvh]'
              )}
              aria-label={t('website:visualEditor.settings.content')}
              data-testid="mobile-settings"
            >
              <button
                type="button"
                onClick={() => setPanelExpanded((value) => !value)}
                className="flex h-8 w-full shrink-0 items-center justify-center text-muted-foreground"
                aria-label={
                  panelExpanded
                    ? t('website:visualEditor.settings.collapse')
                    : t('website:visualEditor.settings.expand')
                }
                aria-expanded={panelExpanded}
              >
                {panelExpanded ? (
                  <PanelBottomClose className="size-4" aria-hidden />
                ) : (
                  <PanelBottomOpen className="size-4" aria-hidden />
                )}
              </button>
              <div className="min-h-0 flex-1">{sidePanel}</div>
            </section>
          ) : (
            <nav
              className="grid shrink-0 auto-cols-fr grid-flow-col gap-2 border-t border-border bg-background p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
              aria-label={t('website:visualEditor.title')}
            >
              <Button
                type="button"
                variant="outline"
                className="h-12"
                onClick={() => setStructureOpen(true)}
              >
                <Layers className="size-5" aria-hidden />
                {t('website:visualEditor.structure.title')}
              </Button>
              {canManage ? (
                <Button
                  type="button"
                  className="h-12"
                  onClick={() => openLibrary(draftSections.length)}
                >
                  <Plus className="size-5" aria-hidden />
                  {t('website:visualEditor.add.button')}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="h-12"
                onClick={toggleSite}
              >
                <Palette className="size-5" aria-hidden />
                {t('website:visualEditor.site.button')}
              </Button>
            </nav>
          )}
          <Sheet open={structureOpen} onOpenChange={setStructureOpen}>
            <SheetContent
              side="bottom"
              className="max-h-[85dvh] overflow-y-auto"
            >
              <SheetHeader className="text-start">
                <SheetTitle>
                  {t('website:visualEditor.structure.title')}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-3">{structure}</div>
            </SheetContent>
          </Sheet>
        </>
      )}

      <SectionLibrary
        open={library.open}
        onOpenChange={(open) => setLibrary((value) => ({ ...value, open }))}
        onPick={handleAdd}
      />
      <SaveConflictDialog
        conflict={conflict?.value ?? null}
        canKeepMine={conflict?.canKeepMine ?? true}
        onReload={() => void handleReload()}
        onKeepMine={draft.keepMine}
        onOpenChange={(open) => {
          if (!open) setConflict(null);
        }}
        isSaving={draft.updatePage.isPending || draft.publishPage.isPending}
      />
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

/**
 * Where the draft stands, in one place: saving, saved, waiting for the
 * author (a section to fix, text to shorten), or a failed save with a
 * retry. One polite live region, so a screen reader hears it change.
 */
function SaveStatus({
  state,
  canManage,
  isDirty,
  invalidCount,
  tooLong,
  onRetry,
}: {
  readonly state: SaveState;
  readonly canManage: boolean;
  readonly isDirty: boolean;
  readonly invalidCount: number;
  readonly tooLong: boolean;
  readonly onRetry: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  let tone: 'muted' | 'ok' | 'warn' | 'error' = 'muted';
  let icon: JSX.Element | null = null;
  let text: string;
  if (!canManage) {
    text = t('website:visualEditor.status.readOnly');
  } else if (tooLong && isDirty) {
    tone = 'warn';
    icon = <AlertCircle className="size-4" aria-hidden />;
    text = t('website:visualEditor.status.tooLong');
  } else if (invalidCount > 0 && isDirty) {
    tone = 'warn';
    icon = <AlertCircle className="size-4" aria-hidden />;
    text = t('website:visualEditor.status.invalid', { count: invalidCount });
  } else if (state === 'saving') {
    icon = <Loader2 className="size-4 animate-spin" aria-hidden />;
    text = t('website:visualEditor.status.saving');
  } else if (state === 'error' && isDirty) {
    tone = 'error';
    icon = <CloudOff className="size-4" aria-hidden />;
    text = t('website:visualEditor.status.error');
  } else if (isDirty) {
    text = t('website:visualEditor.status.pending');
  } else {
    tone = 'ok';
    icon = <Check className="size-4" aria-hidden />;
    text = t('website:visualEditor.status.saved');
  }
  return (
    <div className="flex min-w-0 items-center gap-1" data-testid="save-status">
      <span
        role="status"
        aria-live="polite"
        title={text}
        className={cn(
          'flex min-w-0 items-center gap-1.5 text-xs',
          tone === 'muted' && 'text-muted-foreground',
          tone === 'ok' && 'text-emerald-700 dark:text-emerald-400',
          tone === 'warn' && 'text-amber-700 dark:text-amber-400',
          tone === 'error' && 'text-destructive'
        )}
        data-state={tone}
      >
        {icon}
        <span className="hidden max-w-[16rem] truncate md:inline">{text}</span>
        <span className="sr-only md:hidden">{text}</span>
      </span>
      {canManage && state === 'error' && isDirty ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-1 text-xs"
          onClick={onRetry}
        >
          {t('website:visualEditor.status.retry')}
        </Button>
      ) : null}
    </div>
  );
}
