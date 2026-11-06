/**
 * Section Form Dialog.
 *
 * Shared create/edit dialog for a course section.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useDirtyGuard } from '@features/unsaved-changes';
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
import { RequiredMark, SaveFailedAlert } from '@forms';
import { useDialogServerFeedback } from '../forms/course-form-feedback';
import { CharacterCount } from './CharacterCount';
import { MAX_SECTION_DESCRIPTION_LENGTH } from '../constants/course.constants';
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

const SECTION_FIELD_LABELS = {
  title: 'course:builder.sectionDialog.titleLabel',
  description: 'course:builder.sectionDialog.descriptionLabel',
} as const;

const EMPTY_SECTION_VALUES: CourseSectionFormData = {
  title: '',
  description: '',
};

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
    defaultValues: EMPTY_SECTION_VALUES,
  });

  // Unsaved-changes protection for a MODAL. The route blocker cannot see
  // this: closing a dialog is not a navigation, so the X button, an
  // outside click and Escape all need to be intercepted here instead.
  const dirtyGuard = useDirtyGuard(form.formState.isDirty);

  // See `LessonFormDialog.tsx`'s identical fix for the exact bug this
  // avoids — this dialog stays mounted across opens, so a reactive
  // `values:` option silently skips resetting whenever two consecutive
  // "Add Section" opens' fallback values are deep-equal (always true for
  // two create-mode opens), leaving the previous section's dirty field
  // state in place for the next one.
  useEffect(() => {
    if (!open) return;
    form.reset(defaultValues ?? EMPTY_SECTION_VALUES);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultValues]);

  // B3 — violations on their fields (labelled), anything else one alert
  // in the dialog (V05): the dialog stays open with the typed text.
  const failure = useDialogServerFeedback(form, error, SECTION_FIELD_LABELS);
  const descriptionLength = (form.watch('description') ?? '').length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Opening is never guarded; only closing can lose work.
        if (next) return onOpenChange(true);
        void dirtyGuard.requestClose(() => onOpenChange(false));
      }}
    >
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
            noValidate
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('course:builder.sectionDialog.titleLabel')}
                    <RequiredMark />
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
                  <CharacterCount
                    id="section-description-count"
                    length={descriptionLength}
                    max={MAX_SECTION_DESCRIPTION_LENGTH}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {failure ? (
              <SaveFailedAlert
                error={failure}
                titleKey="common:form.notSaved"
                onRetry={() => void form.handleSubmit(onSubmit)()}
              />
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void dirtyGuard.requestClose(() => onOpenChange(false))
                }
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
