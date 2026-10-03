/**
 * Shared "save this step" plumbing for the form steps (W6): PATCH only
 * the fields the author changed (so an untouched step writes nothing and
 * adds no `course.updated` audit entry), map validation errors onto the
 * fields, and register the form with the unsaved-changes guard — with
 * "Save and leave" reusing the same save.
 */
import { useTranslation } from 'react-i18next';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { useUnsavedChanges } from '@hooks';
import { saveViaForm } from '@utils';
import { useServerValidation } from '@forms';
import { toast } from '@/hooks/use-toast';
import { isApiError } from '@api';
import type { UpdateCoursePayload } from '@types';
import { useUpdateCourse } from '../hooks';

export interface UseStepSaveOptions<TValues extends FieldValues> {
  readonly academyId: string;
  readonly courseId: string;
  readonly form: UseFormReturn<TValues>;
  /** Builds the PATCH body from the values and which fields are dirty; return null when nothing changed. */
  readonly toPayload: (
    values: TValues,
    dirty: Partial<Record<keyof TValues, unknown>>
  ) => UpdateCoursePayload | null;
}

export function useStepSave<TValues extends FieldValues>({
  academyId,
  courseId,
  form,
  toPayload,
}: UseStepSaveOptions<TValues>) {
  const { t } = useTranslation();
  const update = useUpdateCourse(academyId);
  useServerValidation(form, update.error ?? null);

  const save = async (values: TValues): Promise<boolean> => {
    const payload = toPayload(
      values,
      form.formState.dirtyFields as Partial<Record<keyof TValues, unknown>>
    );
    if (!payload || Object.keys(payload).length === 0) return true;
    try {
      await update.mutateAsync({ courseId, payload });
      form.reset(values);
      return true;
    } catch (error) {
      if (
        isApiError(error) &&
        error.kind === 'validation' &&
        error.violations?.length
      ) {
        return false;
      }
      toast({
        title: t('course:wizard.saveError'),
        description: t('errors:generic.description'),
        variant: 'destructive',
      });
      return false;
    }
  };

  const { markSaved } = useUnsavedChanges({
    isDirty: form.formState.isDirty,
    onSave: () => saveViaForm(form, save),
  });

  return { save, markSaved, isSaving: update.isPending };
}
