/**
 * Website Page Editor Page.
 *
 * EditorShell for one page: `SectionTree` (composition) + a Section
 * Editor dialog (`SectionConfigForm`) + `PreviewViewport` (the real
 * `WebsiteRenderer`, desktop/tablet/mobile). All composition changes
 * (add/remove/hide/reorder/edit/duplicate) are held in local draft state
 * and persisted together via one "Save changes" action — the draft is
 * never auto-saved, and nothing is sent to the backend until the Tenant
 * Owner explicitly confirms (see `Reports/ARCHITECTURE.md`, Prompt 9,
 * "Draft / Publish Model").
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Loader2, Save, Search } from 'lucide-react';
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
import {
  useUpdateWebsitePage,
  useWebsiteConfiguration,
  useWebsitePage,
  useWebsitePages,
} from '../hooks';
import { WebsitePublishBar } from '../components/WebsitePublishBar';
import { SectionTree } from '../components/SectionTree';
import { SectionConfigForm } from '../components/SectionConfigForm';
import { WebsitePageSeoDialog } from '../components/WebsitePageSeoDialog';
import { PreviewViewport, type PreviewBreakpoint } from '../components/PreviewViewport';
import { WebsiteRenderer } from '../renderer';
import { SECTION_METADATA, getDefaultSectionConfig } from '../sections';
import { DEFAULT_RESPONSIVE_VISIBILITY } from '@types';
import type { ResponsiveVisibility, SectionInstance, SectionType } from '@types';

export default function WebsitePageEditorPage(): JSX.Element {
  const { t } = useTranslation();
  const { academyId, pageId } = useParams<{ academyId: string; pageId: string }>();
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

  const [draftSections, setDraftSections] = useState<SectionInstance[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [breakpoint, setBreakpoint] = useState<PreviewBreakpoint>('desktop');
  const seoDialog = useDisclosure();

  useEffect(() => {
    if (pageQuery.data) setDraftSections(pageQuery.data.sections as SectionInstance[]);
  }, [pageQuery.data]);

  const isDirty =
    !!pageQuery.data &&
    JSON.stringify(draftSections) !== JSON.stringify(pageQuery.data.sections);

  useUnsavedChanges({ isDirty, messageKey: 'website:editor.unsavedChanges' });

  const isLoading =
    academyQuery.isLoading || configQuery.isLoading || pagesQuery.isLoading || pageQuery.isLoading;
  const error = academyQuery.error ?? configQuery.error ?? pagesQuery.error ?? pageQuery.error;

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
  const selectedSection = draftSections.find((section) => section.id === selectedId);
  const previewPage = { ...page, sections: draftSections };

  const handleToggleEnabled = (id: string) =>
    setDraftSections((prev) =>
      prev.map((section) => (section.id === id ? { ...section, enabled: !section.enabled } : section))
    );

  const handleToggleVisibility = (id: string, breakpointKey: keyof ResponsiveVisibility) =>
    setDraftSections((prev) =>
      prev.map((section) =>
        section.id === id
          ? { ...section, visibility: { ...section.visibility, [breakpointKey]: !section.visibility[breakpointKey] } }
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
      const clone: SectionInstance = { ...prev[index], id: crypto.randomUUID() };
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
      prev.map((section) => (section.id === selectedId ? ({ ...section, config } as SectionInstance) : section))
    );
    setSelectedId(undefined);
  };

  const handleSaveChanges = () => {
    updatePage.mutate({ academyId, pageId, payload: { sections: draftSections } });
  };

  return (
    <PageContainer fullWidth>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8">
        <PageHeader
          titleKey="website:editor.title"
          title={page.title}
          descriptionKey="website:editor.subtitle"
          actions={
            canManage ? (
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={seoDialog.open}>
                  <Search className="size-4" strokeWidth={2} aria-hidden />
                  {t('website:editor.seoAction')}
                </Button>
                <Button type="button" onClick={handleSaveChanges} disabled={!isDirty || updatePage.isPending}>
                  {updatePage.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Save className="size-4" strokeWidth={2} aria-hidden />
                  )}
                  {t('website:editor.saveChanges')}
                </Button>
              </div>
            ) : undefined
          }
        />

        <WebsitePublishBar academyId={academyId} status={configuration.status} />
        {updatePage.error ? <ErrorState onRetry={handleSaveChanges} /> : null}

        <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">{t('website:editor.compositionTitle')}</CardTitle>
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

          <PreviewViewport breakpoint={breakpoint} onBreakpointChange={setBreakpoint}>
            <WebsiteRenderer
              academyId={academyId}
              academyName={academy.name}
              academyLogo={academy.logo}
              configuration={configuration}
              pages={pages}
              page={previewPage}
              onNavigate={() => undefined}
            />
          </PreviewViewport>
        </div>
      </div>

      <Dialog open={!!selectedSection} onOpenChange={(open) => !open && setSelectedId(undefined)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          {selectedSection ? (
            <>
              <DialogHeader>
                <DialogTitle>{t(SECTION_METADATA[selectedSection.type].labelKey)}</DialogTitle>
              </DialogHeader>
              <SectionConfigForm
                type={selectedSection.type}
                academyId={academyId}
                initialConfig={selectedSection.config}
                pages={pages}
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
    </PageContainer>
  );
}
