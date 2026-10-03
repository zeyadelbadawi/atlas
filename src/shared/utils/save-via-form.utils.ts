/**
 * Runs a react-hook-form's own validation and persistence for the
 * unsaved-changes dialog's "Save and leave" (`useUnsavedChanges`'s
 * `onSave`).
 *
 * Resolves true only when the form validated AND `persist` finished
 * without throwing or returning false. A validation failure resolves false (the form shows
 * its field errors and the dialog stays open); a throwing `persist` — a
 * failed request — resolves false too, so the dialog never navigates away
 * from work that was not saved.
 *
 * `persist` must save WITHOUT navigating: the dialog continues to the
 * destination the user picked.
 */
import type { FieldValues, UseFormReturn } from 'react-hook-form';

export function saveViaForm<TValues extends FieldValues>(
  form: Pick<UseFormReturn<TValues>, 'handleSubmit'>,
  persist: (values: TValues) => Promise<boolean | void>
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    void form.handleSubmit(
      async (values) => {
        try {
          // `false` is a failure the caller already reported (a toast).
          resolve((await persist(values)) !== false);
        } catch {
          resolve(false);
        }
      },
      () => resolve(false)
    )();
  });
}
