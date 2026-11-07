/**
 * B5 (UX audit) — the proof-of-payment upload on a payment's page.
 *
 * - What is accepted is said BEFORE choosing: PNG, JPG or PDF, up to
 *   10 MB. A wrong file is refused at once naming what is allowed and
 *   the limit.
 * - The note has the server's own limit (`MAX_PAYMENT_PROOF_NOTE_LENGTH`,
 *   500) with a counter; nothing is cut silently.
 * - B8 (UX audit) — the transfer reference the bank or wallet shows
 *   ("payer reference", optional, 120 with a counter), like a course-order
 *   proof has: the Platform reviewer sees it and can search by it.
 * - "Submit for review" is never greyed without a reason: pressed without
 *   a file, it says to choose one.
 * - A failed submit shows ONE message: a server refusal of the note or
 *   the file under that field, anything else one inline alert with the
 *   real reason and Try again. The hook marks its errors inline, so no
 *   toast repeats it.
 */
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SaveFailedAlert } from '@forms';
import { useErrorText, useFilePicker } from '@hooks';
import { formatBytes } from '@utils';
import type { ApiError } from '@api';
import type { LanguageCode } from '@types';
import {
  ALLOWED_PAYMENT_PROOF_TYPES,
  MAX_PAYER_REFERENCE_LENGTH,
  MAX_PAYMENT_PROOF_FILE_SIZE,
  MAX_PAYMENT_PROOF_NOTE_LENGTH,
} from '../constants/billing.constants';

export interface PaymentProofFormProps {
  readonly isPending: boolean;
  /** The last failed submit, shown here only. */
  readonly error: ApiError | null;
  readonly onSubmit: (
    file: File,
    note: string | undefined,
    payerReference: string | undefined
  ) => void;
}

/** File-level refusals the server names without a field. */
const FILE_ERROR_KEYS = new Set([
  'errors.payment.unsupportedProofFileType',
  'errors.media.invalidDataUrl',
  'errors.media.fileTooLarge',
  'errors.media.unsupportedFileType',
]);
const FILE_FIELDS = new Set(['fileData', 'fileName']);

/** Where a failed submit's message belongs: the note, the reference, the file, or the alert. */
export function proofFailureTarget(
  error: Pick<ApiError, 'messageKey' | 'violations'>
): 'note' | 'reference' | 'file' | 'alert' {
  if (error.violations?.some((violation) => violation.field === 'note')) {
    return 'note';
  }
  if (
    error.violations?.some((violation) => violation.field === 'payerReference')
  ) {
    return 'reference';
  }
  if (
    error.violations?.some((violation) => FILE_FIELDS.has(violation.field)) ||
    (error.messageKey !== undefined && FILE_ERROR_KEYS.has(error.messageKey))
  ) {
    return 'file';
  }
  return 'alert';
}

export function PaymentProofForm({
  isPending,
  error,
  onSubmit,
}: PaymentProofFormProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const errorText = useErrorText();
  const ids = useId();
  const fileErrorId = `${ids}-file-error`;
  const fileHintId = `${ids}-file-hint`;
  const noteId = `${ids}-note`;
  const noteCountId = `${ids}-note-count`;
  const noteErrorId = `${ids}-note-error`;
  const referenceId = `${ids}-reference`;
  const referenceHelpId = `${ids}-reference-help`;
  const referenceCountId = `${ids}-reference-count`;
  const referenceErrorId = `${ids}-reference-error`;

  const [note, setNote] = useState('');
  const [reference, setReference] = useState('');
  const [fileError, setFileError] = useState<string>();
  const [noteError, setNoteError] = useState<string>();
  const [referenceError, setReferenceError] = useState<string>();
  const filePicker = useFilePicker({
    accept: ALLOWED_PAYMENT_PROOF_TYPES.join(','),
  });
  const proofFile = filePicker.files?.[0];

  const size = formatBytes(
    MAX_PAYMENT_PROOF_FILE_SIZE,
    i18n.language as LanguageCode
  );
  const maxSize = `${size.value} ${t(size.unitKey)}`;
  const noteLabel = t('payments:payment.proofNoteLabel');
  const referenceLabel = t('payments:payment.payerReferenceLabel');

  useEffect(() => {
    const file = filePicker.files?.[0];
    if (!file) return;
    if (!ALLOWED_PAYMENT_PROOF_TYPES.includes(file.type)) {
      setFileError(t('payments:payment.proofInvalidType'));
      filePicker.clearFiles();
      return;
    }
    if (file.size > MAX_PAYMENT_PROOF_FILE_SIZE) {
      setFileError(t('errors:media.fileTooLargeWithLimit', { max: maxSize }));
      filePicker.clearFiles();
      return;
    }
    setFileError(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePicker.files]);

  // A server refusal lands on its field; anything else is the one alert.
  const target = error ? proofFailureTarget(error) : null;
  useEffect(() => {
    if (!error || !target || target === 'alert') return;
    if (target === 'reference') {
      const violation = error.violations?.find(
        (v) => v.field === 'payerReference'
      );
      setReferenceError(
        errorText(violation?.messageKey, 'validation:maxLength', {
          field: referenceLabel,
          count: MAX_PAYER_REFERENCE_LENGTH,
          ...(violation?.values ?? {}),
        })
      );
      return;
    }
    if (target === 'note') {
      const violation = error.violations?.find((v) => v.field === 'note');
      setNoteError(
        errorText(violation?.messageKey, 'validation:maxLength', {
          field: noteLabel,
          count: MAX_PAYMENT_PROOF_NOTE_LENGTH,
          ...(violation?.values ?? {}),
        })
      );
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
    // A new attempt starts clean: the last refusal's field messages go,
    // and the checks below (or the next answer) say what is wrong now.
    setNoteError(undefined);
    setReferenceError(undefined);
    setFileError(undefined);
    let blocked = false;
    if (referenceTooLong) {
      setReferenceError(
        t('validation:maxLength', {
          field: referenceLabel,
          count: MAX_PAYER_REFERENCE_LENGTH,
        })
      );
      blocked = true;
    }
    if (!proofFile) {
      setFileError(t('payments:payment.proofRequired', { max: maxSize }));
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
    if (blocked || !proofFile) return;
    onSubmit(
      proofFile,
      note.trim() || undefined,
      reference.trim() || undefined
    );
  };

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <p className="text-sm font-medium text-foreground">
        {t('payments:payment.uploadProofTitle')}
      </p>
      <p id={fileHintId} className="text-sm text-muted-foreground">
        {t('payments:payment.proofRules', { max: maxSize })}
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={filePicker.openFilePicker}
        aria-describedby={`${fileHintId} ${fileErrorId}`}
        aria-invalid={fileError ? true : undefined}
        data-testid="payment-proof-choose"
      >
        <Upload className="size-4" strokeWidth={2} aria-hidden />
        {proofFile ? proofFile.name : t('payments:payment.chooseFile')}
      </Button>
      {fileError ? (
        <p
          id={fileErrorId}
          role="alert"
          className="text-sm text-destructive"
          data-testid="payment-proof-file-error"
        >
          {fileError}
        </p>
      ) : null}

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
          data-testid="payment-proof-reference"
        />
        <p id={referenceHelpId} className="text-xs text-muted-foreground">
          {t('payments:payment.payerReferenceHelp')}
        </p>
        <p
          id={referenceCountId}
          className={
            referenceTooLong
              ? 'text-xs font-medium tabular-nums text-destructive'
              : 'text-xs tabular-nums text-muted-foreground'
          }
          data-testid="payment-proof-reference-count"
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
            data-testid="payment-proof-reference-error"
          >
            {referenceError}
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
          dir="auto"
          placeholder={t('payments:payment.proofNotePlaceholder')}
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            if (noteError) setNoteError(undefined);
          }}
          rows={2}
          aria-invalid={noteError ? true : undefined}
          aria-describedby={`${noteCountId} ${noteErrorId}`}
          data-testid="payment-proof-note"
        />
        <p
          id={noteCountId}
          className={
            noteTooLong
              ? 'text-xs font-medium tabular-nums text-destructive'
              : 'text-xs tabular-nums text-muted-foreground'
          }
          data-testid="payment-proof-note-count"
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
            data-testid="payment-proof-note-error"
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
        data-testid="payment-proof-submit"
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t('payments:payment.submittingProof')}
          </>
        ) : (
          t('payments:payment.submitProof')
        )}
      </Button>
    </div>
  );
}
