/**
 * Section groups — theme code that only the pages using it download.
 *
 * The phase 3d sections (CMS_PLAN_AR.md, P3d) are fifteen section types in
 * four themes: drawn into each theme's pack, they would make every Academy
 * site download them whether it uses one or none (Riwaq's pack budget,
 * `ssr.test.mjs`). Each theme's four files of them are a chunk of their own
 * instead — a "group" — and a pack names them through `sectionGroup`.
 *
 * The `import()` of a group is written in its theme's pack, never here: a
 * group is then only ever loaded by the pack's own chunk, so the bundler
 * knows everything the pack holds is already loaded and leaves the code
 * both share (the theme's parts, icons, utilities) inside the pack. Written
 * here, in the app's entry, every such module became a chunk of its own and
 * each page of the theme fetched some 25 more files.
 *
 * Who loads what, exactly as for theme packs (`theme-pack.loader.ts`), so a
 * server-rendered page hydrates without suspending (React error #421):
 *   - the server renderer loads every pack and then every group once per
 *     process, and records the groups a page rendered
 *     (`SectionGroupUsageContext`);
 *   - `main.tsx` loads those groups once the page's theme pack has arrived
 *     (its pack registers their loaders), before hydrating, so each section
 *     renders directly, as on the server;
 *   - anywhere else (dashboard previews, a page reached in the browser) a
 *     deferred section starts its group's load and draws nothing until it
 *     has arrived.
 */
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from 'react';
import type { SectionType } from '@types';
import { importWithRetry } from '@utils/lazy-with-retry.utils';
import type {
  SectionRenderProps,
  SectionRendererComponent,
} from './theme-pack.types';

type GroupModule = Readonly<Record<string, unknown>>;
type GroupLoader = () => Promise<GroupModule>;

/** Every group this build has: a theme's file of phase 3d sections. */
const SECTION_GROUP_KEYS = [
  'modern-education:trust-visit',
  'modern-education:engage',
  'modern-education:enrol',
  'modern-education:journey-proof',
  'atelier:trust-visit',
  'atelier:engage',
  'atelier:enrol',
  'atelier:journey-proof',
  'manara:trust-visit',
  'manara:engage',
  'manara:enrol',
  'manara:journey-proof',
  'riwaq:trust-visit',
  'riwaq:engage',
  'riwaq:enrol',
  'riwaq:journey-proof',
] as const;

export type SectionGroupKey = (typeof SECTION_GROUP_KEYS)[number];

/** The groups' loaders, registered by their packs (`sectionGroup`). */
const loaders = new Map<SectionGroupKey, GroupLoader>();
const loaded = new Map<SectionGroupKey, GroupModule>();
const pending = new Map<SectionGroupKey, Promise<void>>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether this build has the group (a key read from the page's payload). */
export function isSectionGroupKey(key: unknown): key is SectionGroupKey {
  return (
    typeof key === 'string' &&
    (SECTION_GROUP_KEYS as readonly string[]).includes(key)
  );
}

/**
 * Loads the group's chunk, once; resolves when its sections can render.
 * Its theme's pack must have loaded first: the pack registers the loader.
 */
export function loadSectionGroup(key: SectionGroupKey): Promise<void> {
  if (loaded.has(key)) return Promise.resolve();
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const load = loaders.get(key);
  if (!load) {
    return Promise.reject(
      new Error(`Section group ${key}: its theme pack has not loaded.`)
    );
  }
  const request = importWithRetry<GroupModule>(load).then(
    (module) => {
      pending.delete(key);
      loaded.set(key, module);
      for (const listener of listeners) listener();
    },
    (error: unknown) => {
      pending.delete(key);
      throw error;
    }
  );
  pending.set(key, request);
  return request;
}

/**
 * Every group — the server renderer's (and the tests'), once per process,
 * after every theme pack has loaded (each registers its own groups).
 */
export function loadAllSectionGroups(): Promise<void> {
  return Promise.all(SECTION_GROUP_KEYS.map(loadSectionGroup)).then(
    () => undefined
  );
}

/** A loaded group's module (tests: every name a pack defers to is exported). */
export function loadedSectionGroup(
  key: SectionGroupKey
): GroupModule | undefined {
  return loaded.get(key);
}

const targets = new WeakMap<
  object,
  { readonly group: SectionGroupKey; readonly exportName: string }
>();

/** The group and export a deferred renderer draws, if it is one. */
export function deferredSectionTarget(
  renderer: unknown
):
  { readonly group: SectionGroupKey; readonly exportName: string } | undefined {
  return typeof renderer === 'function' ? targets.get(renderer) : undefined;
}

/**
 * Collects the groups a render drew — the server renderer provides one per
 * page and tells the browser which to load before hydrating. Absent (null)
 * in the browser.
 */
export const SectionGroupUsageContext =
  createContext<Set<SectionGroupKey> | null>(null);

/**
 * A theme pack's group: registers its loader — an `import()` written in the
 * pack's own modules (see the top of this file) — and returns the pack's
 * renderer for each section drawn in it: `group('RiwaqVideo')` is the
 * group's export `RiwaqVideo`, rendered directly once the group has loaded.
 */
export function sectionGroup(
  group: SectionGroupKey,
  load: GroupLoader
): <TType extends SectionType>(
  exportName: string
) => SectionRendererComponent<TType> {
  loaders.set(group, load);
  return (exportName) => deferredSection(group, exportName);
}

function deferredSection<TType extends SectionType>(
  group: SectionGroupKey,
  exportName: string
): SectionRendererComponent<TType> {
  function DeferredSection(
    props: SectionRenderProps<TType>
  ): JSX.Element | null {
    useContext(SectionGroupUsageContext)?.add(group);
    const read = () => loaded.get(group);
    const module = useSyncExternalStore(subscribe, read, read);
    useEffect(() => {
      if (!module) loadSectionGroup(group).catch(() => undefined);
    }, [module]);
    if (!module) return null;
    const Section = module[exportName] as SectionRendererComponent<TType>;
    return <Section {...props} />;
  }
  DeferredSection.displayName = `DeferredSection(${exportName})`;
  targets.set(DeferredSection, { group, exportName });
  return DeferredSection;
}
