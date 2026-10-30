/**
 * B2 — "Email founders": a subject and body in each language, to the
 * selected founding academies or to every active one. Two steps: compose,
 * then a review that shows how many owners will receive it (counted by
 * the server), who they are, and today's remaining email budget; sending
 * requires that confirmed count, so the audience cannot silently grow.
 * Programme messages only — the copy says so; every send is audited.
 */
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Loader2, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@app/providers';
import { useLanguage } from '@hooks';
import { formatNumber, toErrorsNamespaceKey } from '@utils';
import {
  usePreviewFoundingEmail,
  useSendFoundingEmail,
} from '../hooks/usePlatformFounding';
import type {
  FoundingEmailAudience,
  FoundingEmailPreview,
} from '../services/PlatformFoundingService';
import { FOUNDING_K } from '../utils/founding.utils';

const K = FOUNDING_K;
const SUBJECT_MAX = 150;
const BODY_MAX = 5000;

export interface FoundingEmailDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Memberships selected in the table (active ones only are sent to). */
  readonly selectedIds: readonly string[];
  readonly onSent?: () => void;
}

export function FoundingEmailDialog({
  open,
  onOpenChange,
  selectedIds,
  onSent,
}: FoundingEmailDialogProps): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { notifySuccess, notifyError } = useToast();
  const id = useId();
  const preview = usePreviewFoundingEmail();
  const send = useSendFoundingEmail();

  const [audience, setAudience] = useState<FoundingEmailAudience>('all_active');
  const [subjectEn, setSubjectEn] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [subjectAr, setSubjectAr] = useState('');
  const [bodyAr, setBodyAr] = useState('');
  const [review, setReview] = useState<FoundingEmailPreview | null>(null);

  useEffect(() => {
    if (open) {
      setAudience(selectedIds.length > 0 ? 'selected' : 'all_active');
      return;
    }
    setReview(null);
    setSubjectEn('');
    setBodyEn('');
    setSubjectAr('');
    setBodyAr('');
  }, [open, selectedIds.length]);

  const complete = [subjectEn, bodyEn, subjectAr, bodyAr].every(
    (v) => v.trim().length > 0
  );
  const audiencePayload = {
    audience,
    ...(audience === 'selected' ? { membershipIds: selectedIds } : {}),
  };
  const busy = preview.isPending || send.isPending;
  const n = (value: number) => formatNumber(value, language);

  const goToReview = () => {
    preview.mutate(audiencePayload, {
      onSuccess: setReview,
      onError: (error) =>
        notifyError(
          `${K}.toasts.failed`,
          toErrorsNamespaceKey(error.messageKey)
        ),
    });
  };

  const confirmSend = () => {
    if (!review) return;
    send.mutate(
      {
        ...audiencePayload,
        subjectEn: subjectEn.trim(),
        bodyEn: bodyEn.trim(),
        subjectAr: subjectAr.trim(),
        bodyAr: bodyAr.trim(),
        confirmRecipientCount: review.recipientCount,
      },
      {
        onSuccess: (result) => {
          notifySuccess(`${K}.toasts.emailed`, undefined, {
            formatted: n(result.queued),
            count: result.queued,
          });
          onSent?.();
          onOpenChange(false);
        },
        onError: (error) => {
          notifyError(
            `${K}.toasts.failed`,
            toErrorsNamespaceKey(error.messageKey)
          );
          if (error.status === 409) setReview(null);
        },
      }
    );
  };

  const overBudget = review?.quota
    ? review.recipientCount > review.quota.remainingToday
    : false;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="text-start">
          <DialogTitle>
            {t(review ? `${K}.email.reviewTitle` : `${K}.email.title`)}
          </DialogTitle>
          <DialogDescription>{t(`${K}.email.description`)}</DialogDescription>
        </DialogHeader>

        {review ? (
          <div className="space-y-4" aria-live="polite">
            <p
              className="text-sm font-medium text-foreground"
              data-testid="founding-email-count"
            >
              {t(`${K}.email.recipientCount`, {
                count: review.recipientCount,
                formatted: n(review.recipientCount),
              })}
            </p>
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-3 text-sm">
              {review.recipients.map((recipient) => (
                <li
                  key={recipient.membershipId}
                  className="flex justify-between gap-3"
                >
                  <span className="min-w-0 truncate" dir="auto">
                    {recipient.organizationName}
                  </span>
                  <span className="shrink-0 text-muted-foreground" dir="auto">
                    {recipient.ownerName}
                  </span>
                </li>
              ))}
            </ul>
            {review.quota ? (
              <p className="text-sm text-muted-foreground">
                {t(`${K}.email.budget`, {
                  remaining: n(review.quota.remainingToday),
                  limit: n(review.quota.dailyLimit),
                })}
              </p>
            ) : null}
            {overBudget ? (
              <Alert>
                <AlertDescription>
                  {t(`${K}.email.overBudget`)}
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-3 rounded-md bg-muted/40 p-3 text-sm sm:grid-cols-2">
              <div>
                <p className="font-medium text-foreground">{subjectEn}</p>
                <p className="mt-1 line-clamp-4 whitespace-pre-line text-muted-foreground">
                  {bodyEn}
                </p>
              </div>
              <div dir="rtl" lang="ar">
                <p className="font-medium text-foreground">{subjectAr}</p>
                <p className="mt-1 line-clamp-4 whitespace-pre-line text-muted-foreground">
                  {bodyAr}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form
            id={`${id}-form`}
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (complete && !busy) goToReview();
            }}
          >
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-foreground">
                {t(`${K}.email.audience`)}
              </legend>
              <RadioGroup
                value={audience}
                onValueChange={(value) =>
                  setAudience(value as FoundingEmailAudience)
                }
                className="space-y-1"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    id={`${id}-selected`}
                    value="selected"
                    disabled={selectedIds.length === 0}
                  />
                  <Label htmlFor={`${id}-selected`} className="font-normal">
                    {t(`${K}.email.selected`, {
                      count: selectedIds.length,
                      formatted: n(selectedIds.length),
                    })}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id={`${id}-all`} value="all_active" />
                  <Label htmlFor={`${id}-all`} className="font-normal">
                    {t(`${K}.email.allActive`)}
                  </Label>
                </div>
              </RadioGroup>
            </fieldset>

            <div className="grid gap-5 md:grid-cols-2">
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-foreground">
                  {t(`${K}.email.english`)}
                </legend>
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-subject-en`}>
                    {t(`${K}.email.subject`)}
                  </Label>
                  <Input
                    id={`${id}-subject-en`}
                    value={subjectEn}
                    maxLength={SUBJECT_MAX}
                    onChange={(e) => setSubjectEn(e.target.value)}
                    dir="ltr"
                    lang="en"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-body-en`}>
                    {t(`${K}.email.body`)}
                  </Label>
                  <Textarea
                    id={`${id}-body-en`}
                    rows={7}
                    value={bodyEn}
                    maxLength={BODY_MAX}
                    onChange={(e) => setBodyEn(e.target.value)}
                    dir="ltr"
                    lang="en"
                  />
                </div>
              </fieldset>
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-foreground">
                  {t(`${K}.email.arabic`)}
                </legend>
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-subject-ar`}>
                    {t(`${K}.email.subject`)}
                  </Label>
                  <Input
                    id={`${id}-subject-ar`}
                    value={subjectAr}
                    maxLength={SUBJECT_MAX}
                    onChange={(e) => setSubjectAr(e.target.value)}
                    dir="rtl"
                    lang="ar"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-body-ar`}>
                    {t(`${K}.email.body`)}
                  </Label>
                  <Textarea
                    id={`${id}-body-ar`}
                    rows={7}
                    value={bodyAr}
                    maxLength={BODY_MAX}
                    onChange={(e) => setBodyAr(e.target.value)}
                    dir="rtl"
                    lang="ar"
                  />
                </div>
              </fieldset>
            </div>
            <p className="text-xs text-muted-foreground">
              {t(`${K}.email.hint`)}
            </p>
          </form>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {review ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReview(null)}
                disabled={busy}
              >
                <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
                {t(`${K}.email.back`)}
              </Button>
              <Button
                type="button"
                onClick={confirmSend}
                disabled={busy || review.recipientCount === 0}
              >
                {send.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="size-4 rtl:rotate-180" aria-hidden />
                )}
                {t(`${K}.email.send`, {
                  count: review.recipientCount,
                  formatted: n(review.recipientCount),
                })}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={busy}
              >
                {t(`${K}.cancel`)}
              </Button>
              <Button
                type="submit"
                form={`${id}-form`}
                disabled={!complete || busy}
              >
                {preview.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
                )}
                {t(`${K}.email.review`)}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
