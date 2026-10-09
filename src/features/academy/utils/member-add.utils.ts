/**
 * Smart member invitation — what the Add Manager/Instructor/Student dialogs
 * share around the add call itself. The lookup only shapes the form; the
 * server re-resolves the email and decides.
 */
import type { ApiError } from '@api';
import type { AcademyMemberAddOutcome } from '@types';

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
