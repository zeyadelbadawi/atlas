/**
 * CMS phase 4 — a page's history (سجل النسخ), opened from both editors.
 *
 * The kept versions of the page, newest first: each says what it is
 * (Published / Auto-saved draft / Before restore), who and when — "3 hours
 * ago" with the exact date and time beside it, in the dashboard's
 * language. Choosing one previews it read-only in the same device frame
 * and renderer as every preview. "Restore to draft" asks first and says
 * exactly what happens: the draft is replaced (never the live site), and
 * the current draft is kept in this list as "Before restore", so a restore
 * can itself be undone.
 *
 * Edits on screen that are not saved yet are saved first (so they are the
 * draft that is kept), or — when they cannot be saved (a section needing
 * attention) — the confirmation says they will be discarded.
 *
 * A refused restore is explained, never retried blindly: a stale page is
 * refreshed and said so; a copy that no longer passes today's rules names
 * the parts that fail and offers nothing destructive; an address now taken
 * or reserved says so; a pruned version refreshes the list.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  History,
  Loader2,
  RotateCcw,
  Save,
  UploadCloud,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ErrorState } from '@components/feedback';
import { useDateFormatter } from '@hooks';
import { cn, formatRelativeTime } from '@utils';
import type { ApiError } from '@api';
import type {
  LanguageCode,
  WebsiteConfiguration,
  WebsitePage,
  WebsitePageVersionKind,
  WebsitePageVersionSummary,
} from '@types';
import {
  useRestoreWebsitePageVersion,
  useWebsitePageVersion,
  useWebsitePageVersions,
} from '../hooks/usePageVersions';
import {
  PreviewViewport,
  initialPreviewBreakpoint,
  type PreviewBreakpoint,
} from './PreviewViewport';
import { WebsiteRenderer } from '../renderer';
import {
  PUBLIC_WEBSITE_LOCALES,
  PUBLIC_WEBSITE_LOCALE_DIRECTION,
  PUBLIC_WEBSITE_LOCALE_LABELS,
  type PublicWebsiteLocale,
} from '../constants/locale.constants';
import { SECTION_METADATA } from '../sections/section-metadata.registry';
import {
  PAGE_VERSION_KIND_LABEL_KEYS,
  readRestoreFailure,
  type InvalidPart,
  type RestoreFailure,
} from '../utils/page-history.utils';

/** What happens to edits on screen that are not saved yet. */
export type LocalEditsOnRestore = 'none' | 'save' | 'discard';

export interface PageHistoryDialogProps {
  readonly academyId: string;
  readonly page: WebsitePage;
  readonly academyName: string;
  readonly academyLogo?: string;
  readonly configuration: WebsiteConfiguration;
  /** The pages a visitor can reach (the preview's menu and links). */
  readonly previewPages: readonly WebsitePage[];
  /** The language the preview opens in (the site's main one). */
  readonly initialLocale: PublicWebsiteLocale;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Whether this user may restore (manages the website). */
  readonly canRestore: boolean;
  readonly localEdits: LocalEditsOnRestore;
  /** Saves the edits on screen first; resolves the saved page or `null`. */
  readonly onSaveLocalEdits: () => Promise<WebsitePage | null>;
  /** The restored draft, to show in the editor. */
  readonly onRestored: (page: WebsitePage) => void;
  /** The page changed under the history (a stale restore): reload it. */
  readonly onPageChanged: () => void;
}

const KIND_ICON: Record<WebsitePageVersionKind, typeof History> = {
  published: UploadCloud,
  draft_snapshot: Save,
  restore_backup: RotateCcw,
};

const KIND_TONE: Record<WebsitePageVersionKind, string> = {
  published: 'bg-success/10 text-success',
  draft_snapshot: 'bg-muted text-muted-foreground',
  restore_backup: 'bg-warning-surface text-foreground',
};

export function PageHistoryDialog({
  academyId,
  page,
  academyName,
  academyLogo,
  configuration,
  previewPages,
  initialLocale,
  open,
  onOpenChange,
  canRestore,
  localEdits,
  onSaveLocalEdits,
  onRestored,
  onPageChanged,
}: PageHistoryDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { dateTime } = useDateFormatter();
  const versionsQuery = useWebsitePageVersions(academyId, page.id, open);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const versionQuery = useWebsitePageVersion(academyId, page.id, selectedId);
  const restore = useRestoreWebsitePageVersion();
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<RestoreFailure | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [working, setWorking] = useState(false);
  const [breakpoint, setBreakpoint] = useState<PreviewBreakpoint>(
    initialPreviewBreakpoint
  );
  const [locale, setLocale] = useState<PublicWebsiteLocale>(initialLocale);

  // A fresh look each time it opens.
  useEffect(() => {
    if (!open) return;
    setSelectedId(undefined);
    setFailure(null);
    setSaveFailed(false);
    restore.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on open
  }, [open]);

  const versions = versionsQuery.data?.items ?? [];
  const selected = versions.find((version) => version.id === selectedId);
  const full = versionQuery.data;

  const kindLabel = (kind: WebsitePageVersionKind) =>
    t(PAGE_VERSION_KIND_LABEL_KEYS[kind]);
  const authorOf = (version: WebsitePageVersionSummary) =>
    version.createdBy?.name ?? t('website:history.unknownAuthor');

  const choose = (id: string) => {
    setSelectedId(id);
    setFailure(null);
    setSaveFailed(false);
  };

  const runRestore = async () => {
    if (!selected || working) return;
    setConfirming(false);
    setFailure(null);
    setSaveFailed(false);
    setWorking(true);
    try {
      let expectedVersion = page.version;
      if (localEdits === 'save') {
        const saved = await onSaveLocalEdits();
        if (!saved) {
          setSaveFailed(true);
          return;
        }
        expectedVersion = saved.version;
      }
      try {
        const restored = await restore.mutateAsync({
          academyId,
          pageId: page.id,
          versionId: selected.id,
          expectedVersion,
        });
        onRestored(restored);
        onOpenChange(false);
      } catch (error) {
        const next = readRestoreFailure(
          error as ApiError,
          full?.sections ?? []
        );
        setFailure(next);
        if (next?.type === 'stale') onPageChanged();
        if (next?.type === 'stale' || next?.type === 'notFound') {
          void versionsQuery.refetch();
        }
        if (next?.type === 'notFound') setSelectedId(undefined);
      }
    } finally {
      setWorking(false);
    }
  };

  const whenOf = (version: WebsitePageVersionSummary) => (
    <time
      dateTime={version.createdAt}
      className="text-xs text-muted-foreground"
    >
      {formatRelativeTime(version.createdAt, language)}
      <span aria-hidden> · </span>
      <span className="sr-only">, </span>
      {dateTime(version.createdAt)}
    </time>
  );

  const list = (
    <div className="flex min-h-0 flex-col">
      {versionsQuery.isLoading ? (
        <div className="space-y-2 p-1" aria-busy="true">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-16 w-full" />
          ))}
        </div>
      ) : versionsQuery.error ? (
        <ErrorState
          kind={versionsQuery.error.kind}
          onRetry={() => void versionsQuery.refetch()}
        />
      ) : versions.length === 0 ? (
        <div
          className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground"
          data-testid="page-history-empty"
        >
          <History className="mb-2 size-5" aria-hidden />
          {t('website:history.empty')}
        </div>
      ) : (
        <ul
          className="space-y-1.5"
          aria-label={t('website:history.listLabel')}
          data-testid="page-history-list"
        >
          {versions.map((version) => {
            const Icon = KIND_ICON[version.kind];
            const active = version.id === selectedId;
            return (
              <li key={version.id}>
                <button
                  type="button"
                  onClick={() => choose(version.id)}
                  aria-current={active ? 'true' : undefined}
                  data-version-kind={version.kind}
                  className={cn(
                    'flex min-h-11 w-full items-start gap-3 rounded-lg border p-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
                    active
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent/40'
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
                      KIND_TONE[version.kind]
                    )}
                    aria-hidden
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="block text-sm font-medium text-foreground">
                      {kindLabel(version.kind)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {t('website:history.by', { name: authorOf(version) })}
                    </span>
                    {whenOf(version)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const failureMessage = failure ? (
    <RestoreFailureNotice
      failure={failure}
      slug={selected?.slug ?? full?.slug ?? ''}
      sectionLabel={(part) =>
        part.kind === 'section'
          ? t('website:history.invalidPart.section', {
              position: part.index + 1,
              section: part.sectionType
                ? t(SECTION_METADATA[part.sectionType]?.labelKey ?? '')
                : '',
            })
          : t(`website:history.invalidPart.${part.kind}`)
      }
      onRetry={() => void runRestore()}
    />
  ) : saveFailed ? (
    <div
      role="alert"
      className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-foreground"
    >
      {t('website:history.saveFirstFailed')}
    </div>
  ) : null;

  const previewPane = selected ? (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ms-2 h-10 lg:hidden"
            onClick={() => setSelectedId(undefined)}
          >
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
            {t('website:history.backToList')}
          </Button>
          <h3 className="text-sm font-semibold text-foreground">
            {t('website:history.previewHeading', {
              kind: kindLabel(selected.kind),
            })}
          </h3>
          <p className="text-xs text-muted-foreground">
            {/* Each isolated, so an English title or the address keeps
                its own direction in an Arabic sentence. */}
            <bdi>{selected.title}</bdi>
            <span aria-hidden> · </span>
            <bdi dir="ltr">/{selected.slug}</bdi>
            {!selected.visible ? ` · ${t('website:history.hidden')}` : ''}
          </p>
        </div>
        {canRestore ? (
          <Button
            type="button"
            className="h-11"
            onClick={() => setConfirming(true)}
            disabled={working || !full}
            data-testid="page-history-restore"
          >
            {working ? (
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            ) : (
              <RotateCcw className="size-4" aria-hidden />
            )}
            {t('website:history.restoreAction')}
          </Button>
        ) : null}
      </div>
      {failureMessage}
      {versionQuery.isLoading ? (
        <Skeleton className="min-h-[18rem] flex-1" />
      ) : versionQuery.error ? (
        <ErrorState
          kind={versionQuery.error.kind}
          onRetry={() => void versionQuery.refetch()}
        />
      ) : full ? (
        <div
          className="min-h-[18rem] flex-1"
          data-testid="page-history-preview"
        >
          <PreviewViewport
            breakpoint={breakpoint}
            onBreakpointChange={setBreakpoint}
            dir={PUBLIC_WEBSITE_LOCALE_DIRECTION[locale]}
            lang={locale}
            fill
            toolbarEnd={
              <Select
                value={locale}
                onValueChange={(value) =>
                  setLocale(value as PublicWebsiteLocale)
                }
              >
                <SelectTrigger
                  className="h-9 w-auto gap-1 border-0 bg-transparent px-2 shadow-none"
                  aria-label={t('website:visualEditor.languageLabel')}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PUBLIC_WEBSITE_LOCALES.map((candidate) => (
                    <SelectItem key={candidate} value={candidate}>
                      {PUBLIC_WEBSITE_LOCALE_LABELS[candidate]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          >
            <WebsiteRenderer
              academyId={academyId}
              academyName={academyName}
              academyLogo={academyLogo}
              configuration={configuration}
              pages={previewPages}
              page={{
                ...page,
                title: full.title,
                slug: full.slug,
                visible: full.visible,
                seo: full.seo,
                sections: full.sections,
              }}
              locale={locale}
              onNavigate={() => undefined}
            />
          </PreviewViewport>
        </div>
      ) : null}
    </div>
  ) : (
    <div className="hidden flex-1 items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground lg:flex">
      {failureMessage ?? t('website:history.chooseHint')}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="flex h-[92dvh] max-w-6xl flex-col gap-4 p-4 sm:p-6"
          data-testid="page-history"
        >
          <DialogHeader className="text-start">
            <DialogTitle className="flex items-center gap-2">
              <History className="size-5" aria-hidden />
              {t('website:history.title')}
            </DialogTitle>
            <DialogDescription>
              {t('website:history.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 gap-4">
            {/* On a phone, the list OR the chosen version's preview. */}
            <div
              className={cn(
                'min-h-0 w-full shrink-0 overflow-y-auto lg:block lg:w-80',
                selected ? 'hidden' : 'block'
              )}
            >
              {!selected && failureMessage ? (
                <div className="mb-3 lg:hidden">{failureMessage}</div>
              ) : null}
              {list}
            </div>
            <div
              className={cn(
                'min-h-0 min-w-0 flex-1 flex-col',
                selected ? 'flex' : 'hidden lg:flex'
              )}
            >
              {previewPane}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent data-testid="page-history-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('website:history.confirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  {selected
                    ? t('website:history.confirmReplaces', {
                        kind: kindLabel(selected.kind),
                        when: dateTime(selected.createdAt),
                      })
                    : null}
                </p>
                <p>{t('website:history.confirmNotLive')}</p>
                <p>{t('website:history.confirmBackup')}</p>
                {localEdits === 'save' ? (
                  <p className="font-medium text-foreground">
                    {t('website:history.confirmSavesFirst')}
                  </p>
                ) : localEdits === 'discard' ? (
                  <p className="font-medium text-destructive">
                    {t('website:history.confirmDiscards')}
                  </p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void runRestore()}
              data-testid="page-history-confirm-restore"
            >
              {t('website:history.restoreAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RestoreFailureNotice({
  failure,
  slug,
  sectionLabel,
  onRetry,
}: {
  readonly failure: RestoreFailure;
  readonly slug: string;
  readonly sectionLabel: (part: InvalidPart) => string;
  readonly onRetry: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  if (failure.type === 'other') {
    return <ErrorState onRetry={onRetry} />;
  }
  let body: React.ReactNode;
  if (failure.type === 'stale') {
    body = failure.conflict.lastEditedByName
      ? t('website:history.staleBy', {
          name: failure.conflict.lastEditedByName,
        })
      : t('website:history.stale');
  } else if (failure.type === 'invalid') {
    body = (
      <>
        <p>{t('website:history.invalid')}</p>
        {failure.parts.length > 0 ? (
          <ul className="mt-2 list-disc space-y-0.5 ps-5">
            {failure.parts.map((part) => (
              <li key={part.kind === 'section' ? `s${part.index}` : part.kind}>
                {sectionLabel(part)}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-2">{t('website:history.invalidNothingChanged')}</p>
      </>
    );
  } else if (failure.type === 'slugTaken') {
    body = t('website:history.slugTaken', { slug });
  } else if (failure.type === 'slugReserved') {
    body = t('website:history.slugReserved', { slug });
  } else {
    body = t('website:history.notFound');
  }
  return (
    <div
      role="alert"
      data-testid="page-history-failure"
      data-failure={failure.type}
      className={cn(
        'rounded-md border p-3 text-sm text-foreground',
        failure.type === 'stale' || failure.type === 'notFound'
          ? 'border-warning/50 bg-warning-surface'
          : 'border-destructive/40 bg-destructive/5'
      )}
    >
      {body}
    </div>
  );
}
