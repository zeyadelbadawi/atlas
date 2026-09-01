/**
 * Section Form Dialog.
 *
 * Shared create/edit dialog for a course section.
 */
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import { Textarea } from '@/components/ui/textarea';
import { useServerValidation } from '@forms';
import {
  courseSectionSchema,
  type CourseSectionFormData,
} from '../schemas/course.schemas';
import type { ApiError } from '@api';

export interface SectionFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly mode: 'create' | 'edit';
  readonly defaultValues?: CourseSectionFormData;
  readonly isPending: boolean;
  readonly onSubmit: (data: CourseSectionFormData) => void | Promise<void>;
  /** The create/update mutation's current error, so a validation (400) failure maps onto the field that caused it instead of only a page-level toast. */
  readonly error?: ApiError | null;
}

export function SectionFormDialog({
  open,
  onOpenChange,
  mode,
  defaultValues,
  isPending,
  onSubmit,
  error,
}: SectionFormDialogProps): JSX.Element {
  const { t } = useTranslation();

  const form = useForm<CourseSectionFormData>({
    resolver: zodResolver(courseSectionSchema),
    values: defaultValues ?? { title: '', description: '' },
  });

  useServerValidation(form, error ?? null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t(
              mode === 'create'
                ? 'course:builder.sectionDialog.createTitle'
                : 'course:builder.sectionDialog.editTitle'
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('course:builder.sectionDialog.titleLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(
                        'course:builder.sectionDialog.titlePlaceholder'
                      )}
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('course:builder.sectionDialog.descriptionLabel')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder={t(
                        'course:builder.sectionDialog.descriptionPlaceholder'
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {t('course:builder.sectionDialog.cancelButton')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t('course:builder.sectionDialog.saveButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
