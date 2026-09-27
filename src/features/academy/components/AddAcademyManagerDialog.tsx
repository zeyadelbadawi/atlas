/**
 * Add Academy Manager Dialog.
 *
 * Grants Manager access to this academy (`AcademyService.addAcademyManager`)
 * — either to an already-registered Atlas user (email alone), or to a
 * brand-new account invited in the same action (email + name). Launch
 * Stabilization A2: nobody chooses a password for someone else — the
 * invitee sets their own through the emailed setup link.
 */
import { useTranslation } from 'react-i18next';
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
import {
  isNameMissingForNewAccount,
  memberAddErrorKey,
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
}

const DEFAULT_VALUES: AddAcademyManagerFormData = {
  email: '',
  name: '',
};

export function AddAcademyManagerDialog({
  open,
  onOpenChange,
  academyId,
}: AddAcademyManagerDialogProps): JSX.Element {
  const { t } = useTranslation();
  const { notifySuccess, notifyError } = useToast();
  const addManager = useAddAcademyManager();

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
      onOpenChange(false);
    });
  };

  const onSubmit = (data: AddAcademyManagerFormData) => {
    if (isNameMissingForNewAccount(data, lookup)) {
      form.setError('name', { message: 'validation:required' });
      return;
    }
    addManager.mutate(
      { academyId, payload: memberAddPayload(data, lookup) },
      {
        onSuccess: (result) => {
          notifySuccess(memberAddOutcomeKey(result.outcome));
          handleOpenChange(false);
        },
        onError: (error) => {
          // A validation error with real field violations is shown
          // inline, on the field that actually needs fixing, via
          // `useServerValidation` above — a generic toast on top of that
          // would just repeat "something's wrong" without saying what,
          // exactly the UX gap this fixes. Every other kind (network/
          // timeout/server/notFound/conflict/forbidden/an edge-case
          // validation error with no mappable field) still gets a toast.
          if (
            error.kind === 'validation' &&
            error.violations &&
            error.violations.length > 0
          ) {
            return;
          }

          notifyError(memberAddErrorKey(error, 'academy:members.addManager'));
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
              idPrefix="add-manager"
            />

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
