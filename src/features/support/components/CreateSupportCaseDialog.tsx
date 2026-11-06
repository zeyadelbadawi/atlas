/**
 * "New support ticket".
 *
 * A subject and a description — the two fields `CreateSupportCaseDto`
 * actually accepts. No priority selector: `SupportCasePriority` exists in
 * the schema but the tenant-facing create contract does not take it, and
 * offering a control that silently does nothing would be worse than not
 * offering one.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { useDirtyGuard } from '@features/unsaved-changes';
import {
  hasViolationOn,
  RequiredMark,
  SaveFailedAlert,
  useLabelledViolations,
  useServerValidation,
} from '@forms';
import type { ApiError } from '@api';
import { buildPath, DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { useCreateSupportCase } from '../hooks';
import { SupportAttachmentField } from './SupportAttachmentField';
import type { SupportAttachmentInput } from '@types';

/** Mirrors the backend's `MAX_SUPPORT_SUBJECT_LENGTH`/`MAX_SUPPORT_DESCRIPTION_LENGTH`. */
/** B1 — each limit says which side was crossed (the old copy said "at least" for both). */
const SUBJECT_MAX = 200;
const DESCRIPTION_MAX = 5000;
export const createSupportCaseSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(3, 'support:create.subjectInvalid')
    .max(SUBJECT_MAX, 'support:create.subjectTooLong'),
  description: z
    .string()
    .trim()
    .min(10, 'support:create.descriptionInvalid')
    .max(DESCRIPTION_MAX, 'support:create.descriptionTooLong'),
});

type CreateSupportCaseFormData = z.infer<typeof createSupportCaseSchema>;

const FIELD_LABELS = {
  subject: 'support:create.subjectLabel',
  description: 'support:create.descriptionLabel',
} as const;
const FIELD_LIMITS: Readonly<Record<string, number>> = {
  subject: SUBJECT_MAX,
  description: DESCRIPTION_MAX,
};

/**
 * B5 (UX audit) — a server length refusal that arrives without its number
 * read "Check this field"; the limit is known here, so it is filled in.
 */
export function withKnownLimits(error: ApiError | null): ApiError | null {
  if (!error?.violations?.length) return error;
  const violations = error.violations.map((violation) => {
    const limit = FIELD_LIMITS[violation.field];
    if (
      limit === undefined ||
      violation.values?.count !== undefined ||
      !/maxLength/i.test(violation.messageKey)
    ) {
      return violation;
    }
    return { ...violation, values: { ...violation.values, count: limit } };
  });
  return Object.assign(
    Object.create(Object.getPrototypeOf(error) as object) as ApiError,
    error,
    { violations }
  );
}

export interface CreateSupportCaseDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly organizationId: string | undefined;
}

export function CreateSupportCaseDialog({
  open,
  onOpenChange,
  organizationId,
}: CreateSupportCaseDialogProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createCase = useCreateSupportCase();

  const form = useForm<CreateSupportCaseFormData>({
    resolver: zodResolver(createSupportCaseSchema),
    defaultValues: { subject: '', description: '' },
  });
  const descriptionLength = form.watch('description')?.length ?? 0;
  const subjectLength = form.watch('subject')?.length ?? 0;

  /*
    P53 — the optional image lives in local state rather than in the form
    schema. It is not a validated text field: its real validation is the
    server's magic-byte check, and `SupportAttachmentField` already owns the
    picking/preview/clearing behaviour. Putting a base64 data URL through
    `react-hook-form` would also mean the dirty-state comparison and every
    re-render carry a multi-megabyte string.
  */
  const [attachment, setAttachment] = useState<SupportAttachmentInput>();

  // Losing a half-written support ticket to a stray outside click is
  // exactly the kind of small, avoidable frustration this guard exists
  // for. Closing a dialog is not a navigation, so the route blocker
  // never sees it.
  const dirtyGuard = useDirtyGuard(form.formState.isDirty);

  const limitedError = useMemo(
    () => withKnownLimits(createCase.error ?? null),
    [createCase.error]
  );
  const labelledError = useLabelledViolations(limitedError, FIELD_LABELS);
  useServerValidation(form, labelledError);
  const fieldFailure = hasViolationOn(labelledError, FIELD_LABELS);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) return onOpenChange(true);
    void dirtyGuard.requestClose(() => {
      form.reset({ subject: '', description: '' });
      setAttachment(undefined);
      onOpenChange(false);
    });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (!organizationId) return;
    let created;
    try {
      created = await createCase.mutateAsync({
        organizationId,
        // `attachment` is omitted entirely when none was chosen, rather than
        // sent as `undefined`/`null` — the DTO's `@IsOptional()` treats an
        // absent key as "no attachment", and the request stays the exact
        // shape a text-only ticket has always had.
        payload: attachment ? { ...values, attachment } : values,
      });
    } catch {
      // B5 (UX audit) — shown in the dialog (field or one alert); the
      // typed ticket stays.
      return;
    }
    // Reset BEFORE navigating: otherwise the form is still dirty when the
    // route changes and the unsaved-changes dialog fires on a ticket the
    // user just successfully filed.
    form.reset({ subject: '', description: '' });
    setAttachment(undefined);
    onOpenChange(false);
    navigate(buildPath(DASHBOARD_ROUTES.supportDetail, { caseId: created.id }));
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('support:create.title')}</DialogTitle>
          <DialogDescription>
            {t('support:create.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="support-subject">
              {t('support:create.subjectLabel')}
              <RequiredMark />
            </Label>
            <Input
              id="support-subject"
              data-testid="support-subject"
              placeholder={t('support:create.subjectPlaceholder')}
              aria-invalid={Boolean(form.formState.errors.subject)}
              aria-describedby="support-subject-count support-subject-error"
              {...form.register('subject')}
            />
            <p
              id="support-subject-count"
              data-testid="support-subject-count"
              className={
                subjectLength > SUBJECT_MAX
                  ? 'text-xs font-medium tabular-nums text-destructive'
                  : 'text-xs tabular-nums text-muted-foreground'
              }
            >
              {t('support:create.characterCount', {
                count: subjectLength,
                max: SUBJECT_MAX,
              })}
            </p>
            {form.formState.errors.subject ? (
              <p
                id="support-subject-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {t(
                  form.formState.errors.subject.message ??
                    'support:create.subjectInvalid',
                  {
                    count: SUBJECT_MAX,
                  }
                )}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-description">
              {t('support:create.descriptionLabel')}
              <RequiredMark />
            </Label>
            <Textarea
              id="support-description"
              data-testid="support-description"
              rows={6}
              placeholder={t('support:create.descriptionPlaceholder')}
              aria-invalid={Boolean(form.formState.errors.description)}
              aria-describedby="support-description-count support-description-error"
              {...form.register('description')}
            />
            <p
              id="support-description-count"
              className={
                descriptionLength > DESCRIPTION_MAX
                  ? 'text-xs font-medium text-destructive'
                  : 'text-xs text-muted-foreground'
              }
            >
              {t('support:create.characterCount', {
                count: descriptionLength,
                max: DESCRIPTION_MAX,
              })}
            </p>
            {form.formState.errors.description ? (
              <p
                id="support-description-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {t(
                  form.formState.errors.description.message ??
                    'support:create.descriptionInvalid',
                  { count: DESCRIPTION_MAX }
                )}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>{t('support:attachment.label')}</Label>
            <SupportAttachmentField
              value={attachment}
              onChange={setAttachment}
              disabled={createCase.isPending}
            />
          </div>

          {/* A server-side refusal (wrong real type, over the real ceiling)
              surfaces here rather than silently doing nothing. */}
          {/* B5 (UX audit) — a refusal about a field shows there; anything
              else (409, 500, a lost connection) is one alert with the real
              reason — never "check the details" for a server failure. */}
          {labelledError && !fieldFailure ? (
            <div data-testid="support-create-error">
              <SaveFailedAlert
                error={labelledError}
                titleKey="support:create.notSubmitted"
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={createCase.isPending}
              onClick={() => handleOpenChange(false)}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              type="submit"
              data-testid="submit-ticket"
              disabled={createCase.isPending || !organizationId}
            >
              {createCase.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {t('support:create.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
