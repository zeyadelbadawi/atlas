/**
 * Member account fields — the email + name part of the Add Manager,
 * Add Instructor and Add Student dialogs (smart member invitation).
 *
 * As the email is typed, `useAcademyMemberLookup` (debounced) says whether
 * the person is already in this academy — the one case the dialog can
 * stop early (they cannot be added twice). It never says whether the
 * address has an Atlas account (ATO F5), so the name is always asked for
 * and always required: the server uses it only to invite a brand-new
 * account, and someone who already uses Atlas keeps their own name. The
 * lookup is only a hint: when it cannot answer (error, rate limit), the
 * plain form is shown and the server decides.
 */
import { useTranslation } from 'react-i18next';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { AlertCircle, Info, Loader2 } from 'lucide-react';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { MemberLookupState } from '../hooks/useAcademyMemberLookup';
import { MAX_MEMBER_NAME_LENGTH } from '../constants/academy.constants';
import { getAcademyMemberRoleLabelKey } from '../utils/academy-status.utils';
import type { AcademyMemberRole } from '@types';

interface MemberAccountFormValues extends FieldValues {
  email: string;
  name: string;
}

export interface MemberAccountFieldsProps<
  TValues extends MemberAccountFormValues,
> {
  readonly control: Control<TValues>;
  readonly lookup: MemberLookupState;
  /** i18n prefix of the dialog (`academy:members.addManager`, ...). */
  readonly copyPrefix: string;
  /** The role, as the "already here" callout words it (`academy:members.lookup.roles.*`). */
  readonly role: 'manager' | 'instructor' | 'student';
  readonly idPrefix: string;
  /**
   * B4 (UX audit) — the role the typed person ALREADY has in this academy,
   * when the team list on screen knows it. The lookup only answers
   * "already here" (ATO F5), so without this the callout named the
   * dialog's role ("already a manager" for an instructor).
   */
  readonly existingRole?: AcademyMemberRole;
}

/** Whether the lookup already knows the add cannot succeed (already in this academy). */
export function isBlockedByLookup(lookup: MemberLookupState): boolean {
  return lookup.state === 'already_member';
}

/**
 * The labels a server refusal names these fields by (`{{field}}`), for the
 * dialog's `useServerValidation`.
 */
export function memberAccountFieldLabels(
  copyPrefix: string
): Readonly<Record<string, string>> {
  return {
    email: `${copyPrefix}.emailLabel`,
    name: 'academy:members.newAccount.nameLabel',
  };
}

export function MemberAccountFields<TValues extends MemberAccountFormValues>({
  control,
  lookup,
  copyPrefix,
  role,
  idPrefix,
  existingRole,
}: MemberAccountFieldsProps<TValues>): JSX.Element {
  const { t } = useTranslation();
  const statusId = `${idPrefix}-lookup-status`;

  return (
    <>
      <FormField
        control={control}
        name={'email' as Path<TValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t(`${copyPrefix}.emailLabel`)}</FormLabel>
            <FormControl>
              <Input
                type="email"
                dir="ltr"
                autoComplete="off"
                autoFocus
                aria-describedby={statusId}
                placeholder={
                  role === 'student'
                    ? undefined
                    : t(`${copyPrefix}.emailPlaceholder`)
                }
                {...field}
                value={(field.value as string | undefined) ?? ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div id={statusId} aria-live="polite" className="min-h-0">
        <LookupCallout
          lookup={lookup}
          isStudent={role === 'student'}
          existingRole={existingRole}
        />
      </div>

      {isBlockedByLookup(lookup) ? null : (
        <FormField
          control={control}
          name={'name' as Path<TValues>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('academy:members.newAccount.nameLabel')}</FormLabel>
              <FormControl>
                <Input
                  autoComplete="off"
                  aria-required="true"
                  maxLength={MAX_MEMBER_NAME_LENGTH}
                  {...field}
                  value={(field.value as string | undefined) ?? ''}
                />
              </FormControl>
              <FormDescription>
                {t('academy:members.newAccount.nameHelp')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}

/** "Already here" in words that are true: a student, or a team member with the role they really have. */
function alreadyMemberText(
  t: (key: string, values?: Record<string, string>) => string,
  isStudent: boolean,
  existingRole: AcademyMemberRole | undefined
): string {
  if (isStudent) return t('academy:members.lookup.alreadyStudent');
  return existingRole
    ? t('academy:members.lookup.alreadyOnTeamAs', {
        role: t(getAcademyMemberRoleLabelKey(existingRole)),
      })
    : t('academy:members.lookup.alreadyOnTeam');
}

function LookupCallout({
  lookup,
  isStudent,
  existingRole,
}: {
  readonly lookup: MemberLookupState;
  readonly isStudent: boolean;
  readonly existingRole?: AcademyMemberRole;
}): JSX.Element | null {
  const { t } = useTranslation();

  switch (lookup.state) {
    case 'checking':
      return (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          {t('academy:members.lookup.checking')}
        </p>
      );
    case 'new':
      return (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {t('academy:members.lookup.new')}
        </p>
      );
    case 'already_member':
      return (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-md bg-warning-surface p-3 text-sm"
        >
          <AlertCircle
            className="mt-0.5 size-4 shrink-0 text-warning"
            aria-hidden
          />
          <p className="text-foreground">
            {alreadyMemberText(t, isStudent, existingRole)}
          </p>
        </div>
      );
    case 'rate_limited':
      return (
        <p className="text-xs text-muted-foreground">
          {t('academy:members.lookup.rateLimited')}
        </p>
      );
    case 'error':
      return (
        <p className="text-xs text-muted-foreground">
          {t('academy:members.lookup.error')}
        </p>
      );
    default:
      return null;
  }
}
