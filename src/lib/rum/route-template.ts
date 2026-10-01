/**
 * Real-user monitoring (P6): which KIND of page a visit is, as one of a
 * closed set of templates. Never the URL — no ids, slugs, query strings or
 * fragments leave the browser. The backend accepts only these values
 * (`web-vitals.util.ts` there) and folds anything else into `app:other`.
 */
export const RUM_ROUTE_TEMPLATES = [
  'public:home',
  'public:courses',
  'public:course',
  'public:page',
  'public:auth',
  'public:learn',
  'app:dashboard',
  'app:learn',
  'app:builder',
  'app:instructor',
  'app:platform',
  'app:auth',
  'app:other',
] as const;
export type RumRouteTemplate = (typeof RUM_ROUTE_TEMPLATES)[number];

const PUBLIC_AUTH =
  /^\/(sign-in|sign-up|forgot-password|reset-password|verify-email|auth)(\/|$)/;

/** The template for a pathname, on an Academy website or in the Atlas app. */
export function rumRouteTemplate(
  pathname: string,
  surface: 'academy-website' | 'atlas-app'
): RumRouteTemplate {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (surface === 'academy-website') {
    // The Arabic site lives under /ar.
    const local = path.replace(/^\/ar(?=\/|$)/, '') || '/';
    if (local === '/') return 'public:home';
    if (local === '/courses') return 'public:courses';
    if (/^\/courses\/[^/]+$/.test(local)) return 'public:course';
    if (PUBLIC_AUTH.test(local)) return 'public:auth';
    if (/^\/my(\/|$)/.test(local)) return 'public:learn';
    return 'public:page';
  }
  if (/^\/auth(\/|$)/.test(path)) return 'app:auth';
  if (
    /^\/(my|my-learning)(\/|$)/.test(path) ||
    /^\/dashboard\/learning(\/|$)/.test(path)
  )
    return 'app:learn';
  if (/^\/dashboard\/academy\/[^/]+\/website(\/|$)/.test(path))
    return 'app:builder';
  if (/^\/dashboard\/instructor(\/|$)/.test(path)) return 'app:instructor';
  if (/^\/dashboard\/platform(\/|$)/.test(path)) return 'app:platform';
  if (/^\/dashboard(\/|$)/.test(path)) return 'app:dashboard';
  return 'app:other';
}
