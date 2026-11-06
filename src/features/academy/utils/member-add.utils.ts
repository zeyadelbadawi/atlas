/**
 * Smart member invitation — what the Add Manager/Instructor/Student dialogs
 * share around the add call itself. The lookup only shapes the form; the
 * server re-resolves the email and decides.
 */
import type { ApiError } from '@api';
import { toErrorsNamespaceKey } from '@utils';
import { errorMessageKey } from '@services';
import type {
  AcademyMember,
  AcademyMemberAddOutcome,
  AcademyMemberRole,
} from '@types';

/**
 * The add request body. The name is always sent (ATO F5 — the dialog
 * cannot tell whether the address has an account, and the server requires
 * it); the server uses it only for a brand-new account, and an existing
 * account keeps its own name. The form schema has already required it.
 */
export function memberAddPayload(data: {
  readonly email: string;
  readonly name: string;
}): { readonly email: string; readonly name: string } {
  return { email: data.email.trim(), name: data.name.trim() };
}

/** Toast copy for what the add actually did. */
export function memberAddOutcomeKey(outcome: AcademyMemberAddOutcome): string {
  return `academy:members.outcome.${outcome}`;
}

/**
 * Error copy for a failed add. Backend keys first (they say exactly what
 * happened), then the error kind, then the dialog's generic fallback.
 */
export function memberAddErrorKey(
  error: Pick<ApiError, 'kind' | 'messageKey'>,
  copyPrefix: string
): string {
  switch (error.messageKey) {
    case 'errors.academy.accountUnavailable':
      return 'academy:members.lookup.unavailable';
    case 'errors.academy.studentBlocked':
      return 'academy:students.errors.studentBlocked';
    case 'errors.academy.nameRequiredForNewAccount':
      return 'academy:members.lookup.nameRequired';
    default:
      break;
  }
  switch (error.kind) {
    case 'notFound':
      return `${copyPrefix}.errors.userNotFound`;
    case 'conflict':
      return `${copyPrefix}.errors.alreadyMember`;
    case 'forbidden':
      return `${copyPrefix}.errors.insufficientRole`;
    default:
      return `${copyPrefix}.errors.generic`;
  }
}

/** Backend keys that only restate the failure kind — they say less than the dialog's own copy. */
const KIND_ONLY_KEYS: ReadonlySet<string> = new Set([
  'errors.conflict',
  'errors.notFound',
  'errors.forbidden',
  'errors.internal',
  'errors.generic',
]);

/**
 * B4 (UX audit) — the dialog's own copy for a failed add, only when it says
 * MORE than the real reason would: the backend's specific message
 * ("This person is already a member of this academy") is shown as-is
 * (`null` here), and the kind's copy ("No Atlas account exists for that
 * email address") replaces only a bare kind. A server error or a lost
 * connection is never covered by "Please try again" — `null`, so the real
 * reason shows.
 */
export function memberAddSpecificKey(
  error: Pick<ApiError, 'kind' | 'messageKey' | 'code'>,
  copyPrefix: string,
  exists: (key: string) => boolean
): string | null {
  if (
    error.code === 'ENTITLEMENT_LIMIT_REACHED' &&
    exists(`${copyPrefix}.errors.limitReached`)
  ) {
    return `${copyPrefix}.errors.limitReached`;
  }
  const kindOnly =
    KIND_ONLY_KEYS.has(error.messageKey) ||
    error.messageKey === errorMessageKey(error.kind);
  if (
    error.messageKey &&
    !kindOnly &&
    exists(toErrorsNamespaceKey(error.messageKey))
  ) {
    return null;
  }
  const key = memberAddErrorKey(error, copyPrefix);
  return key.endsWith('.errors.generic') ? null : key;
}

/**
 * The role of the team member with this email, from the team list the page
 * already shows (the owner can see it there anyway). `undefined` when the
 * list doesn't have them — the callout then names no role.
 */
export function existingTeamRole(
  members: readonly Pick<AcademyMember, 'email' | 'role' | 'status'>[] | undefined,
  email: string
): AcademyMemberRole | undefined {
  const typed = email.trim().toLowerCase();
  if (!typed || !members) return undefined;
  return members.find(
    (member) =>
      member.status !== 'inactive' && member.email.toLowerCase() === typed
  )?.role;
}
