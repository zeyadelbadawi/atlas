/**
 * Add Academy Manager Dialog.
 *
 * Grants Manager access to this academy (`AcademyService.addAcademyManager`)
 * — either to an already-registered Atlas user (email alone), or to a
 * brand-new account created in the same action (email + name + password;
 * there is no invitation system in Atlas — see `AddAcademyManagerPayload`'s
 * doc comment).
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
import { useAddAcademyManager } from '../hooks';
import {
  addAcademyManagerSchema,
  type AddAcademyManagerFormData,
} from '../schemas/academy.schemas';

export interface AddAcademyManagerDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly academyId: string;
}

const DEFAULT_VALUES: AddAcademyManagerFormData = { email: '', name: '', password: '' };

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

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset(DEFAULT_VALUES);
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = (data: AddAcademyManagerFormData) => {
    addManager.mutate(
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
          notifySuccess('academy:members.addManager.success');
          handleOpenChange(false);
        },
        onError: (error) => {
          // These three kinds have a specific, actionable copy; anything
          // else (network/timeout/server/...) falls back to the generic
          // "something went wrong" message the toast key below covers.
          const key =
            error.kind === 'notFound'
              ? 'academy:members.addManager.errors.userNotFound'
              : error.kind === 'conflict'
                ? 'academy:members.addManager.errors.alreadyMember'
                : error.kind === 'forbidden'
                  ? 'academy:members.addManager.errors.insufficientRole'
                  : 'academy:members.addManager.errors.generic';
          notifyError(key);
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
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('academy:members.addManager.emailLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t(
                        'academy:members.addManager.emailPlaceholder'
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
                disabled={addManager.isPending}
              >
                {t('academy:members.addManager.cancelButton')}
              </Button>
              <Button type="submit" disabled={addManager.isPending}>
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
