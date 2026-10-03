/**
 * Create Academy Student Dialog.
 *
 * Adds a learner to this academy (`AcademyService.createAcademyStudent`).
 * Smart member invitation: an email that already has an Atlas account is
 * added as-is (its name shown read-only, the person told by email); a new
 * email invites a new account.
 *
 * Launch Stabilization A2 — staff never choose, see or hand over a
 * student's password. A new account is created `invited`, and the student
 * receives an email with a link to set their own password; this dialog only
 * confirms what was sent.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useDirtyGuard } from '@features/unsaved-changes';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
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
import { nameConflictFromError, useNameConflictError, useServerValidation } from '@forms';
import { useCreateAcademyStudent } from '../hooks';
import { useAcademyMemberLookup } from '../hooks/useAcademyMemberLookup';
import { MemberAccountFields, isBlockedByLookup } from './MemberAccountFields';
import {
  isNameMissingForNewAccount,
  memberAddErrorKey,
  memberAddPayload,
} from '../utils/member-add.utils';
import type { AcademyMemberAddOutcome } from '@types';
import {
  createAcademyStudentSchema,
  type CreateAcademyStudentFormData,
} from '../schemas/academy.schemas';

export interface CreateAcademyStudentDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly academyId: string;
}

const DEFAULT_VALUES: CreateAcademyStudentFormData = {
  name: '',
  email: '',
};

export function CreateAcademyStudentDialog({
  open,
  onOpenChange,
  academyId,
}: CreateAcademyStudentDialogProps): JSX.Element {
  const { t } = useTranslation();
  const { notifyError } = useToast();
  const createStudent = useCreateAcademyStudent();
  // The address just added, and what the add did, shown as confirmation.
  const [created, setCreated] = useState<{
    email: string;
    outcome: AcademyMemberAddOutcome;
  } | null>(null);

  const form = useForm<CreateAcademyStudentFormData>({
    resolver: zodResolver(createAcademyStudentSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const dirtyGuard = useDirtyGuard(form.formState.isDirty);
  const lookup = useAcademyMemberLookup(
    academyId,
    'student',
    form.watch('email'),
    open && !created
  );

  useServerValidation(form, createStudent.error);
  // W4 — a learner name already used in this academy: on the name field for
  // a new account, on the email field for an existing account (whose name
  // staff cannot edit).
  useNameConflictError(form, createStudent.error);

  // Unsaved-changes protection for a MODAL. Closing a dialog is not a
  // navigation, so the route blocker never sees the X button, an outside
  // click or Escape — they are intercepted here instead. Opening is
  // never guarded; only closing can lose work.
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) return onOpenChange(true);
    void dirtyGuard.requestClose(() => {
      if (!nextOpen) {
        form.reset(DEFAULT_VALUES);
        setCreated(null);
      }
      onOpenChange(nextOpen);
    });
  };

  const onSubmit = (data: CreateAcademyStudentFormData) => {
    if (isNameMissingForNewAccount(data, lookup)) {
      form.setError('name', { message: 'validation:required' });
      return;
    }
    createStudent.mutate(
      { academyId, payload: memberAddPayload(data, lookup) },
      {
        onSuccess: (result) => {
          setCreated({ email: data.email.trim(), outcome: result.outcome });
        },
        onError: (error) => {
          if (
            error.kind === 'validation' &&
            error.violations &&
            error.violations.length > 0
          ) {
            return;
          }

          if (nameConflictFromError(error)) return;
          if (error.messageKey === 'errors.academy.nameRequiredForNewAccount') {
            form.setError('name', { message: 'validation:required' });
            return;
          }
          notifyError(
            memberAddErrorKey(error, 'academy:members.createStudent')
          );
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('academy:members.createStudent.title')}</DialogTitle>
          <DialogDescription>
            {t('academy:members.createStudent.description')}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md bg-success-surface p-3">
              <CheckCircle2
                className="mt-0.5 size-5 shrink-0 text-success"
                aria-hidden
              />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">
                  {t(
                    `academy:members.createStudent.outcome.${created.outcome}.title`
                  )}
                </p>
                <p className="text-muted-foreground">
                  {t(
                    `academy:members.createStudent.outcome.${created.outcome}.hint`
                  )}
                </p>
              </div>
            </div>
            <div className="space-y-2 rounded-md border border-border p-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">
                  {t('academy:members.createStudent.emailLabel')}
                </span>
                <span className="font-medium" dir="ltr">
                  {created.email}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                {t('academy:members.createStudent.doneButton')}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <MemberAccountFields
                control={form.control}
                lookup={lookup}
                copyPrefix="academy:members.createStudent"
                role="student"
                idPrefix="add-student"
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={createStudent.isPending}
                >
                  {t('academy:members.createStudent.cancelButton')}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createStudent.isPending ||
                    lookup.state === 'checking' ||
                    isBlockedByLookup(lookup)
                  }
                >
                  {createStudent.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {lookup.state === 'existing'
                    ? t('academy:members.createStudent.addButton')
                    : t('academy:members.createStudent.submitButton')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
