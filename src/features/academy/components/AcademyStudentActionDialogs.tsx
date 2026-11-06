/**
 * Roster action dialogs (P64 Phase 1).
 *
 * Small, single-purpose dialogs opened from `AcademyStudentDrawer`. Each
 * one collects input and hands it back — the drawer owns the mutation —
 * and shows the result of a failed attempt itself (B4 UX audit): a refusal
 * about a field (a past expiry date, a too-long reason) under that field,
 * anything else as ONE inline message with the real reason. Nothing is
 * toasted under the open dialog.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDirtyGuard } from '@features/unsaved-changes';
// The feature barrel, not the hook's own module: reaching into another
// feature's internals is refused by `no-restricted-imports`.
import { useCourses } from '@features/course';
import type { ApiError } from '@api';
import type { RosterEnrollmentRevokeReason } from '@types';
import {
  dateInputToIso,
  getRosterSpecificKey,
  isExpiryInPastError,
  isoToDateInput,
  isPastDateInput,
  todayDateInput,
} from '../utils/academy-roster.utils';
import { InlineFailureAlert } from './InlineFailureAlert';
import { TextLengthCounter } from './TextLengthCounter';

interface BaseDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly isPending: boolean;
  /** The last failed attempt, shown inside the dialog (cleared when it opens). */
  readonly error?: ApiError | null;
}

/** Backend `BlockStudentDto.reason`: `@MaxLength(500)`. */
export const BLOCK_REASON_MAX_LENGTH = 500;

/** A server violation's message for one field, if the failure has one. */
function violationOn(
  error: ApiError | null | undefined,
  field: string
): boolean {
  return Boolean(error?.violations?.some((v) => v.field === field));
}

/* ------------------------------------------------------------------ */

export interface BlockStudentDialogProps extends BaseDialogProps {
  readonly studentName: string;
  readonly onConfirm: (reason?: string) => void;
}

export function BlockStudentDialog({
  open,
  onOpenChange,
  isPending,
  error,
  studentName,
  onConfirm,
}: BlockStudentDialogProps): JSX.Element {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [tooLong, setTooLong] = useState(false);
  const dirtyGuard = useDirtyGuard(open && reason.trim() !== '');

  useEffect(() => {
    if (!open) {
      setReason('');
      setTooLong(false);
    }
  }, [open]);

  const trimmed = reason.trim();
  const over = trimmed.length > BLOCK_REASON_MAX_LENGTH;
  const serverReason = violationOn(error, 'reason');
  const showTooLong = (tooLong && over) || serverReason;

  const handleConfirm = () => {
    if (over) {
      setTooLong(true);
      return;
    }
    onConfirm(trimmed || undefined);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) return onOpenChange(true);
    // While the request runs the dialog stays: its failure shows only here.
    if (isPending) return;
    void dirtyGuard.requestClose(() => onOpenChange(false));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('academy:students.block.title')}</DialogTitle>
          <DialogDescription>
            {t('academy:students.block.description', { name: studentName })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="block-reason">
            {t('academy:students.block.reasonLabel')}
          </Label>
          <Textarea
            id="block-reason"
            rows={3}
            dir="auto"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t('academy:students.block.reasonPlaceholder')}
            aria-invalid={showTooLong || undefined}
            aria-describedby="block-reason-count block-reason-error"
          />
          <TextLengthCounter
            id="block-reason-count"
            length={trimmed.length}
            max={BLOCK_REASON_MAX_LENGTH}
          />
          {showTooLong ? (
            <p
              id="block-reason-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {t('academy:students.block.reasonTooLong', {
                max: BLOCK_REASON_MAX_LENGTH,
              })}
            </p>
          ) : null}
        </div>
        {error && !serverReason ? (
          <InlineFailureAlert
            error={error}
            titleKey="academy:students.block.failedTitle"
            specificKey={getRosterSpecificKey(error)}
          />
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={handleConfirm}
            data-testid="block-confirm"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {t('academy:students.block.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

export interface EnrollStudentDialogProps extends BaseDialogProps {
  readonly academyId: string;
  readonly studentName: string;
  /** Courses the learner already has an active enrollment in — hidden from the picker. */
  readonly enrolledCourseIds: readonly string[];
  readonly onConfirm: (input: {
    readonly courseId: string;
    readonly expiresAt?: string;
  }) => void;
}

/** Enough for any academy's catalog on one page; the picker is a select, not a paged list. */
const COURSE_PICKER_PAGE_SIZE = 100;

export function EnrollStudentDialog({
  open,
  onOpenChange,
  isPending,
  error,
  academyId,
  studentName,
  enrolledCourseIds,
  onConfirm,
}: EnrollStudentDialogProps): JSX.Element {
  const { t } = useTranslation();
  const [courseId, setCourseId] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) {
      setCourseId('');
      setExpiresOn('');
      setAttempted(false);
    }
  }, [open]);

  const { data: coursesData, isLoading: isLoadingCourses } = useCourses(
    academyId,
    {
      enabled: open && !!academyId,
      query: {
        pagination: { page: 1, pageSize: COURSE_PICKER_PAGE_SIZE },
      },
    }
  );

  const courses = useMemo(() => {
    const excluded = new Set(enrolledCourseIds);
    return (coursesData?.items ?? []).filter(
      (course) => !excluded.has(course.id)
    );
  }, [coursesData, enrolledCourseIds]);

  const expiresAt = dateInputToIso(expiresOn);
  const courseMissing = attempted && !courseId;
  const expiryPast = isPastDateInput(expiresOn);
  const serverExpiry =
    isExpiryInPastError(error) || violationOn(error, 'expiresAt');
  const showExpiryError = (attempted && expiryPast) || serverExpiry;

  const handleConfirm = () => {
    setAttempted(true);
    if (!courseId || expiryPast) return;
    onConfirm({ courseId, expiresAt });
  };

  return (
    <Dialog
      open={open}
      // Not dismissable mid-request: its failure shows only in the dialog.
      onOpenChange={(next) => {
        if (next || !isPending) onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('academy:students.enroll.title')}</DialogTitle>
          <DialogDescription>
            {t('academy:students.enroll.description', { name: studentName })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="enroll-course">
              {t('academy:students.enroll.courseLabel')}
            </Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger
                id="enroll-course"
                disabled={isLoadingCourses}
                aria-invalid={courseMissing || undefined}
                aria-describedby={
                  courseMissing ? 'enroll-course-error' : undefined
                }
              >
                <SelectValue
                  placeholder={t('academy:students.enroll.coursePlaceholder')}
                />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    <span dir="auto">{course.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isLoadingCourses && courses.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t('academy:students.enroll.noCourses')}
              </p>
            ) : courseMissing ? (
              <p
                id="enroll-course-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {t('academy:students.enroll.courseRequired')}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="enroll-expires">
              {t('academy:students.enroll.expiresLabel')}
            </Label>
            <Input
              id="enroll-expires"
              type="date"
              min={todayDateInput()}
              value={expiresOn}
              onChange={(event) => setExpiresOn(event.target.value)}
              aria-invalid={showExpiryError || undefined}
              aria-describedby="enroll-expires-help"
            />
            {showExpiryError ? (
              <p
                id="enroll-expires-help"
                role="alert"
                className="text-sm text-destructive"
              >
                {t('academy:students.expiry.pastDate')}
              </p>
            ) : (
              <p
                id="enroll-expires-help"
                className="text-xs text-muted-foreground"
              >
                {t('academy:students.enroll.expiresHelp')}
              </p>
            )}
          </div>
        </div>
        {error && !serverExpiry ? (
          <InlineFailureAlert
            error={error}
            titleKey="academy:students.enroll.failedTitle"
            specificKey={getRosterSpecificKey(error)}
          />
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="button"
            // B4 (UX audit) V29 — never greyed without a reason: without a
            // course, pressing Enroll says to choose one.
            disabled={isPending || (!isLoadingCourses && courses.length === 0)}
            onClick={handleConfirm}
            data-testid="enroll-confirm"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {t('academy:students.enroll.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

const REVOKE_REASONS: readonly RosterEnrollmentRevokeReason[] = [
  'manual',
  'membership_ended',
  'suspended',
];

export interface RevokeEnrollmentDialogProps extends BaseDialogProps {
  readonly courseTitle: string;
  readonly onConfirm: (reason: RosterEnrollmentRevokeReason) => void;
}

export function RevokeEnrollmentDialog({
  open,
  onOpenChange,
  isPending,
  error,
  courseTitle,
  onConfirm,
}: RevokeEnrollmentDialogProps): JSX.Element {
  const { t } = useTranslation();
  const [reason, setReason] = useState<RosterEnrollmentRevokeReason>('manual');

  useEffect(() => {
    if (!open) setReason('manual');
  }, [open]);

  return (
    <Dialog
      open={open}
      // Not dismissable mid-request: its failure shows only in the dialog.
      onOpenChange={(next) => {
        if (next || !isPending) onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('academy:students.revoke.title')}</DialogTitle>
          <DialogDescription>
            {t('academy:students.revoke.description', { course: courseTitle })}
          </DialogDescription>
        </DialogHeader>
        {/* Revoking only ends access: the order stays paid. A refund is
            recorded with Record refund on the payment (Payments), which
            also ends access — the dialog says so instead of implying the
            learner gets their money back. */}
        <p
          className="rounded-md bg-warning-surface p-3 text-sm text-foreground"
          data-testid="revoke-refund-note"
        >
          {t('academy:students.revoke.refundNote')}
        </p>
        <div className="space-y-2">
          <Label htmlFor="revoke-reason">
            {t('academy:students.revoke.reasonLabel')}
          </Label>
          <Select
            value={reason}
            onValueChange={(value) =>
              setReason(value as RosterEnrollmentRevokeReason)
            }
          >
            <SelectTrigger id="revoke-reason">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REVOKE_REASONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`academy:students.revoke.reasons.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {error ? (
          <InlineFailureAlert
            error={error}
            titleKey="academy:students.revoke.failedTitle"
            specificKey={getRosterSpecificKey(error)}
          />
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() => onConfirm(reason)}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {t('academy:students.revoke.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

export interface EnrollmentExpiryDialogProps extends BaseDialogProps {
  readonly courseTitle: string;
  readonly currentExpiresAt?: string;
  readonly onConfirm: (expiresAt: string | null) => void;
}

export function EnrollmentExpiryDialog({
  open,
  onOpenChange,
  isPending,
  error,
  courseTitle,
  currentExpiresAt,
  onConfirm,
}: EnrollmentExpiryDialogProps): JSX.Element {
  const { t } = useTranslation();
  const [expiresOn, setExpiresOn] = useState('');
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (open) {
      setExpiresOn(isoToDateInput(currentExpiresAt));
      setAttempted(false);
    }
  }, [open, currentExpiresAt]);

  const expiresAt = dateInputToIso(expiresOn);
  const missing = attempted && !expiresAt;
  const past = isPastDateInput(expiresOn);
  const serverPast =
    isExpiryInPastError(error) || violationOn(error, 'expiresAt');
  const fieldError = missing
    ? t('academy:students.expiry.dateRequired')
    : (attempted && past) || serverPast
      ? t('academy:students.expiry.pastDate')
      : null;

  const handleConfirm = () => {
    setAttempted(true);
    if (!expiresAt || past) return;
    onConfirm(expiresAt);
  };

  return (
    <Dialog
      open={open}
      // Not dismissable mid-request: its failure shows only in the dialog.
      onOpenChange={(next) => {
        if (next || !isPending) onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('academy:students.expiry.title')}</DialogTitle>
          <DialogDescription>
            {t('academy:students.expiry.description', { course: courseTitle })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="expiry-date">
            {t('academy:students.expiry.dateLabel')}
          </Label>
          <Input
            id="expiry-date"
            type="date"
            min={todayDateInput()}
            value={expiresOn}
            onChange={(event) => setExpiresOn(event.target.value)}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby="expiry-date-help"
          />
          {fieldError ? (
            <p
              id="expiry-date-help"
              role="alert"
              className="text-sm text-destructive"
            >
              {fieldError}
            </p>
          ) : (
            <p id="expiry-date-help" className="text-xs text-muted-foreground">
              {t('academy:students.expiry.help')}
            </p>
          )}
        </div>
        {error && !serverPast ? (
          <InlineFailureAlert
            error={error}
            titleKey="academy:students.expiry.failedTitle"
            specificKey={getRosterSpecificKey(error)}
          />
        ) : null}
        <DialogFooter className="gap-2 sm:justify-between">
          {currentExpiresAt ? (
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => onConfirm(null)}
            >
              {t('academy:students.expiry.clear')}
            </Button>
          ) : (
            <span aria-hidden />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={handleConfirm}
              data-testid="expiry-confirm"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {t('academy:students.expiry.confirm')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
