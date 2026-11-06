/**
 * Shared "save this step" plumbing for the form steps (W6): PATCH only
 * the fields the author changed (so an untouched step writes nothing and
 * adds no `course.updated` audit entry), map validation errors onto the
 * fields, and register the form with the unsaved-changes guard — with
 * "Save and leave" reusing the same save.
 *
 * B3 (UX audit) — one message per failure:
 *   - V07: a server violation on a nested API field (`pricing.amount`)
 *     lands on the form field that edits it, and the step does not move
 *     on silently;
 *   - V12: the message names the field in the page's language;
 *   - V13: a taken web address shows on the slug field;
 *   - V05: anything else is ONE inline alert with the real reason
 *     (`saveFailure`, rendered by the step) — no toast on top of it, and
 *     the hook is marked inline so the app-wide reporter stays quiet.
 */
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { useUnsavedChanges } from '@hooks';
import { saveViaForm } from '@utils';
import {
  hasViolationOn,
  useFocusFirstViolation,
  useLabelledViolations,
  useServerValidation,
} from '@forms';
import type { ApiError } from '@api';
import type { UpdateCoursePayload } from '@types';
import { useUpdateCourse } from '../hooks';
import {
  COURSE_FIELD_ALIASES,
  COURSE_FIELD_LABELS,
  isSlugTakenError,
  useSlugTakenError,
  violationFields,
} from '../forms/course-form-feedback';

export interface UseStepSaveOptions<TValues extends FieldValues> {
  readonly academyId: string;
  readonly courseId: string;
  readonly form: UseFormReturn<TValues>;
  /** Builds the PATCH body from the values and which fields are dirty; return null when nothing changed. */
  readonly toPayload: (
    values: TValues,
    dirty: Partial<Record<keyof TValues, unknown>>
  ) => UpdateCoursePayload | null;
  /** The form fields this step renders — the ones a server violation may land on. */
  readonly fields: readonly (keyof TValues & string)[];
}

export function useStepSave<TValues extends FieldValues>({
  academyId,
  courseId,
  form,
  toPayload,
  fields,
}: UseStepSaveOptions<TValues>) {
  const update = useUpdateCourse(academyId);
  const error = (update.error ?? null) as ApiError | null;
  const knownFields = violationFields(fields);
  const aliases = COURSE_FIELD_ALIASES as unknown as Readonly<
    Record<string, Path<TValues>>
  >;

  const labelled = useLabelledViolations(error, COURSE_FIELD_LABELS);
  useServerValidation(form, labelled, aliases);
  useFocusFirstViolation(form, labelled, knownFields, COURSE_FIELD_ALIASES);
  const hasSlugField = (fields as readonly string[]).includes('slug');
  const slugOnField = useSlugTakenError(form, hasSlugField ? error : null);

  /** A failure no field of this step can show — one inline alert. */
  const saveFailure =
    error && !slugOnField && !hasViolationOn(error, knownFields) ? error : null;

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
    } catch {
      // Shown once: on its field, or in the step's `saveFailure` alert.
      return false;
    }
  };

  const { markSaved } = useUnsavedChanges({
    isDirty: form.formState.isDirty,
    onSave: () => saveViaForm(form, save),
  });

  return {
    save,
    markSaved,
    isSaving: update.isPending,
    saveFailure,
    isSlugTaken: isSlugTakenError(error),
  };
}
