/**
 * W5 — the academy-scoped query-key registry.
 *
 * THE INVARIANT (see `academy-scope.ts`): every key that holds one
 * academy's data carries the academy id as a TOP-LEVEL STRING element. A
 * switch cancels, and a revocation removes, an academy's whole cache with
 * one predicate (`keyReferencesAcademy`) — a key that hid the id inside a
 * parameter object, or left it out, would survive both and could show one
 * academy's data under another (and would keep its placeholder across a
 * switch, since object elements are "parameters" to the placeholder policy).
 *
 * Two checks:
 *   1. Every key FACTORY in `query-keys.ts` that takes an `academyId`
 *      parameter is discovered automatically and called with a sentinel —
 *      a new academy factory cannot be added without passing this.
 *   2. Every query CALL SITE (the `keys.csv` inventory from the W5
 *      investigation, re-derived here from source on every run) whose
 *      `queryFn` uses an academy id must build its key with that academy.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as queryKeys from './query-keys';
import { keyReferencesAcademy } from './academy-scope';

const SENTINEL = 'academy-sentinel-7f3c';

type KeyFactory = (...args: unknown[]) => readonly unknown[];

/** The parameter names of an arrow/function, read from its source. */
function parameterNames(fn: KeyFactory): string[] {
  const source = fn.toString();
  const match = source.match(/^[^(]*\(([^)]*)\)/);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((part) => part.replace(/[=:].*$/s, '').trim())
    .filter(Boolean);
}

interface DiscoveredFactory {
  readonly name: string;
  readonly fn: KeyFactory;
  readonly academyIndex: number;
  readonly arity: number;
}

function discoverAcademyFactories(): DiscoveredFactory[] {
  const found: DiscoveredFactory[] = [];
  for (const [familyName, family] of Object.entries(queryKeys)) {
    if (!family || typeof family !== 'object' || Array.isArray(family))
      continue;
    for (const [member, value] of Object.entries(family)) {
      if (typeof value !== 'function') continue;
      const fn = value as KeyFactory;
      const names = parameterNames(fn);
      const academyIndex = names.indexOf('academyId');
      if (academyIndex === -1) continue;
      found.push({
        name: `${familyName}.${member}`,
        fn,
        academyIndex,
        arity: names.length,
      });
    }
  }
  return found;
}

describe('academy-scoped query keys — factory registry', () => {
  const factories = discoverAcademyFactories();

  it('discovers the academy-scoped families (sanity: the scan works)', () => {
    const names = factories.map((factory) => factory.name);
    for (const expected of [
      'academyKeys.detail',
      'academyKeys.membership',
      'academyKeys.members',
      'academyKeys.communicationSettings',
      'courseKeys.list',
      'courseKeys.sections',
      'mediaKeys.list',
      'websiteKeys.configuration',
      'liveSessionKeys.status',
      'certificateKeys.template',
      'academyPayoutKeys.list',
      'academyCourseOrderKeys.list',
      'auditLogKeys.academyFeed',
      'announcementKeys.academy',
      'completionKeys.rule',
      'dashboardOverviewKeys.academy',
    ]) {
      expect(names).toContain(expected);
    }
    expect(factories.length).toBeGreaterThan(60);
  });

  it.each(factories.map((factory) => [factory.name, factory] as const))(
    '%s places the academy id as a top-level string element',
    (_name, factory) => {
      const args = Array.from({ length: factory.arity }, (_, index) =>
        index === factory.academyIndex ? SENTINEL : `arg-${index}`
      );
      const key = factory.fn(...args);
      expect(Array.isArray(key)).toBe(true);
      expect(keyReferencesAcademy(key, SENTINEL)).toBe(true);
      // Never ONLY inside an object element.
      const nested = key.filter(
        (part) =>
          part !== null &&
          typeof part === 'object' &&
          JSON.stringify(part).includes(SENTINEL)
      );
      expect(nested).toEqual([]);
    }
  );

  it('two academies never share a key', () => {
    for (const factory of factories) {
      const call = (academyId: string) =>
        JSON.stringify(
          factory.fn(
            ...Array.from({ length: factory.arity }, (_, index) =>
              index === factory.academyIndex ? academyId : `arg-${index}`
            )
          )
        );
      expect(call('academy-a')).not.toBe(call('academy-b'));
    }
  });
});

// --- call-site inventory (ported from the investigation's keys.py) --------

const SRC = join(__dirname, '..', '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return entry === 'test' || entry === 'node_modules'
        ? []
        : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
  });
}

interface CallSite {
  readonly where: string;
  readonly key: string;
  readonly fn: string;
}

function querySites(): CallSite[] {
  const sites: CallSite[] = [];
  const hook =
    /\b(useApiQuery|useQuery|useInfiniteQuery|useSuspenseQuery|prefetchQuery|ensureQueryData|fetchQuery)\b\s*(<[^()]*?>)?\s*\(/g;
  for (const file of sourceFiles(SRC)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(hook)) {
      let depth = 1;
      let index = (match.index ?? 0) + match[0].length;
      const start = index;
      while (index < source.length && depth > 0) {
        if (source[index] === '(') depth += 1;
        else if (source[index] === ')') depth -= 1;
        index += 1;
      }
      const body = source.slice(start, index);
      const key =
        body.match(/queryKey\s*:\s*([^\n]+(?:\n\s+[^\n:]+)*)/)?.[1] ?? '';
      const fn =
        body.match(
          /queryFn\s*:\s*([\s\S]*?)(?:,\s*\n\s*\w+\s*:|\n\s*\}\s*\)?\s*$)/
        )?.[1] ?? '';
      const line = source.slice(0, match.index).split('\n').length;
      sites.push({ where: `${relative(SRC, file)}:${line}`, key, fn });
    }
  }
  return sites;
}

/**
 * Verified exceptions (W5 investigation):
 *   - the dashboard overview, student analytics and tenant support-case
 *     hooks key by a SCOPE value built one step earlier that embeds the
 *     `academyId` (`useDashboardScope`), so the regex cannot see it;
 *   - the public hostname resolver is keyed by the hostname — the academy
 *     id is its RESULT (remembered for dev previews), not an input.
 */
const SCOPE_EMBEDDED = [
  'features/dashboard/hooks/useDashboardOverview.ts',
  'features/dashboard/hooks/useStudentAnalytics.ts',
  'features/dashboard/hooks/useTenantSupportCases.ts',
  'features/public-website/hooks/useResolveHostname.ts',
];

describe('academy-scoped query keys — call sites', () => {
  const sites = querySites();

  it('finds the query call sites (sanity: the scan works)', () => {
    expect(sites.length).toBeGreaterThan(150);
  });

  it('every query whose fetch uses an academy id keys by that academy', () => {
    const offenders = sites.filter(
      (site) =>
        /academyId|academy\.id|activeAcademyId|AcademyId/.test(site.fn) &&
        !/academy|Academy/.test(site.key) &&
        !SCOPE_EMBEDDED.some((path) => site.where.startsWith(path))
    );
    expect(offenders.map((site) => site.where)).toEqual([]);
  });
});
