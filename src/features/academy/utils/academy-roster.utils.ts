/**
 * Academy roster presentation helpers (P64 Phase 1).
 *
 * Tone/label mapping for learner rows and enrollments, the backend
 * `messageKey` → friendly-copy mapping for roster actions, and the invite
 * link builder. Pure functions — nothing here fetches or decides access.
 */
import type { StatusTone } from '@components/data-display';
import type { ApiError } from '@api';
import type {
  AcademyInvite,
  AcademyRosterStudent,
  RosterEnrollment,
} from '@types';

/** `AcademyStudentSource` (backend Prisma enum) — anything else falls back to a generic label. */
const KNOWN_SOURCES: ReadonlySet<string> = new Set([
  'self_signup',
  'sign_in_join',
  'staff_created',
  'purchase',
  'invite',
  'backfill',
]);

/** `EnrollmentStatus` — label keys already exist under `instructor:students.enrollmentStatus`. */
const KNOWN_ENROLLMENT_STATUSES: ReadonlySet<string> = new Set([
  'available',
  'pending',
  'enrolled',
  'completed',
  'unavailable',
]);

type RosterStatusInput = Pick<
  AcademyRosterStudent,
  'blocked' | 'membershipStatus'
>;

/** Blocked wins over membership status — it is the one state that needs acting on. */
export function getRosterStatusLabelKey(student: RosterStatusInput): string {
  if (student.blocked) return 'academy:students.status.blocked';
  return `academy:students.status.${student.membershipStatus}`;
}

export function getRosterStatusTone(student: RosterStatusInput): StatusTone {
  if (student.blocked) return 'destructive';
  switch (student.membershipStatus) {
    case 'active':
      return 'success';
    case 'pending':
      return 'warning';
    case 'inactive':
    default:
      return 'neutral';
  }
}

export function getRosterSourceLabelKey(source: string): string {
  return KNOWN_SOURCES.has(source)
    ? `academy:students.source.${source}`
    : 'academy:students.source.other';
}

/**
 * The badge must name the reason access ended, not just the stored status.
 * An enrollment whose `expiresAt` has passed still carries status
 * `enrolled`, and labelling it "Enrolled" told staff the opposite of what
 * the learner experiences (the backend already refuses the content).
 * `completed` is checked first on purpose: finishing a course is not
 * undone by the access window closing afterwards.
 */
export function getRosterEnrollmentLabelKey(
  enrollment: Pick<RosterEnrollment, 'status' | 'revokedAt' | 'expiresAt'>,
  now: Date = new Date()
): string {
  if (enrollment.revokedAt) return 'academy:students.enrollment.revoked';
  if (
    enrollment.status !== 'completed' &&
    enrollment.expiresAt &&
    new Date(enrollment.expiresAt).getTime() <= now.getTime()
  ) {
    return 'academy:students.enrollment.expired';
  }
  return KNOWN_ENROLLMENT_STATUSES.has(enrollment.status)
    ? `instructor:students.enrollmentStatus.${enrollment.status}`
    : 'academy:students.enrollment.unknown';
}

export function getRosterEnrollmentTone(
  enrollment: Pick<RosterEnrollment, 'status' | 'revokedAt' | 'isActive'>
): StatusTone {
  if (enrollment.revokedAt) return 'destructive';
  if (enrollment.status === 'completed') return 'info';
  return enrollment.isActive ? 'success' : 'neutral';
}

export type AcademyInviteState = 'active' | 'revoked' | 'expired' | 'exhausted';

export function getInviteState(
  invite: Pick<AcademyInvite, 'revokedAt' | 'expiresAt' | 'usedCount' | 'maxUses'>,
  now: Date = new Date()
): AcademyInviteState {
  if (invite.revokedAt) return 'revoked';
  if (new Date(invite.expiresAt).getTime() <= now.getTime()) return 'expired';
  if (invite.maxUses > 0 && invite.usedCount >= invite.maxUses) {
    return 'exhausted';
  }
  return 'active';
}

export function getInviteStateTone(state: AcademyInviteState): StatusTone {
  switch (state) {
    case 'active':
      return 'success';
    case 'exhausted':
      return 'info';
    case 'expired':
      return 'neutral';
    case 'revoked':
    default:
      return 'destructive';
  }
}

/**
 * Backend `messageKey` → `academy` namespace copy. The backend's keys are
 * dotted (`errors.academy.studentBlocked`); the `errors` namespace has no
 * entries for these roster-specific cases, so the copy lives next to the
 * feature that raises them.
 */
const ROSTER_MESSAGE_KEYS: Readonly<Record<string, string>> = {
  'errors.academy.insufficientRole': 'academy:students.errors.insufficientRole',
  'errors.academy.studentNotPending': 'academy:students.errors.studentNotPending',
  'errors.academy.studentBlocked': 'academy:students.errors.studentBlocked',
  'errors.enrollment.alreadyEnrolled': 'academy:students.errors.alreadyEnrolled',
  'errors.enrollment.expiryInPast': 'academy:students.errors.expiryInPast',
  'errors.notFound': 'academy:students.errors.notFound',
};

/** Picks the friendliest translation key for a roster/registration failure. */
export function getRosterErrorKey(
  error: Pick<ApiError, 'kind' | 'messageKey'> | null | undefined,
  fallbackKey = 'academy:students.errors.generic'
): string {
  if (!error) return fallbackKey;
  const specific = ROSTER_MESSAGE_KEYS[error.messageKey];
  if (specific) return specific;
  if (error.kind === 'forbidden') {
    return 'academy:students.errors.insufficientRole';
  }
  if (error.kind === 'notFound') return 'academy:students.errors.notFound';
  return fallbackKey;
}

/**
 * The link a learner opens to register with an invite. Built only from a
 * backend-resolved host (canonical host / subdomain `fullHost`) — never a
 * guessed root domain. Without a host the caller shows the raw token.
 */
export function buildInviteLink(
  host: string | undefined,
  token: string
): string | undefined {
  if (!host) return undefined;
  return `https://${host}/sign-up?invite=${encodeURIComponent(token)}`;
}

/** `<input type="date">` value → ISO at the end of that local day, or `undefined` when blank. */
export function dateInputToIso(value: string): string | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day, 23, 59, 59, 999);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** ISO → `<input type="date">` value (local date), or `''` when absent. */
export function isoToDateInput(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
