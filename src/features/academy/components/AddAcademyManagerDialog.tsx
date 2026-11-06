/**
 * Add Academy Manager Dialog.
 *
 * Grants Manager access to this academy (`AcademyService.addAcademyManager`)
 * — either to an already-registered Atlas user (who keeps their own name),
 * or to a brand-new account invited in the same action under the name
 * typed here. Email and name are always both asked for (ATO F5). Launch
 * Stabilization A2: nobody chooses a password for someone else — the
 * invitee sets their own through the emailed setup link.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApiError } from '@api';
import { isTranslatedString } from '@utils';
import { InlineFailureAlert } from './InlineFailureAlert';
import { useForm } from 'react-hook-form';
import { useDirtyGuard } from '@features/unsaved-changes';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { useToast } from '@app/providers/toast/useToast';
import { useServerValidation } from '@forms';
import { useAddAcademyManager } from '../hooks';
import { useAcademyMemberLookup } from '../hooks/useAcademyMemberLookup';
import { MemberAccountFields, isBlockedByLookup } from './MemberAccountFields';
import type { AcademyMember } from '@types';
import {
  existingTeamRole,
  memberAddSpecificKey,
  memberAddOutcomeKey,
  memberAddPayload,
} from '../utils/member-add.utils';
import {
  addAcademyManagerSchema,
  type AddAcademyManagerFormData,
} from '../schemas/academy.schemas';

export interface AddAcademyManagerDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly academyId: string;
  /** The team list on screen, so the "already here" callout names the person's real role. */
  readonly teamMembers?: readonly AcademyMember[];
}

const DEFAULT_VALUES: AddAcademyManagerFormData = {
  email: '',
  name: '',
};

export function AddAcademyManagerDialog({
  open,
  onOpenChange,
  academyId,
  teamMembers,
}: AddAcademyManagerDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { notifySuccess } = useToast();
  const addManager = useAddAcademyManager();

  const [failure, setFailure] = useState<ApiError | null>(null);

  const form = useForm<AddAcademyManagerFormData>({
    resolver: zodResolver(addAcademyManagerSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const dirtyGuard = useDirtyGuard(form.formState.isDirty);
  const lookup = useAcademyMemberLookup(
    academyId,
    'manager',
    form.watch('email'),
    open
  );

  // Maps a `validation` (400) mutation error's per-field violations onto
  // this form — e.g. the backend's `@MinLength(2)` on `name` versus this
  // schema's client-side check having no minimum at all, previously
  // surfaced only as a generic "Couldn't create this manager" toast.
  useServerValidation(form, addManager.error);

  // Unsaved-changes protection for a MODAL. Closing a dialog is not a
  // navigation, so the route blocker never sees the X button, an outside
  // click or Escape — they are intercepted here instead. Opening is
  // never guarded; only closing can lose work.
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) return onOpenChange(true);
    void dirtyGuard.requestClose(() => {
      form.reset(DEFAULT_VALUES);
      setFailure(null);
      onOpenChange(false);
    });
  };

  const onSubmit = (data: AddAcademyManagerFormData) => {
    setFailure(null);
    addManager.mutate(
      { academyId, payload: memberAddPayload(data) },
      {
        onSuccess: (result) => {
          notifySuccess(memberAddOutcomeKey(result.outcome));
          // B0-IAM-04 — the add succeeded, so nothing is unsaved: close
          // directly. Going through the dirty guard here asked "Leave
          // without saving?" after every successful add (the form still
          // held the typed address).
          form.reset(DEFAULT_VALUES);
          onOpenChange(false);
        },
        onError: (error) => {
          // Field violations are shown on their fields (useServerValidation);
          // anything else is ONE message inside the dialog, with the real
          // reason (B4 V09/V26) — no toast under the overlay.
          if (
            error.kind === 'validation' &&
            error.violations &&
            error.violations.length > 0
          ) {
            return;
          }
          setFailure(error);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('academy:members.addManager.title')}</DialogTitle>
          <DialogDescription>
            {t('academy:members.addManager.description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <MemberAccountFields
              control={form.control}
              lookup={lookup}
              copyPrefix="academy:members.addManager"
              role="manager"
              existingRole={existingTeamRole(teamMembers, form.watch('email'))}
              idPrefix="add-manager"
            />

            {failure ? (
              <InlineFailureAlert
                error={failure}
                titleKey="academy:members.addManager.errors.failedTitle"
                specificKey={memberAddSpecificKey(
                  failure,
                  'academy:members.addManager',
                  (key) => isTranslatedString(i18n, key)
                )}
              />
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={addManager.isPending}
              >
                {t('academy:members.addManager.cancelButton')}
              </Button>
              <Button
                type="submit"
                disabled={
                  addManager.isPending ||
                  lookup.state === 'checking' ||
                  isBlockedByLookup(lookup)
                }
              >
                {addManager.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t('academy:members.addManager.submitButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
