/**
 * The academy scope lives in the URL (W5): `/dashboard/academy/:academyId/*`
 * is the single source of truth for "which academy am I working in". These
 * helpers read it and compute where a switch lands.
 */
import { matchPath } from 'react-router-dom';

/** Every academy-scoped dashboard screen lives under this pattern. */
export const ACADEMY_SCOPE_PATTERN = '/dashboard/academy/:academyId/*';

/** Static children of `/dashboard/academy` that are not an academy id. */
const RESERVED_SEGMENTS: ReadonlySet<string> = new Set(['create']);

/** The academy id the URL addresses, or `undefined` outside the academy scope. */
export function academyIdFromPath(pathname: string): string | undefined {
  const match = matchPath(ACADEMY_SCOPE_PATTERN, pathname);
  const academyId = match?.params.academyId;
  if (!academyId || RESERVED_SEGMENTS.has(academyId)) return undefined;
  return academyId;
}

/**
 * Sub-route segments that name a SCREEN (valid in any academy), as opposed
 * to one academy's resource ids (a course, an order, a page). A switch
 * keeps the screen and drops the resource: course X of academy A does not
 * exist in academy B.
 */
const SCREEN_SEGMENTS: ReadonlySet<string> = new Set([
  'profile',
  'settings',
  'branding',
  'members',
  'courses',
  'media',
  'certificates',
  'template',
  'announcements',
  'reports',
  'activity',
  'revenue',
  'orders',
  'website',
  'content',
  'pages',
  'preview',
  'messages',
]);

/**
 * Where switching from the current URL to `nextAcademyId` lands: the same
 * screen in the other academy, without any resource id or create form
 * (`/courses/<id>/builder` -> `/courses`), else the academy overview.
 */
export function switchTargetPath(
  pathname: string,
  nextAcademyId: string
): string {
  const base = `/dashboard/academy/${encodeURIComponent(nextAcademyId)}`;
  const match = matchPath(ACADEMY_SCOPE_PATTERN, pathname);
  const rest = match?.params['*'] ?? '';
  const kept: string[] = [];
  for (const segment of rest.split('/').filter(Boolean)) {
    if (!SCREEN_SEGMENTS.has(segment)) break;
    kept.push(segment);
  }
  return kept.length > 0 ? `${base}/${kept.join('/')}` : base;
}
