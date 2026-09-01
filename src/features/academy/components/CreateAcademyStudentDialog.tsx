/**
 * Create Academy Student Dialog.
 *
 * Creates a brand-new Atlas account for a test/real student
 * (`AcademyService.createAcademyStudent`). Unlike Manager/Instructor,
 * there is nothing to "grant" an existing user — a student is never an
 * academy/organization membership in this codebase (see
 * `CreateAcademyStudentPayload`'s doc comment) — so this dialog always
 * creates a fresh account and surfaces the credentials once, since there
 * is no invitation/email system to deliver them otherwise.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@app/providers/toast/useToast';
import { useServerValidation } from '@forms';
import { useCreateAcademyStudent } from '../hooks';
import {
  createAcademyStudentSchema,
  type CreateAcademyStudentFormData,
} from '../schemas/academy.schemas';

export interface CreateAcademyStudentDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly academyId: string;
}

const DEFAULT_VALUES: CreateAcademyStudentFormData = { name: '', email: '', password: '' };

export function CreateAcademyStudentDialog({
  open,
  onOpenChange,
  academyId,
}: CreateAcademyStudentDialogProps): JSX.Element {
  const { t } = useTranslation();
  const { notifyError } = useToast();
  const createStudent = useCreateAcademyStudent();
  // Shown once, in-dialog, after a successful create — there is no
  // invitation/email system to deliver these credentials any other way,
  // and the password is never retrievable again after this dialog closes.
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const form = useForm<CreateAcademyStudentFormData>({
    resolver: zodResolver(createAcademyStudentSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useServerValidation(form, createStudent.error);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset(DEFAULT_VALUES);
      setCreated(null);
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = (data: CreateAcademyStudentFormData) => {
    createStudent.mutate(
      { academyId, payload: data },
      {
        onSuccess: () => {
          setCreated({ email: data.email, password: data.password });
        },
        onError: (error) => {
          if (error.kind === 'validation' && error.violations && error.violations.length > 0) {
            return;
          }

          const key =
            error.kind === 'conflict'
              ? 'academy:members.createStudent.errors.emailTaken'
              : error.kind === 'forbidden'
                ? 'academy:members.createStudent.errors.insufficientRole'
                : 'academy:members.createStudent.errors.generic';
          notifyError(key);
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
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">
                  {t('academy:members.createStudent.success')}
                </p>
                <p className="text-muted-foreground">
                  {t('academy:members.createStudent.credentialsHint')}
                </p>
              </div>
            </div>
            <div className="space-y-2 rounded-md border border-border p-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">
                  {t('academy:members.createStudent.emailLabel')}
                </span>
                <span className="font-medium" dir="ltr">{created.email}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">
                  {t('academy:members.createStudent.passwordLabel')}
                </span>
                <span className="font-medium" dir="ltr">{created.password}</span>
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
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('academy:members.createStudent.nameLabel')}</FormLabel>
                    <FormControl>
                      <Input autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('academy:members.createStudent.emailLabel')}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
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
                    <FormLabel>{t('academy:members.createStudent.passwordLabel')}</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
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
                <Button type="submit" disabled={createStudent.isPending}>
                  {createStudent.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {t('academy:members.createStudent.submitButton')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
