/**
 * useAcademyMemberLookup hook.
 *
 * Smart member invitation — the Add Manager/Instructor/Student dialogs'
 * debounced email check (`AcademyService.lookupAcademyMember`). Purely a UX
 * hint: the add call re-resolves the email server-side and never reads this
 * answer, so every failure here degrades to the plain "type a name to
 * invite" form rather than blocking the dialog.
 */
import { z } from 'zod';
import { useApiQuery, useAuth, useDebounce } from '@/shared/hooks';
import { academyKeys } from '@services/query';
import { normalizeUnknownError } from '@api';
import { academyService } from '../services/AcademyService';
import type {
  AcademyMemberLookupResult,
  AcademyMemberLookupRole,
} from '@types';

/** Long enough to skip every intermediate keystroke, short enough to feel live. */
export const MEMBER_LOOKUP_DEBOUNCE_MS = 400;

const emailSchema = z.string().email();

/**
 * Where the check is:
 *  - `idle`: nothing typed;
 *  - `invalid`: not an email address yet;
 *  - `checking`: waiting for the debounce or the answer;
 *  - one of the server's statuses;
 *  - `rate_limited` / `error`: no answer — the form falls back to its plain shape.
 */
export type MemberLookupState =
  | { readonly state: 'idle' }
  | { readonly state: 'invalid' }
  | { readonly state: 'checking' }
  | { readonly state: 'new' }
  | { readonly state: 'existing'; readonly name: string }
  | { readonly state: 'existing_pending_setup'; readonly name: string }
  | { readonly state: 'already_member' }
  | { readonly state: 'unavailable' }
  | { readonly state: 'rate_limited' }
  | { readonly state: 'error' };

/**
 * What the query resolves to: the server's answer, or why there is none.
 * A failed check is RETURNED rather than thrown, so the app-wide error toast
 * never fires for it — the dialog already explains it inline, and a rate
 * limit would otherwise toast once per email typed.
 */
type LookupAnswer =
  | AcademyMemberLookupResult
  | { readonly status: 'rate_limited' }
  | { readonly status: 'error' };

export function useAcademyMemberLookup(
  academyId: string,
  role: AcademyMemberLookupRole,
  email: string,
  enabled = true
): MemberLookupState {
  const { organization } = useAuth();
  const typed = email.trim().toLowerCase();
  const debounced = useDebounce(typed, MEMBER_LOOKUP_DEBOUNCE_MS);
  const valid = emailSchema.safeParse(debounced).success;

  const query = useApiQuery<LookupAnswer>({
    queryKey: academyKeys.memberLookup(
      organization?.id,
      academyId,
      role,
      debounced
    ),
    queryFn: async ({ signal }): Promise<LookupAnswer> => {
      try {
        return await academyService.lookupAcademyMember(
          academyId,
          debounced,
          role,
          { signal }
        );
      } catch (error) {
        // A superseded request is not an answer; let the query drop it.
        const normalized = normalizeUnknownError(error);
        if (normalized.kind === 'cancelled') throw error;
        return normalized.kind === 'rateLimited'
          ? { status: 'rate_limited' }
          : { status: 'error' };
      }
    },
    enabled: enabled && !!academyId && valid,
    // A refused or rate-limited check is not worth repeating: the form
    // still works without it.
    retry: false,
    staleTime: 30_000,
  });

  if (!typed) return { state: 'idle' };
  if (!emailSchema.safeParse(typed).success) return { state: 'invalid' };
  if (typed !== debounced || query.isPending) return { state: 'checking' };
  if (query.isError) return { state: 'error' };
  const result = query.data;
  switch (result.status) {
    case 'existing':
    case 'existing_pending_setup':
      return { state: result.status, name: result.name };
    default:
      return { state: result.status };
  }
}
