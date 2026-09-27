/**
 * Smart member invitation — what the Add Manager/Instructor/Student dialogs
 * share around the add call itself. The lookup only shapes the form; the
 * server re-resolves the email and decides.
 */
import type { ApiError } from '@api';
import type { AcademyMemberAddOutcome } from '@types';
import type { MemberLookupState } from '../hooks/useAcademyMemberLookup';

/**
 * The add request body. An existing account's name is theirs — it is never
 * sent, so a stale value typed before the lookup answered cannot reach the
 * server (which ignores it for an existing account anyway).
 */
export function memberAddPayload(
  data: { readonly email: string; readonly name?: string },
  lookup: MemberLookupState
): { readonly email: string; readonly name?: string } {
  const existing =
    lookup.state === 'existing' || lookup.state === 'existing_pending_setup';
  const name = data.name?.trim();
  return {
    email: data.email.trim(),
    name: existing || !name ? undefined : name,
  };
}

/** A new account is invited by name: required once the lookup knows it is new. */
export function isNameMissingForNewAccount(
  data: { readonly name?: string },
  lookup: MemberLookupState
): boolean {
  return lookup.state === 'new' && !data.name?.trim();
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
