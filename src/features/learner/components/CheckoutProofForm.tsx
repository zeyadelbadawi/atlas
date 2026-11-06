/**
 * B7 (UX audit) — the proof step of a course checkout, on the same rules as
 * the tenant proof form (`PaymentProofForm`, B5):
 *
 * - The file is REQUIRED and marked so; what is accepted (PNG, JPG or PDF,
 *   up to 10 MB) is said before choosing, through the app's own file
 *   button — never the browser's native input, whose text stays in the
 *   browser's language ("Choose File · No file chosen" on an Arabic page).
 * - The transfer reference (120) and the note (500) have the server's own
 *   limits with counters; nothing is cut silently, a value past the limit
 *   is refused before sending.
 * - "Submit for review" is never greyed without a reason: pressed without a
 *   file, it says to choose one.
 * - A failed submit shows ONE message: a server refusal of the note, the
 *   reference or the file under that field; anything else one inline alert
 *   with the real reason (an expired order says so) and Try again.
 */
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Paperclip, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RequiredMark, SaveFailedAlert } from '@forms';
import { useErrorText, useFilePicker } from '@hooks';
import { cn, formatBytes } from '@utils';
import type { ApiError } from '@api';
import type { LanguageCode } from '@types';
import {
  ALLOWED_PAYMENT_PROOF_TYPES,
  MAX_PAYMENT_PROOF_FILE_SIZE,
  MAX_PAYMENT_PROOF_NOTE_LENGTH,
} from '@features/billing';

/** Mirrors the server's `MAX_PAYER_REFERENCE_LENGTH`. */
export const MAX_PAYER_REFERENCE_LENGTH = 120;

/** File-level refusals the server names without a field. */
const FILE_ERROR_KEYS = new Set([
  'errors.payment.unsupportedProofFileType',
  'errors.media.invalidDataUrl',
  'errors.media.fileTooLarge',
  'errors.media.unsupportedFileType',
]);
const FILE_FIELDS = new Set(['fileData', 'fileName']);

export type CheckoutProofTarget = 'note' | 'reference' | 'file' | 'alert';

/** Where a failed submit's message belongs. */
export function checkoutProofFailureTarget(
  error: Pick<ApiError, 'messageKey' | 'violations'>
): CheckoutProofTarget {
  const fields = new Set(error.violations?.map((v) => v.field) ?? []);
  if (fields.has('note')) return 'note';
  if (fields.has('payerReference')) return 'reference';
  if (
    [...fields].some((field) => FILE_FIELDS.has(field)) ||
    (error.messageKey !== undefined && FILE_ERROR_KEYS.has(error.messageKey))
  ) {
    return 'file';
  }
  return 'alert';
}

export interface CheckoutProofValues {
  readonly file: File;
  readonly note?: string;
  readonly payerReference?: string;
}

export interface CheckoutProofFormProps {
  readonly isPending: boolean;
  /** The last failed submit, shown here only. */
  readonly error: ApiError | null;
  readonly onSubmit: (values: CheckoutProofValues) => void;
}

export function CheckoutProofForm({
  isPending,
  error,
  onSubmit,
}: CheckoutProofFormProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const errorText = useErrorText();
  const ids = useId();
  const fileHintId = `${ids}-file-hint`;
  const fileErrorId = `${ids}-file-error`;
  const referenceId = `${ids}-reference`;
  const referenceHelpId = `${ids}-reference-help`;
  const referenceCountId = `${ids}-reference-count`;
  const referenceErrorId = `${ids}-reference-error`;
  const noteId = `${ids}-note`;
  const noteCountId = `${ids}-note-count`;
  const noteErrorId = `${ids}-note-error`;

  const [note, setNote] = useState('');
  const [reference, setReference] = useState('');
  const [fileError, setFileError] = useState<string>();
  const [noteError, setNoteError] = useState<string>();
  const [referenceError, setReferenceError] = useState<string>();
  const filePicker = useFilePicker({
    accept: ALLOWED_PAYMENT_PROOF_TYPES.join(','),
  });
  const [file, setFile] = useState<File | null>(null);

  const size = formatBytes(
    MAX_PAYMENT_PROOF_FILE_SIZE,
    i18n.language as LanguageCode
  );
  const maxSize = `${size.value} ${t(size.unitKey)}`;
  const noteLabel = t('course:checkout.proofNoteText');
  const referenceLabel = t('course:checkout.referenceText');

  // Checked the moment it is chosen, with the same limits the server uses.
  useEffect(() => {
    const chosen = filePicker.files?.[0];
    if (!chosen) return;
    filePicker.clearFiles();
    if (!ALLOWED_PAYMENT_PROOF_TYPES.includes(chosen.type)) {
      setFileError(t('payments:payment.proofInvalidType'));
      return;
    }
    if (chosen.size > MAX_PAYMENT_PROOF_FILE_SIZE) {
      setFileError(t('errors:media.fileTooLargeWithLimit', { max: maxSize }));
      return;
    }
    setFileError(undefined);
    setFile(chosen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePicker.files]);

  // A server refusal lands on its field; anything else is the one alert.
  const target = error ? checkoutProofFailureTarget(error) : null;
  useEffect(() => {
    if (!error || !target || target === 'alert') return;
    if (target === 'note' || target === 'reference') {
      const field = target === 'note' ? 'note' : 'payerReference';
      const violation = error.violations?.find((v) => v.field === field);
      const message = errorText(violation?.messageKey, 'validation:maxLength', {
        field: target === 'note' ? noteLabel : referenceLabel,
        count:
          target === 'note'
            ? MAX_PAYMENT_PROOF_NOTE_LENGTH
            : MAX_PAYER_REFERENCE_LENGTH,
        ...(violation?.values ?? {}),
      });
      if (target === 'note') setNoteError(message);
      else setReferenceError(message);
      return;
    }
    const violation = error.violations?.find((v) => FILE_FIELDS.has(v.field));
    setFileError(
      errorText(
        violation?.messageKey ?? error.messageKey,
        'payments:payment.proofInvalidType'
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const noteTooLong = note.trim().length > MAX_PAYMENT_PROOF_NOTE_LENGTH;
  const referenceTooLong = reference.trim().length > MAX_PAYER_REFERENCE_LENGTH;

  const handleSubmit = () => {
    setFileError(undefined);
    setNoteError(undefined);
    setReferenceError(undefined);
    let blocked = false;
    if (!file) {
      setFileError(t('payments:payment.proofRequired', { max: maxSize }));
      blocked = true;
    }
    if (referenceTooLong) {
      setReferenceError(
        t('validation:maxLength', {
          field: referenceLabel,
          count: MAX_PAYER_REFERENCE_LENGTH,
        })
      );
      blocked = true;
    }
    if (noteTooLong) {
      setNoteError(
        t('validation:maxLength', {
          field: noteLabel,
          count: MAX_PAYMENT_PROOF_NOTE_LENGTH,
        })
      );
      blocked = true;
    }
    if (blocked || !file) return;
    onSubmit({
      file,
      note: note.trim() || undefined,
      payerReference: reference.trim() || undefined,
    });
  };

  const counterClass = (over: boolean) =>
    over
      ? 'text-xs font-medium tabular-nums text-destructive'
      : 'text-xs tabular-nums text-muted-foreground';

  return (
    <div className="space-y-4" data-testid="checkout-proof-form">
      <div className="space-y-1.5">
        <Label htmlFor={referenceId}>
          {referenceLabel}{' '}
          <span className="font-normal text-muted-foreground">
            ({t('common:form.optional')})
          </span>
        </Label>
        <Input
          id={referenceId}
          value={reference}
          onChange={(event) => {
            setReference(event.target.value);
            if (referenceError) setReferenceError(undefined);
          }}
          dir="ltr"
          data-ltr-content
          autoComplete="off"
          aria-invalid={referenceError || referenceTooLong ? true : undefined}
          aria-describedby={`${referenceHelpId} ${referenceCountId} ${referenceErrorId}`}
          data-testid="checkout-reference"
        />
        <p id={referenceHelpId} className="text-xs text-muted-foreground">
          {t('course:checkout.referenceHelp')}
        </p>
        <p
          id={referenceCountId}
          className={counterClass(referenceTooLong)}
          data-testid="checkout-reference-count"
        >
          {t('common:form.characterCount', {
            count: reference.trim().length,
            max: MAX_PAYER_REFERENCE_LENGTH,
          })}
        </p>
        {referenceError ? (
          <p
            id={referenceErrorId}
            role="alert"
            className="text-sm text-destructive"
            data-testid="checkout-reference-error"
          >
            {referenceError}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground" id={`${ids}-file`}>
          {t('course:checkout.proofFileLabel')}
          <RequiredMark />
        </p>
        <p id={fileHintId} className="text-xs text-muted-foreground">
          {t('payments:payment.proofRules', { max: maxSize })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={filePicker.openFilePicker}
            aria-labelledby={`${ids}-file ${ids}-file-button`}
            aria-describedby={`${fileHintId} ${fileErrorId}`}
            aria-invalid={fileError ? true : undefined}
            data-testid="checkout-proof-choose"
          >
            <Upload className="size-4" aria-hidden />
            <span id={`${ids}-file-button`}>
              {file
                ? t('course:checkout.changeFile')
                : t('payments:payment.chooseFile')}
            </span>
          </Button>
          {file ? (
            <span
              className="inline-flex min-w-0 items-center gap-1.5 text-sm text-foreground"
              data-testid="checkout-proof-file-name"
            >
              <Paperclip className="size-4 shrink-0" aria-hidden />
              <bdi dir="auto" className="truncate">
                {file.name}
              </bdi>
            </span>
          ) : null}
        </div>
        {fileError ? (
          <p
            id={fileErrorId}
            role="alert"
            className="text-sm text-destructive"
            data-testid="checkout-proof-file-error"
          >
            {fileError}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={noteId}>
          {noteLabel}{' '}
          <span className="font-normal text-muted-foreground">
            ({t('common:form.optional')})
          </span>
        </Label>
        <Textarea
          id={noteId}
          rows={3}
          dir="auto"
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            if (noteError) setNoteError(undefined);
          }}
          placeholder={t('course:checkout.proofNotePlaceholder')}
          aria-invalid={noteError || noteTooLong ? true : undefined}
          aria-describedby={`${noteCountId} ${noteErrorId}`}
          data-testid="checkout-proof-note"
        />
        <p
          id={noteCountId}
          className={counterClass(noteTooLong)}
          data-testid="checkout-proof-note-count"
        >
          {t('common:form.characterCount', {
            count: note.trim().length,
            max: MAX_PAYMENT_PROOF_NOTE_LENGTH,
          })}
        </p>
        {noteError ? (
          <p
            id={noteErrorId}
            role="alert"
            className="text-sm text-destructive"
            data-testid="checkout-proof-note-error"
          >
            {noteError}
          </p>
        ) : null}
      </div>

      {error && target === 'alert' ? (
        <SaveFailedAlert
          error={error}
          titleKey="payments:payment.proofNotSubmitted"
          onRetry={handleSubmit}
        />
      ) : null}

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className={cn('min-h-11 sm:min-h-9')}
        data-testid="checkout-submit-proof"
      >
        {isPending ? (
          <Loader2
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden
          />
        ) : (
          <Upload className="size-4" aria-hidden />
        )}
        {isPending
          ? t('payments:payment.submittingProof')
          : t('course:checkout.submitProof')}
      </Button>
    </div>
  );
}
