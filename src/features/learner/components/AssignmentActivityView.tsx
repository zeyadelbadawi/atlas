/**
 * An assignment inside the player shell (P64 Phase 3 §E.4, S12).
 *
 * Facts first (due date, what happens when late, whether resubmission
 * is allowed), then the draft. The draft AUTOSAVES — a debounced PUT
 * that the status line reports as "Draft saved" — so a closed tab loses
 * nothing, and Submit is the one deliberate action. After submission the
 * same screen shows a three-step timeline (Submitted → Being graded →
 * Graded), the submitted text, the attachment as a short-lived signed
 * link, and the grade and feedback once a reviewer has entered them.
 *
 * THE ATTACHMENT IS PROTECTED. The upload answers with an asset id; the
 * submit references that id; the file is read only through a signed
 * link minted for this learner. There is no public URL anywhere here.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Loader2,
  Paperclip,
  Send,
  Upload,
  X,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { useConfirmDialog } from '@app/providers';
import { useDateFormatter, useFilePicker } from '@hooks';
import { apiErrorMessage, cn, formatNumber } from '@utils';
import type {
  AssignmentSubmission,
  CourseSequenceItem,
  LanguageCode,
} from '@types';
import {
  ALLOWED_ASSIGNMENT_ATTACHMENT_TYPES,
  MAX_ASSIGNMENT_ATTACHMENT_FILE_SIZE,
  MAX_ASSIGNMENT_RESPONSE_LENGTH,
  getSubmissionStatusTone,
  useAssignment,
  useAssignmentSubmission,
  useSaveAssignmentDraft,
  useSubmitAssignment,
  useUploadSubmissionAttachment,
} from '@features/learning';
import { readErrorKind } from '../utils/read-error-kind';
import { AUTOSAVE_DEBOUNCE_MS } from '../utils/quiz-attempt.utils';
import { ActivityLockCard } from './ActivityLockCard';

export interface AssignmentActivityViewProps {
  readonly courseId: string;
  readonly item: CourseSequenceItem;
  readonly onContinue?: () => void;
}

type DraftState = 'idle' | 'dirty' | 'saving' | 'saved' | 'failed';

interface PendingAttachment {
  readonly assetId: string;
  readonly fileName: string;
  readonly sizeBytes: number;
}

function formatBytes(bytes: number, language: LanguageCode): string {
  if (bytes >= 1024 * 1024) {
    return `${formatNumber(Math.round((bytes / (1024 * 1024)) * 10) / 10, language)} MB`;
  }
  return `${formatNumber(Math.max(1, Math.round(bytes / 1024)), language)} KB`;
}

function timelineStep(
  submission: AssignmentSubmission | null | undefined
): 0 | 1 | 2 | 3 {
  if (!submission || submission.status !== 'submitted') return 0;
  if (submission.gradingStatus === 'graded') return 3;
  return 2;
}

export function AssignmentActivityView({
  courseId,
  item,
  onContinue,
}: AssignmentActivityViewProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const fmt = useDateFormatter();
  const { confirm } = useConfirmDialog();
  const assignmentId = item.id;

  const assignmentQuery = useAssignment(courseId, assignmentId);
  const submissionQuery = useAssignmentSubmission(courseId, assignmentId);
  const saveDraft = useSaveAssignmentDraft(courseId, assignmentId);
  const submit = useSubmitAssignment(courseId, assignmentId);
  const upload = useUploadSubmissionAttachment();

  const submission = submissionQuery.data ?? null;
  const assignment = assignmentQuery.data;

  const [response, setResponse] = useState('');
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [draftState, setDraftState] = useState<DraftState>('idle');
  const [editing, setEditing] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | undefined>();
  const debounceRef = useRef<number | null>(null);
  const seededRef = useRef<string | null>(null);

  // Seed the form from the draft (or the submitted text when resubmitting) once per submission row.
  useEffect(() => {
    const seedKey = `${assignmentId}:${submission?.id ?? 'none'}:${submission?.draftSavedAt ?? ''}`;
    if (seededRef.current === seedKey) return;
    seededRef.current = seedKey;
    const draft = submission?.draftResponse;
    setResponse(
      draft ??
        (submission?.status === 'submitted' ? '' : (submission?.response ?? ''))
    );
    setAttachment(
      submission?.attachment && submission.status !== 'submitted'
        ? {
            assetId: submission.attachment.assetId,
            fileName: submission.attachment.fileName,
            sizeBytes: submission.attachment.sizeBytes,
          }
        : null
    );
    setDraftState(draft ? 'saved' : 'idle');
  }, [assignmentId, submission]);

  const scheduleDraft = useCallback(
    (nextResponse: string, nextAttachment: PendingAttachment | null) => {
      setDraftState('dirty');
      if (debounceRef.current !== null)
        window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = null;
        setDraftState('saving');
        saveDraft
          .mutateAsync({
            response: nextResponse,
            attachmentAssetId: nextAttachment?.assetId ?? null,
          })
          .then(() => setDraftState('saved'))
          .catch(() => setDraftState('failed'));
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [saveDraft]
  );

  useEffect(
    () => () => {
      if (debounceRef.current !== null)
        window.clearTimeout(debounceRef.current);
    },
    []
  );

  /* ---------- attachment ---------- */

  const filePicker = useFilePicker({
    accept: ALLOWED_ASSIGNMENT_ATTACHMENT_TYPES.join(','),
  });

  useEffect(() => {
    const file = filePicker.files?.[0];
    if (!file) return;
    setAttachmentError(undefined);
    if (file.size > MAX_ASSIGNMENT_ATTACHMENT_FILE_SIZE) {
      setAttachmentError(t('learning:assignment.attachmentTooLarge'));
      filePicker.clearFiles();
      return;
    }
    if (!ALLOWED_ASSIGNMENT_ATTACHMENT_TYPES.includes(file.type)) {
      setAttachmentError(t('learning:assignment.attachmentInvalidType'));
      filePicker.clearFiles();
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const uploaded = await upload.mutateAsync({
          courseId,
          assignmentId,
          payload: {
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            dataUrl: reader.result as string,
          },
        });
        const next = {
          assetId: uploaded.assetId,
          fileName: uploaded.fileName,
          sizeBytes: uploaded.sizeBytes,
        };
        setAttachment(next);
        scheduleDraft(response, next);
      } catch (error) {
        setAttachmentError(
          apiErrorMessage(t, i18n, error, {
            fallbackKey: 'learning:assignment.attachmentUploadError',
          })
        );
      } finally {
        filePicker.clearFiles();
      }
    };
    reader.readAsDataURL(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePicker.files]);

  /* ---------- submit ---------- */

  const isSubmitted = submission?.status === 'submitted';
  const canResubmit = isSubmitted && !!assignment?.allowResubmission;
  const showForm = !isSubmitted || (canResubmit && editing);
  const dueAt = assignment?.dueAt ? Date.parse(assignment.dueAt) : null;
  const pastDue = dueAt !== null && Date.now() > dueAt;
  const blockedByDue = pastDue && assignment?.latePolicy === 'block';

  const handleSubmit = async () => {
    setSubmitError(undefined);
    const hasContent = response.trim().length > 0 || !!attachment;
    if (!hasContent) {
      setSubmitError(t('errors:assignment.responseRequired'));
      return;
    }
    const confirmed = await confirm({
      titleKey: isSubmitted
        ? 'learning:assignment.confirm.resubmitTitle'
        : 'learning:assignment.confirm.submitTitle',
      descriptionKey: pastDue
        ? 'learning:assignment.confirm.lateDescription'
        : 'learning:assignment.confirm.description',
      confirmLabelKey: isSubmitted
        ? 'learning:assignment.resubmitAction'
        : 'learning:assignment.submitAction',
      cancelLabelKey: 'learning:assignment.confirm.cancel',
      intent: 'default',
    });
    if (!confirmed) return;
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    try {
      await submit.mutateAsync({
        response: response.trim() || undefined,
        attachmentAssetId: attachment?.assetId,
      });
      setEditing(false);
      setDraftState('idle');
    } catch (error) {
      setSubmitError(
        apiErrorMessage(t, i18n, error, {
          fallbackKey: 'learning:assignment.submitError',
        })
      );
    }
  };

  /* ---------- render ---------- */

  if (assignmentQuery.error) {
    return (
      <ErrorState
        kind={readErrorKind(assignmentQuery.error)}
        onRetry={() => void assignmentQuery.refetch()}
      />
    );
  }
  if (submissionQuery.error) {
    return (
      <ErrorState
        kind={readErrorKind(submissionQuery.error)}
        onRetry={() => void submissionQuery.refetch()}
      />
    );
  }
  if (!assignment || submissionQuery.isLoading) {
    return (
      <div className="space-y-4" role="status" aria-busy="true">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const step = timelineStep(submission);
  const isLocked = item.state === 'locked';

  const draftLabel =
    draftState === 'saving'
      ? t('learning:assignment.draft.saving')
      : draftState === 'saved'
        ? t('learning:assignment.draft.saved')
        : draftState === 'failed'
          ? t('learning:assignment.draft.failed')
          : draftState === 'dirty'
            ? t('learning:assignment.draft.unsaved')
            : '';

  return (
    <div className="space-y-4" data-testid="assignment-activity">
      {isLocked ? (
        <ActivityLockCard
          lockReason={item.lockReason}
          availableAt={item.availableAt}
        />
      ) : null}

      {/* Facts */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-display text-base font-semibold text-foreground">
          {t('learning:assignment.instructionsTitle')}
        </h2>
        <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
          {assignment.instructions ||
            assignment.description ||
            t('learning:assignment.noInstructions')}
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('learning:player.activity.due')}
            </dt>
            <dd className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <CalendarClock className="size-4" aria-hidden />
              {assignment.dueAt
                ? fmt.dateTime(assignment.dueAt)
                : t('learning:assignment.noDueDate')}
            </dd>
          </div>
          {assignment.dueAt ? (
            <div>
              <dt className="text-xs text-muted-foreground">
                {t('learning:assignment.latePolicy.label')}
              </dt>
              <dd className="text-sm font-medium text-foreground">
                {t(`learning:assignment.latePolicy.${assignment.latePolicy}`)}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('learning:assignment.resubmission.label')}
            </dt>
            <dd className="text-sm font-medium text-foreground">
              {assignment.allowResubmission
                ? t('learning:assignment.resubmission.allowed')
                : t('learning:assignment.resubmission.notAllowed')}
            </dd>
          </div>
        </dl>
      </div>

      {/* Timeline */}
      {submission ? (
        <ol
          className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
          aria-label={t('learning:assignment.timeline.label')}
        >
          {(['submitted', 'grading', 'graded'] as const).map((key, index) => {
            const number = index + 1;
            const done = step >= number;
            const current = step === number || (step === 0 && number === 1);
            const Icon = done ? CheckCircle2 : Circle;
            return (
              <li
                key={key}
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-1.5',
                  done ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                <Icon
                  className={cn('size-4', done && 'text-success')}
                  aria-hidden
                />
                {t(`learning:assignment.timeline.${key}`)}
              </li>
            );
          })}
        </ol>
      ) : null}

      {/* Submitted view */}
      {isSubmitted && !showForm ? (
        <div
          className="space-y-4 rounded-lg border border-border bg-card p-5"
          data-testid="assignment-submitted"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-sm font-semibold text-foreground">
              {t('learning:assignment.submitted.title')}
            </h3>
            <div className="flex items-center gap-2">
              {submission?.isLate ? (
                <StatusBadge
                  labelKey="learning:assignment.submitted.late"
                  tone="warning"
                />
              ) : null}
              <StatusBadge
                labelKey={`learning:assignment.status.${submission?.status ?? 'submitted'}`}
                tone={getSubmissionStatusTone(
                  submission?.status ?? 'submitted'
                )}
              />
            </div>
          </div>
          {submission?.submittedAt ? (
            <p className="text-xs text-muted-foreground">
              {t('learning:assignment.submitted.at', {
                date: fmt.dateTime(submission.submittedAt),
              })}
            </p>
          ) : null}
          {submission?.response ? (
            <p className="whitespace-pre-line text-sm text-foreground">
              {submission.response}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('learning:assignment.submitted.noText')}
            </p>
          )}
          {submission?.attachment ? (
            <p className="text-sm">
              <a
                href={submission.attachment.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
              >
                <Paperclip className="size-4" aria-hidden />
                {submission.attachment.fileName}
              </a>
              <span className="ms-2 text-xs text-muted-foreground">
                {formatBytes(submission.attachment.sizeBytes, language)} ·{' '}
                {t('learning:assignment.submitted.linkExpires', {
                  time: fmt.dateTime(submission.attachment.expiresAt),
                })}
              </span>
            </p>
          ) : submission?.attachmentUrl ? (
            <p className="text-sm">
              <a
                href={submission.attachmentUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
              >
                <Paperclip className="size-4" aria-hidden />
                {t('learning:assignment.submitted.attachment')}
              </a>
            </p>
          ) : null}

          {submission?.grade ? (
            <div
              className="rounded-md border border-success/30 bg-success-surface p-4"
              data-testid="assignment-grade"
            >
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CheckCircle2 className="size-4 text-success" aria-hidden />
                {typeof submission.grade.score === 'number'
                  ? t('learning:assignment.grade.score', {
                      score: formatNumber(submission.grade.score, language),
                    })
                  : t('learning:assignment.grade.gradedNoScore')}
              </p>
              {submission.grade.feedback ? (
                <p className="mt-2 whitespace-pre-line text-sm text-foreground">
                  <span className="font-medium">
                    {t('learning:assignment.grade.feedback')}:
                  </span>{' '}
                  {submission.grade.feedback}
                </p>
              ) : null}
              {submission.grade.gradedAt ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('learning:assignment.grade.at', {
                    date: fmt.dateTime(submission.grade.gradedAt),
                  })}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4" aria-hidden />
              {t('learning:assignment.submitted.awaitingGrading')}
            </p>
          )}

          <div className="flex flex-wrap gap-3 border-t border-border pt-4">
            {onContinue ? (
              <Button onClick={onContinue}>
                {t('learning:quiz.results.continue')}
              </Button>
            ) : null}
            {canResubmit && !blockedByDue ? (
              <Button variant="outline" onClick={() => setEditing(true)}>
                {t('learning:assignment.resubmitAction')}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Draft form */}
      {showForm && !isLocked ? (
        blockedByDue ? (
          <Alert data-testid="assignment-blocked">
            <Clock className="size-4" aria-hidden />
            <AlertTitle>{t('learning:assignment.pastDue.title')}</AlertTitle>
            <AlertDescription>
              {t('errors:assignment.pastDue')}
            </AlertDescription>
          </Alert>
        ) : (
          <div
            className="space-y-4 rounded-lg border border-border bg-card p-5"
            data-testid="assignment-form"
          >
            {pastDue ? (
              <Alert>
                <Clock className="size-4" aria-hidden />
                <AlertTitle>
                  {t('learning:assignment.pastDue.title')}
                </AlertTitle>
                <AlertDescription>
                  {t('learning:assignment.pastDue.acceptFlagged')}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="assignment-response">
                  {t('learning:assignment.responseLabel')}
                </Label>
                <span
                  role="status"
                  aria-live="polite"
                  className={cn(
                    'text-xs',
                    draftState === 'failed'
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  )}
                >
                  {draftLabel}
                </span>
              </div>
              <Textarea
                id="assignment-response"
                rows={8}
                value={response}
                maxLength={MAX_ASSIGNMENT_RESPONSE_LENGTH}
                placeholder={t('learning:assignment.responsePlaceholder')}
                onChange={(event) => {
                  setResponse(event.target.value);
                  scheduleDraft(event.target.value, attachment);
                }}
              />
              <p className="text-end text-xs tabular-nums text-muted-foreground">
                {formatNumber(response.length, language)} /{' '}
                {formatNumber(MAX_ASSIGNMENT_RESPONSE_LENGTH, language)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t('learning:assignment.attachmentLabel')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('learning:assignment.attachmentHelp')}
              </p>
              {attachment ? (
                <p className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                  <FileText className="size-4" aria-hidden />
                  <span>{attachment.fileName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatBytes(attachment.sizeBytes, language)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAttachment(null);
                      scheduleDraft(response, null);
                    }}
                    aria-label={t('learning:assignment.removeAttachment')}
                  >
                    <X className="size-4" aria-hidden />
                    {t('learning:assignment.removeAttachment')}
                  </Button>
                </p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={upload.isPending}
                onClick={filePicker.openFilePicker}
              >
                {upload.isPending ? (
                  <Loader2
                    className="size-4 animate-spin motion-reduce:animate-none"
                    aria-hidden
                  />
                ) : (
                  <Upload className="size-4" aria-hidden />
                )}
                {upload.isPending
                  ? t('learning:assignment.uploadingAttachment')
                  : attachment
                    ? t('learning:assignment.changeAttachment')
                    : t('learning:assignment.uploadAttachment')}
              </Button>
              {attachmentError ? (
                <p role="alert" className="text-sm text-destructive">
                  {attachmentError}
                </p>
              ) : null}
            </div>

            {submitError ? (
              <p role="alert" className="text-sm text-destructive">
                {submitError}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <Button
                onClick={() => void handleSubmit()}
                disabled={submit.isPending || upload.isPending}
                data-testid="assignment-submit"
              >
                {submit.isPending ? (
                  <Loader2
                    className="size-4 animate-spin motion-reduce:animate-none"
                    aria-hidden
                  />
                ) : (
                  <Send className="size-4" aria-hidden />
                )}
                {isSubmitted
                  ? t('learning:assignment.resubmitAction')
                  : t('learning:assignment.submitAction')}
              </Button>
              {isSubmitted ? (
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  {t('learning:assignment.confirm.cancel')}
                </Button>
              ) : null}
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
