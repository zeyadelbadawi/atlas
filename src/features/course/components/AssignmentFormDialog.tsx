/**
 * Assignment Form Dialog (Phase 4).
 *
 * Shared create/edit dialog for a course assignment — instructions,
 * due date, late policy, resubmission rules and whether the assignment
 * counts towards course completion (P64 Phase 3 §E.4, AD-11). Grading and
 * student submission remain
 * entirely on the student-facing `AssignmentPage`; this dialog only ever
 * touches the authoring surface (`assignmentService.createAssignment`/
 * `updateAssignment`).
 */
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useDirtyGuard } from '@features/unsaved-changes';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldHelp } from '@components/feedback';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RequiredMark, SaveFailedAlert } from '@forms';
import {
  assignmentAuthoringSchemaFor,
  MAX_ASSIGNMENT_DESCRIPTION_LENGTH,
  MAX_ASSIGNMENT_INSTRUCTIONS_LENGTH,
  type AssignmentAuthoringFormData,
} from '@features/learning';
import { useDialogServerFeedback } from '../forms/course-form-feedback';
import { CharacterCount } from './CharacterCount';
import type { ApiError } from '@api';
import type { Assignment } from '@types';

/**
 * Converts a stored UTC ISO timestamp to the local wall-clock value a
 * `datetime-local` input expects (`YYYY-MM-DDTHH:mm`). A plain
 * `isoString.slice(0, 16)` — the shortcut `InstructorAnnouncementsPage`
 * uses for its own `scheduledAt` field — reads the UTC clock digits
 * verbatim into a control that displays them as LOCAL time, silently
 * shifting the due date by the viewer's UTC offset every time the edit
 * dialog reopens. Fixed here (not in `InstructorAnnouncementsPage`, a
 * pre-existing, out-of-scope file this phase doesn't touch) since it's
 * this dialog's own new Phase 4 code.
 */
export function toDateTimeLocalValue(isoString: string): string {
  const date = new Date(isoString);
  const localOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - localOffsetMs).toISOString().slice(0, 16);
}

export interface AssignmentFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly mode: 'create' | 'edit';
  readonly assignment?: Assignment | null;
  readonly isPending: boolean;
  readonly onSubmit: (
    data: AssignmentAuthoringFormData
  ) => void | Promise<void>;
  /** The create/update mutation's current error, so a validation (400) failure maps onto the field that caused it instead of only a page-level toast. */
  readonly error?: ApiError | null;
}

const ASSIGNMENT_FIELD_LABELS = {
  title: 'course:assignmentAuthoring.dialog.titleLabel',
  description: 'course:assignmentAuthoring.dialog.descriptionLabel',
  instructions: 'course:assignmentAuthoring.dialog.instructionsLabel',
  status: 'course:assignmentAuthoring.dialog.statusLabel',
  dueAt: 'course:assignmentAuthoring.dialog.dueAtLabel',
  latePolicy: 'course:assignmentAuthoring.dialog.latePolicyLabel',
} as const;

const EMPTY_VALUES: AssignmentAuthoringFormData = {
  title: '',
  description: '',
  instructions: '',
  status: 'draft',
  dueAt: '',
  allowResubmission: false,
  // Today's behaviour: late work is accepted and marked, never rejected.
  latePolicy: 'accept_flagged',
  requiredForCompletion: false,
};

export function AssignmentFormDialog({
  open,
  onOpenChange,
  mode,
  assignment,
  isPending,
  onSubmit,
  error,
}: AssignmentFormDialogProps): JSX.Element {
  const { t } = useTranslation();

  // B3 (V21) — a new or changed due date must be in the future; the date
  // an assignment already has may stay in the past while it is edited.
  const initialDueAt = assignment?.dueAt
    ? toDateTimeLocalValue(assignment.dueAt)
    : undefined;
  const schema = useMemo(
    () => assignmentAuthoringSchemaFor(initialDueAt),
    [initialDueAt]
  );
  const form = useForm<AssignmentAuthoringFormData>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  // Unsaved-changes protection for a MODAL. The route blocker cannot see
  // this: closing a dialog is not a navigation, so the X button, an
  // outside click and Escape all need to be intercepted here instead.
  const dirtyGuard = useDirtyGuard(form.formState.isDirty);

  // B3 — violations on their fields (labelled), anything else one alert.
  const failure = useDialogServerFeedback(form, error, ASSIGNMENT_FIELD_LABELS);
  const descriptionLength = (form.watch('description') ?? '').length;
  const instructionsLength = (form.watch('instructions') ?? '').length;

  useEffect(() => {
    if (!open) return;
    form.reset(
      assignment
        ? {
            title: assignment.title,
            description: assignment.description ?? '',
            instructions: assignment.instructions ?? '',
            status: assignment.status,
            dueAt: assignment.dueAt
              ? toDateTimeLocalValue(assignment.dueAt)
              : '',
            allowResubmission: assignment.allowResubmission,
            latePolicy: assignment.latePolicy,
            requiredForCompletion: assignment.requiredForCompletion,
          }
        : EMPTY_VALUES
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, assignment]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Opening is never guarded; only closing can lose work.
        if (next) return onOpenChange(true);
        void dirtyGuard.requestClose(() => onOpenChange(false));
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t(
              mode === 'create'
                ? 'course:assignmentAuthoring.dialog.createTitle'
                : 'course:assignmentAuthoring.dialog.editTitle'
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
                    {t('course:assignmentAuthoring.dialog.titleLabel')}
                    <RequiredMark />
                  </FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
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
                    {t('course:assignmentAuthoring.dialog.descriptionLabel')}
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <CharacterCount
                    id="assignment-description-count"
                    length={descriptionLength}
                    max={MAX_ASSIGNMENT_DESCRIPTION_LENGTH}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('course:assignmentAuthoring.dialog.instructionsLabel')}
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} />
                  </FormControl>
                  <CharacterCount
                    id="assignment-instructions-count"
                    length={instructionsLength}
                    max={MAX_ASSIGNMENT_INSTRUCTIONS_LENGTH}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      {t('course:assignmentAuthoring.dialog.statusLabel')}
                      <FieldHelp contentKey="course:assignmentAuthoring.dialog.help.status" />
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">
                          {t('course:lessonStatus.draft')}
                        </SelectItem>
                        <SelectItem value="published">
                          {t('course:lessonStatus.published')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      {t('course:assignmentAuthoring.dialog.dueAtLabel')}
                      <FieldHelp contentKey="course:assignmentAuthoring.dialog.help.dueAt" />
                    </FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="allowResubmission"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>
                      {t(
                        'course:assignmentAuthoring.dialog.allowResubmissionLabel'
                      )}
                    </FormLabel>
                    <FormDescription>
                      {t(
                        'course:assignmentAuthoring.dialog.allowResubmissionDescription'
                      )}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label={t(
                        'course:assignmentAuthoring.dialog.allowResubmissionLabel'
                      )}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="latePolicy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    {t('course:assignmentAuthoring.dialog.latePolicyLabel')}
                    <FieldHelp contentKey="course:assignmentAuthoring.dialog.help.latePolicy" />
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="block">
                        {t(
                          'course:assignmentAuthoring.dialog.latePolicy.block'
                        )}
                      </SelectItem>
                      <SelectItem value="accept_flagged">
                        {t(
                          'course:assignmentAuthoring.dialog.latePolicy.accept_flagged'
                        )}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t(
                      field.value === 'block'
                        ? 'course:assignmentAuthoring.dialog.latePolicyDescription.block'
                        : 'course:assignmentAuthoring.dialog.latePolicyDescription.accept_flagged'
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requiredForCompletion"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>
                      {t(
                        'course:assignmentAuthoring.dialog.requiredForCompletionLabel'
                      )}
                    </FormLabel>
                    <FormDescription>
                      {t(
                        'course:assignmentAuthoring.dialog.requiredForCompletionDescription'
                      )}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label={t(
                        'course:assignmentAuthoring.dialog.requiredForCompletionLabel'
                      )}
                    />
                  </FormControl>
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
                {t('course:assignmentAuthoring.dialog.cancelButton')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t('course:assignmentAuthoring.dialog.saveButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
