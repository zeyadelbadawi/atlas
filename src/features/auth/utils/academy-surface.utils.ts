/**
 * Academy-surface helpers (P64 Phase 1, AD-4 / AD-5).
 *
 * The one place the frontend reads the surface-aware sign-in contract:
 * which error keys mean what, how a learner's academies are turned into
 * links to the academy website, and which `returnTo` values are safe to
 * navigate to after sign-in. Pages import these instead of restating the
 * strings, so a key renamed on the backend is fixed here exactly once.
 */
import type { ApiError } from '@api';
import {
  isLearnerPrincipal,
  isManagementPrincipal,
  MANAGEMENT_PRINCIPAL_KINDS,
} from '@utils';
import type { LearnerAcademy, RefusedSignInAcademy } from '@types';

/** Backend `messageKey`s the auth surfaces switch on. Always the raw `errors.…` form the wire carries. */
export const AUTH_ERROR_KEYS = {
  /** Management sign-in refused: the account is a learner (403, `details.academies`). */
  studentUseAcademySignIn: 'errors.auth.studentUseAcademySignIn',
  /** Academy sign-in/registration without an `academyId` (400). */
  academyContextRequired: 'errors.auth.academyContextRequired',
  /** The `academyId` does not belong to the request host (403). */
  academyHostMismatch: 'errors.auth.academyHostMismatch',
  /** The student is blocked in this academy (403). */
  academyAccessBlocked: 'errors.auth.academyAccessBlocked',
  /** Invite/approval policy and the account is not a member yet (403) — send to sign-up. */
  notAMemberOfAcademy: 'errors.auth.notAMemberOfAcademy',
  /** Registration needs an invitation token (403). */
  inviteRequired: 'errors.auth.inviteRequired',
  /** The invitation token is unknown, used or expired (400). */
  inviteInvalid: 'errors.auth.inviteInvalid',
  /** The address is disposable/undeliverable (400) — a FIELD error on the email input. */
  emailNotAcceptable: 'errors.auth.emailNotAcceptable',
  /** A learner token reached a management controller (403). */
  managementSurfaceOnly: 'errors.auth.managementSurfaceOnly',
} as const;

/*
 * The principal-kind predicates live in `@utils` (`principal.utils.ts`),
 * not here: `RouteGuard` needs them too, and a route guard reaching into
 * a feature is exactly what the cross-feature import rule forbids.
 * Re-exported so this file stays the one import for everything
 * surface-related.
 */
export { isLearnerPrincipal, isManagementPrincipal, MANAGEMENT_PRINCIPAL_KINDS };

/**
 * An absolute link into an academy website. The backend hands over a bare
 * host (`elzozo.atlas.app` / `learn.example.com`); every academy website is
 * served over HTTPS, so that is the only scheme ever built here.
 */
export function buildAcademyUrl(host: string, path: string): string {
  const normalizedHost = host.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `https://${normalizedHost}${normalizedPath}`;
}

/**
 * The `details.academies` of a `studentUseAcademySignIn` refusal, or an
 * empty list when the error is something else or the payload is
 * malformed. Every field is checked: `details` is untyped wire data.
 */
export function readRefusedAcademies(
  error: ApiError | null | undefined
): readonly RefusedSignInAcademy[] {
  if (!error || error.messageKey !== AUTH_ERROR_KEYS.studentUseAcademySignIn) {
    return [];
  }
  const raw = error.details?.academies;
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      return [];
    }
    const candidate = entry as Record<string, unknown>;
    const academyId = candidate.academyId;
    const name = candidate.name;
    if (typeof academyId !== 'string' || typeof name !== 'string') return [];
    const slug = typeof candidate.slug === 'string' ? candidate.slug : '';
    const host =
      typeof candidate.host === 'string' && candidate.host.length > 0
        ? candidate.host
        : undefined;
    return [{ academyId, name, slug, host }];
  });
}

/** The academies of a signed-in user that have a public host to link to. */
export function academiesWithHost(
  academies: readonly LearnerAcademy[] | undefined
): readonly LearnerAcademy[] {
  return (academies ?? []).filter(
    (academy) => typeof academy.host === 'string' && academy.host.length > 0
  );
}

/**
 * Whether a `returnTo` is a same-site relative path that is safe to
 * navigate to after sign-in. Refuses absolute URLs, protocol-relative
 * `//host` forms and anything with a scheme — an open redirect would let a
 * phishing link bounce a freshly signed-in learner to a look-alike site.
 */
export function isSafeReturnPath(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//') || value.startsWith('/\\')) return false;
  return !/^[a-z][a-z\d+.-]*:/i.test(value);
}
