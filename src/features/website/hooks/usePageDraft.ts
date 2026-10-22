/**
 * usePageDraft — one page's sections being edited: the local draft, the
 * server copy it is based on, saving, publishing, and save conflicts.
 *
 * Shared by the page editor (`WebsitePageEditorPage`) and the visual editor
 * (`VisualEditorPage`), so both keep the same guarantees:
 *
 * THE DRAFT AND THE SERVER COPY IT WAS STARTED FROM. A refetch of the page
 * (after an SEO save, a site publish, a window refocus) only replaces the
 * draft when there is nothing local to lose. `baseRef` is the server copy
 * the draft is based on: its version is what a save is checked against.
 * When the server copy moves under unsaved edits, the version is only moved
 * along if the sections did not change (your own SEO save, say); if a
 * colleague changed the sections, the draft keeps its old base so the save
 * surfaces the conflict instead of overwriting their work.
 *
 * CONTENT LIMITS. The API validates the whole `sections` array on every
 * save, so a section holding text over a current limit (saved before the
 * limit tightened) blocks saving the page: such sections are reported
 * (`needsShorteningIds`) and saving is held back until they are shortened.
 * A refused save's path-level violations are kept per section
 * (`serverIssuesById`) until that section is edited or a save succeeds.
 *
 * ONE ACTION TO GO LIVE. `publishThisPage` saves (when there is anything
 * to save) and publishes this page pinned to the version just saved — or,
 * with nothing to save, to the version on screen — so a colleague's later
 * save is never put live unseen.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ApiError } from '@api';
import type { SectionInstance, WebsitePage } from '@types';
import { usePublishWebsitePage, useUpdateWebsitePage } from './index';
import {
  readSaveConflict,
  type SaveConflict,
} from '../utils/save-conflict.utils';
import { stableJsonKey } from '../utils/stable-json.utils';
import {
  isOverLimitIssue,
  sectionIssuesFromViolations,
  sectionNeedsShortening,
  type SectionContentIssue,
} from '../schemas/section-content-issues';

/** Which action a conflict interrupted, so "keep my changes" can finish it. */
export type ConflictIntent = 'save' | 'publish';

export interface PendingConflict {
  readonly value: SaveConflict;
  readonly intent: ConflictIntent;
  /** False when there is no local work left to re-apply. */
  readonly canKeepMine: boolean;
}

export interface UsePageDraftOptions {
  readonly academyId: string | undefined;
  readonly pageId: string | undefined;
  /** The server copy (the page query's data). */
  readonly page: WebsitePage | undefined;
  /** Refetches the page (the conflict dialog's "reload"). */
  readonly refetchPage: () => Promise<{ data?: WebsitePage }>;
  /**
   * What is actually sent for the draft (the visual editor sends each
   * section's schema-parsed config, keeping the draft itself as typed).
   * Defaults to the draft as it is.
   */
  readonly prepareSections?: (
    sections: readonly SectionInstance[]
  ) => SectionInstance[];
}

export function usePageDraft({
  academyId,
  pageId,
  page,
  refetchPage,
  prepareSections,
}: UsePageDraftOptions) {
  const updatePage = useUpdateWebsitePage();
  const publishPage = usePublishWebsitePage();

  const [draftSections, setDraftSections] = useState<SectionInstance[]>([]);
  const [conflict, setConflict] = useState<PendingConflict | null>(null);

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
    if (!page) return;
    const base = baseRef.current;
    if (!base || stableJsonKey(draftRef.current) === base.key) {
      adoptServerPage(page);
    } else if (stableJsonKey(page.sections) === base.key) {
      baseRef.current = { version: page.version, key: base.key };
    }
  }, [page, adoptServerPage]);

  const serverKey = useMemo(
    () => (page ? stableJsonKey(page.sections) : null),
    [page]
  );
  const draftKey = useMemo(() => stableJsonKey(draftSections), [draftSections]);
  const isDirty = serverKey !== null && draftKey !== serverKey;

  // What the API refused on the last save, per section id; cleared by a
  // successful save, and per section when that section is edited.
  const [serverIssuesById, setServerIssuesById] = useState<
    Readonly<Record<string, readonly SectionContentIssue[]>>
  >({});
  const clearServerIssues = useCallback((sectionId: string) => {
    setServerIssuesById((prev) => {
      if (!(sectionId in prev)) return prev;
      const next = { ...prev };
      delete next[sectionId];
      return next;
    });
  }, []);
  const needsShorteningIds = useMemo(
    () =>
      new Set(
        draftSections
          .filter(
            (section) =>
              sectionNeedsShortening(section) ||
              (serverIssuesById[section.id] ?? []).some(isOverLimitIssue)
          )
          .map((section) => section.id)
      ),
    [draftSections, serverIssuesById]
  );
  const isBlockedByLimits = needsShorteningIds.size > 0;

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
    // The API would refuse the whole page; the notice says which sections.
    if (isBlockedByLimits) return null;
    const sections = draftRef.current;
    const draftKeyAtSend = stableJsonKey(sections);
    try {
      const saved = await updatePage.mutateAsync({
        academyId,
        pageId,
        payload: {
          sections: prepareSections ? prepareSections(sections) : sections,
          expectedVersion: overrideVersion ?? baseRef.current?.version,
        },
      });
      setConflict(null);
      setServerIssuesById({});
      if (stableJsonKey(draftRef.current) === draftKeyAtSend) {
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
      const violations = (error as ApiError).violations;
      setServerIssuesById(
        Object.fromEntries(
          sections
            .map(
              (section, index) =>
                [
                  section.id,
                  sectionIssuesFromViolations(violations, index),
                ] as const
            )
            .filter(([, issues]) => issues.length > 0)
        )
      );
      return null;
    }
  };

  const saveDraft = async (overrideVersion?: number) => {
    if (busyRef.current) return null;
    busyRef.current = true;
    try {
      return await saveSections('save', overrideVersion);
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

  /** Throws this editor's local work away and shows the server's copy. */
  const reloadLatest = async () => {
    setConflict(null);
    const refreshed = await refetchPage();
    if (refreshed.data) adoptServerPage(refreshed.data);
    return refreshed.data;
  };

  /** Re-applies this editor's work ON TOP of the newer version — never over it. */
  const keepMine = () => {
    if (!conflict?.canKeepMine) return;
    const { value, intent } = conflict;
    setConflict(null);
    if (intent === 'publish') void publishThisPage(value.currentVersion);
    else void saveDraft(value.currentVersion);
  };

  return {
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
    /** Whether a save or publish is in flight (one at a time). */
    isWorking: () => busyRef.current,
    updatePage,
    publishPage,
  };
}
