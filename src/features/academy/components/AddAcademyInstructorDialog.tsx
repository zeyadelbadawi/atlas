/**
 * Add Academy Instructor Dialog.
 *
 * Grants Instructor access to this academy
 * (`AcademyService.addAcademyInstructor`) — either to an already-registered
 * Atlas user (email alone), or to a brand-new account created in the same
 * action (email + name + password; there is no invitation system in
 * Atlas). Mirrors `AddAcademyManagerDialog` exactly; kept as a separate
 * component so the Manager flow (already verified end-to-end) is never at
 * risk from Instructor-specific changes.
 */
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@app/providers/toast/useToast';
import { useAddAcademyInstructor } from '../hooks';
import {
  addAcademyInstructorSchema,
  type AddAcademyInstructorFormData,
} from '../schemas/academy.schemas';

export interface AddAcademyInstructorDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly academyId: string;
}

const DEFAULT_VALUES: AddAcademyInstructorFormData = { email: '', name: '', password: '' };

export function AddAcademyInstructorDialog({
  open,
  onOpenChange,
  academyId,
}: AddAcademyInstructorDialogProps): JSX.Element {
  const { t } = useTranslation();
  const { notifySuccess, notifyError } = useToast();
  const addInstructor = useAddAcademyInstructor();

  const form = useForm<AddAcademyInstructorFormData>({
    resolver: zodResolver(addAcademyInstructorSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset(DEFAULT_VALUES);
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = (data: AddAcademyInstructorFormData) => {
    addInstructor.mutate(
      {
        academyId,
        payload: {
          email: data.email,
          name: data.name || undefined,
          password: data.password || undefined,
        },
      },
      {
        onSuccess: () => {
          notifySuccess('academy:members.addInstructor.success');
          handleOpenChange(false);
        },
        onError: (error) => {
          const key =
            error.kind === 'notFound'
              ? 'academy:members.addInstructor.errors.userNotFound'
              : error.kind === 'conflict'
                ? 'academy:members.addInstructor.errors.alreadyMember'
                : error.kind === 'forbidden'
                  ? 'academy:members.addInstructor.errors.insufficientRole'
                  : 'academy:members.addInstructor.errors.generic';
          notifyError(key);
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
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('academy:members.addInstructor.emailLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t(
                        'academy:members.addInstructor.emailPlaceholder'
                      )}
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {t('academy:members.newAccount.title')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('academy:members.newAccount.description')}
              </p>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('academy:members.newAccount.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('academy:members.newAccount.passwordLabel')}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('academy:members.newAccount.passwordHelp')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={addInstructor.isPending}
              >
                {t('academy:members.addInstructor.cancelButton')}
              </Button>
              <Button type="submit" disabled={addInstructor.isPending}>
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
