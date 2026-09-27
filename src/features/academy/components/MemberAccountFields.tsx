/**
 * Member account fields — the email + name part of the Add Manager,
 * Add Instructor and Add Student dialogs (smart member invitation).
 *
 * As the email is typed, `useAcademyMemberLookup` (debounced) says whether
 * it belongs to an existing Atlas account. An existing account's real name
 * is shown read-only — it is theirs, and this dialog never changes it — with
 * a callout explaining what will happen; a new email keeps the editable
 * name that invites them. The lookup is only a hint: when it cannot answer
 * (error, rate limit), the plain form is shown and the server decides.
 */
import { useTranslation } from 'react-i18next';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { AlertCircle, Info, Loader2, UserCheck } from 'lucide-react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MemberLookupState } from '../hooks/useAcademyMemberLookup';

interface MemberAccountFormValues extends FieldValues {
  email: string;
  name?: string;
}

export interface MemberAccountFieldsProps<
  TValues extends MemberAccountFormValues,
> {
  readonly control: Control<TValues>;
  readonly lookup: MemberLookupState;
  /** i18n prefix of the dialog (`academy:members.addManager`, ...). */
  readonly copyPrefix: string;
  /** The role, as the callout words it (`academy:members.lookup.roles.*`). */
  readonly role: 'manager' | 'instructor' | 'student';
  readonly idPrefix: string;
}

/** Whether the lookup says this email is an account the dialog must not rename. */
export function isExistingAccount(lookup: MemberLookupState): boolean {
  return (
    lookup.state === 'existing' || lookup.state === 'existing_pending_setup'
  );
}

/** Whether the lookup already knows the add cannot succeed. */
export function isBlockedByLookup(lookup: MemberLookupState): boolean {
  return lookup.state === 'already_member' || lookup.state === 'unavailable';
}

export function MemberAccountFields<TValues extends MemberAccountFormValues>({
  control,
  lookup,
  copyPrefix,
  role,
  idPrefix,
}: MemberAccountFieldsProps<TValues>): JSX.Element {
  const { t } = useTranslation();
  const statusId = `${idPrefix}-lookup-status`;
  const roleLabel = t(`academy:members.lookup.roles.${role}`);

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
        <LookupCallout lookup={lookup} roleLabel={roleLabel} />
      </div>

      {isExistingAccount(lookup) ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-existing-name`}>
            {t('academy:members.newAccount.nameLabel')}
          </Label>
          <Input
            id={`${idPrefix}-existing-name`}
            value={'name' in lookup ? lookup.name : ''}
            readOnly
            aria-readonly="true"
            className="bg-muted text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">
            {t('academy:members.lookup.nameReadOnly')}
          </p>
        </div>
      ) : isBlockedByLookup(lookup) ? null : (
        <>
          {lookup.state === 'new' ? null : (
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {t('academy:members.newAccount.title')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('academy:members.newAccount.description')}
              </p>
            </div>
          )}
          <FormField
            control={control}
            name={'name' as Path<TValues>}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('academy:members.newAccount.nameLabel')}
                </FormLabel>
                <FormControl>
                  <Input
                    autoComplete="off"
                    {...field}
                    value={(field.value as string | undefined) ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </>
  );
}

function LookupCallout({
  lookup,
  roleLabel,
}: {
  readonly lookup: MemberLookupState;
  readonly roleLabel: string;
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
    case 'existing':
      return (
        <div className="flex items-start gap-3 rounded-md bg-info-surface p-3 text-sm">
          <UserCheck className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              {t('academy:members.lookup.existingTitle')}
            </p>
            <p className="text-muted-foreground">
              {t('academy:members.lookup.existingBody', { role: roleLabel })}
            </p>
          </div>
        </div>
      );
    case 'existing_pending_setup':
      return (
        <div className="flex items-start gap-3 rounded-md bg-info-surface p-3 text-sm">
          <UserCheck className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              {t('academy:members.lookup.pendingTitle')}
            </p>
            <p className="text-muted-foreground">
              {t('academy:members.lookup.pendingBody', { role: roleLabel })}
            </p>
          </div>
        </div>
      );
    case 'already_member':
    case 'unavailable':
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
            {lookup.state === 'already_member'
              ? t('academy:members.lookup.alreadyMember', { role: roleLabel })
              : t('academy:members.lookup.unavailable')}
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
