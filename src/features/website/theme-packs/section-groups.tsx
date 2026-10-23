/**
 * Section groups — theme code that only the pages using it download.
 *
 * The phase 3d sections (CMS_PLAN_AR.md, P3d) are fifteen section types in
 * four themes: drawn into each theme's pack, they would make every Academy
 * site download them whether it uses one or none (Riwaq's pack budget,
 * `ssr.test.mjs`). Each theme's four files of them are a chunk of their own
 * instead — a "group" — and a pack names them through `deferredSection`.
 *
 * Who loads what, exactly as for theme packs (`theme-pack.loader.ts`), so a
 * server-rendered page hydrates without suspending (React error #421):
 *   - the server renderer loads every group once per process and records
 *     the groups a page rendered (`SectionGroupUsageContext`);
 *   - `main.tsx` loads those groups with the page's theme pack, before
 *     hydrating, so each section renders directly, as on the server;
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

/** Every group this build has: a theme's file of phase 3d sections. */
const SECTION_GROUPS = {
  'modern-education:trust-visit': () =>
    import('../modern-education/t1-trust-visit-sections'),
  'modern-education:engage': () =>
    import('../modern-education/t1-engage-sections'),
  'modern-education:enrol': () =>
    import('../modern-education/t1-enrol-sections'),
  'modern-education:journey-proof': () =>
    import('../modern-education/t1-journey-proof-sections'),
  'atelier:trust-visit': () =>
    import('../atelier/sections/atelier-trust-visit-sections'),
  'atelier:engage': () => import('../atelier/sections/atelier-engage-sections'),
  'atelier:enrol': () => import('../atelier/sections/atelier-enrol-sections'),
  'atelier:journey-proof': () =>
    import('../atelier/sections/atelier-journey-proof-sections'),
  'manara:trust-visit': () =>
    import('../manara/sections/manara-trust-visit-sections'),
  'manara:engage': () => import('../manara/sections/manara-engage-sections'),
  'manara:enrol': () => import('../manara/sections/manara-enrol-sections'),
  'manara:journey-proof': () =>
    import('../manara/sections/manara-journey-proof-sections'),
  'riwaq:trust-visit': () =>
    import('../riwaq/sections/riwaq-trust-visit-sections'),
  'riwaq:engage': () => import('../riwaq/sections/riwaq-engage-sections'),
  'riwaq:enrol': () => import('../riwaq/sections/riwaq-enrol-sections'),
  'riwaq:journey-proof': () =>
    import('../riwaq/sections/riwaq-journey-proof-sections'),
} satisfies Record<string, () => Promise<GroupModule>>;

export type SectionGroupKey = keyof typeof SECTION_GROUPS;

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
    Object.prototype.hasOwnProperty.call(SECTION_GROUPS, key)
  );
}

/** Loads the group's chunk, once; resolves when its sections can render. */
export function loadSectionGroup(key: SectionGroupKey): Promise<void> {
  if (loaded.has(key)) return Promise.resolve();
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const request = importWithRetry<GroupModule>(SECTION_GROUPS[key]).then(
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

/** Every group — the server renderer's (and the tests'), once per process. */
export function loadAllSectionGroups(): Promise<void> {
  return Promise.all(
    (Object.keys(SECTION_GROUPS) as SectionGroupKey[]).map(loadSectionGroup)
  ).then(() => undefined);
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
 * A pack's renderer for a section drawn in a group: the group's export
 * `exportName`, rendered directly once the group has loaded.
 */
export function deferredSection<TType extends SectionType>(
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
