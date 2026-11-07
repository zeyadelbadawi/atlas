/**
 * Add Academy Instructor Dialog.
 *
 * Grants Instructor access to this academy
 * (`AcademyService.addAcademyInstructor`) — either to an already-registered
 * Atlas user (who keeps their own name), or to a brand-new account invited
 * in the same action (email and name are always both asked for — ATO F5;
 * Launch Stabilization A2 — the invitee sets their
 * own password through the emailed setup link). Mirrors
 * `AddAcademyManagerDialog` exactly; kept as a separate
 * component so the Manager flow (already verified end-to-end) is never at
 * risk from Instructor-specific changes.
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
import { useAddAcademyInstructor } from '../hooks';
import { useAcademyMemberLookup } from '../hooks/useAcademyMemberLookup';
import {
  MemberAccountFields,
  memberAccountFieldLabels,
  isBlockedByLookup,
} from './MemberAccountFields';
import type { AcademyMember } from '@types';
import {
  existingTeamRole,
  memberAddSpecificKey,
  memberAddOutcomeKey,
  memberAddPayload,
} from '../utils/member-add.utils';
import {
  addAcademyInstructorSchema,
  type AddAcademyInstructorFormData,
} from '../schemas/academy.schemas';

export interface AddAcademyInstructorDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly academyId: string;
  /** The team list on screen, so the "already here" callout names the person's real role. */
  readonly teamMembers?: readonly AcademyMember[];
}

const DEFAULT_VALUES: AddAcademyInstructorFormData = {
  email: '',
  name: '',
};

export function AddAcademyInstructorDialog({
  open,
  onOpenChange,
  academyId,
  teamMembers,
}: AddAcademyInstructorDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { notifySuccess } = useToast();
  const addInstructor = useAddAcademyInstructor();

  const [failure, setFailure] = useState<ApiError | null>(null);

  const form = useForm<AddAcademyInstructorFormData>({
    resolver: zodResolver(addAcademyInstructorSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const dirtyGuard = useDirtyGuard(form.formState.isDirty);
  const lookup = useAcademyMemberLookup(
    academyId,
    'instructor',
    form.watch('email'),
    open
  );

  useServerValidation(form, addInstructor.error, {
    labels: memberAccountFieldLabels('academy:members.addInstructor'),
  });

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

  const onSubmit = (data: AddAcademyInstructorFormData) => {
    setFailure(null);
    addInstructor.mutate(
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
          <DialogTitle>{t('academy:members.addInstructor.title')}</DialogTitle>
          <DialogDescription>
            {t('academy:members.addInstructor.description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <MemberAccountFields
              control={form.control}
              lookup={lookup}
              copyPrefix="academy:members.addInstructor"
              role="instructor"
              existingRole={existingTeamRole(teamMembers, form.watch('email'))}
              idPrefix="add-instructor"
            />

            {failure ? (
              <InlineFailureAlert
                error={failure}
                titleKey="academy:members.addInstructor.errors.failedTitle"
                specificKey={memberAddSpecificKey(
                  failure,
                  'academy:members.addInstructor',
                  (key) => isTranslatedString(i18n, key)
                )}
              />
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={addInstructor.isPending}
              >
                {t('academy:members.addInstructor.cancelButton')}
              </Button>
              <Button
                type="submit"
                disabled={
                  addInstructor.isPending ||
                  lookup.state === 'checking' ||
                  isBlockedByLookup(lookup)
                }
              >
                {addInstructor.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t('academy:members.addInstructor.submitButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
