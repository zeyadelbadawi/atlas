/**
 * "New support ticket".
 *
 * A subject and a description — the two fields `CreateSupportCaseDto`
 * actually accepts. No priority selector: `SupportCasePriority` exists in
 * the schema but the tenant-facing create contract does not take it, and
 * offering a control that silently does nothing would be worse than not
 * offering one.
 */
import { useState } from 'react';
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
import { useServerValidation } from '@forms';
import { buildPath, DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { useCreateSupportCase } from '../hooks';
import { SupportAttachmentField } from './SupportAttachmentField';
import type { SupportAttachmentInput } from '@types';

/** Mirrors the backend's `MAX_SUPPORT_SUBJECT_LENGTH`/`MAX_SUPPORT_DESCRIPTION_LENGTH`. */
const createSupportCaseSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(5000),
});

type CreateSupportCaseFormData = z.infer<typeof createSupportCaseSchema>;

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

  useServerValidation(form, createCase.error ?? null);

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
    const created = await createCase.mutateAsync({
      organizationId,
      // `attachment` is omitted entirely when none was chosen, rather than
      // sent as `undefined`/`null` — the DTO's `@IsOptional()` treats an
      // absent key as "no attachment", and the request stays the exact
      // shape a text-only ticket has always had.
      payload: attachment ? { ...values, attachment } : values,
    });
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
            </Label>
            <Input
              id="support-subject"
              data-testid="support-subject"
              placeholder={t('support:create.subjectPlaceholder')}
              {...form.register('subject')}
            />
            {form.formState.errors.subject ? (
              <p className="text-sm text-destructive">
                {t('support:create.subjectInvalid')}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-description">
              {t('support:create.descriptionLabel')}
            </Label>
            <Textarea
              id="support-description"
              data-testid="support-description"
              rows={6}
              placeholder={t('support:create.descriptionPlaceholder')}
              {...form.register('description')}
            />
            {form.formState.errors.description ? (
              <p className="text-sm text-destructive">
                {t('support:create.descriptionInvalid')}
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
          {createCase.error ? (
            <p className="text-sm text-destructive" data-testid="support-create-error">
              {t('support:create.failed')}
            </p>
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
