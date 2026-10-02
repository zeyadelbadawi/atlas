/**
 * Local development only: which Academy a request "comes from" when the
 * Academy is chosen by the `__atlas_academy_preview` parameter rather than
 * by the hostname.
 *
 * A handful of learner routes decide the Academy from the request HOST
 * (`requireHostAcademy` in the backend's learner-dashboard, learner-session,
 * lesson-content and certificates controllers). On a real Academy host —
 * production, staging — that resolves and nothing here applies. On
 * `localhost` the host names no Academy, so the backend accepts an
 * `academyId` query parameter as its documented local fallback; without it
 * those pages fail with `errors.academy.hostUnresolved` (the learner's
 * Overview and Certificates pages showed "Unexpected error" in the
 * database-backed journeys).
 *
 * The id is recorded only by the dev-override resolution
 * (`useResolveHostname`) and only in a development build, and it is added
 * only to those host-resolved routes, so a production request is never
 * changed.
 */
let devHostAcademyId: string | undefined;

export function setDevHostAcademyId(academyId: string | undefined): void {
  devHostAcademyId = academyId;
}

/** The backend routes that resolve the Academy from the host. */
const HOST_RESOLVED_ROUTES = [
  /^\/?learning\/(overview|quizzes|assignments|devices(\/[^/?]+)?|session\/takeover|certificates)$/,
  /^\/?learning\/courses\/[^/?]+\/lessons\/[^/?]+\/(content|playback\/refresh)$/,
];

/**
 * The params to send: `academyId` added for a host-resolved route while a
 * dev-preview Academy is known and the caller didn't name one; otherwise
 * the params unchanged.
 */
export function withDevHostAcademy<
  T extends Record<string, unknown> | undefined,
>(url: string | undefined, params: T): T | (T & { academyId: string }) {
  if (!import.meta.env.DEV || !devHostAcademyId || !url) return params;
  if (!HOST_RESOLVED_ROUTES.some((route) => route.test(url))) return params;
  if (params && 'academyId' in params) return params;
  return { ...(params ?? {}), academyId: devHostAcademyId } as T & {
    academyId: string;
  };
}
