/**
 * Roster action dialogs (P64 Phase 1).
 *
 * Small, single-purpose dialogs opened from `AcademyStudentDrawer`. Each
 * one only collects input and hands it back — the drawer owns the
 * mutation, its toast and the error mapping, so one place decides what a
 * failure means for the learner on screen.
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
// The feature barrel, not the hook's own module: reaching into another
// feature's internals is refused by `no-restricted-imports`.
import { useCourses } from '@features/course';
import type { RosterEnrollmentRevokeReason } from '@types';
import { dateInputToIso, isoToDateInput } from '../utils/academy-roster.utils';

interface BaseDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly isPending: boolean;
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
  studentName,
  onConfirm,
}: BlockStudentDialogProps): JSX.Element {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          />
        </div>
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
            onClick={() => onConfirm(reason.trim() || undefined)}
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
  academyId,
  studentName,
  enrolledCourseIds,
  onConfirm,
}: EnrollStudentDialogProps): JSX.Element {
  const { t } = useTranslation();
  const [courseId, setCourseId] = useState('');
  const [expiresOn, setExpiresOn] = useState('');

  useEffect(() => {
    if (!open) {
      setCourseId('');
      setExpiresOn('');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <SelectTrigger id="enroll-course" disabled={isLoadingCourses}>
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
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="enroll-expires">
              {t('academy:students.enroll.expiresLabel')}
            </Label>
            <Input
              id="enroll-expires"
              type="date"
              value={expiresOn}
              onChange={(event) => setExpiresOn(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('academy:students.enroll.expiresHelp')}
            </p>
          </div>
        </div>
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
            disabled={isPending || !courseId}
            onClick={() => onConfirm({ courseId, expiresAt })}
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
  courseTitle,
  onConfirm,
}: RevokeEnrollmentDialogProps): JSX.Element {
  const { t } = useTranslation();
  const [reason, setReason] = useState<RosterEnrollmentRevokeReason>('manual');

  useEffect(() => {
    if (!open) setReason('manual');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('academy:students.revoke.title')}</DialogTitle>
          <DialogDescription>
            {t('academy:students.revoke.description', { course: courseTitle })}
          </DialogDescription>
        </DialogHeader>
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
  courseTitle,
  currentExpiresAt,
  onConfirm,
}: EnrollmentExpiryDialogProps): JSX.Element {
  const { t } = useTranslation();
  const [expiresOn, setExpiresOn] = useState('');

  useEffect(() => {
    if (open) setExpiresOn(isoToDateInput(currentExpiresAt));
  }, [open, currentExpiresAt]);

  const expiresAt = dateInputToIso(expiresOn);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            value={expiresOn}
            onChange={(event) => setExpiresOn(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {t('academy:students.expiry.help')}
          </p>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            disabled={isPending || !currentExpiresAt}
            onClick={() => onConfirm(null)}
          >
            {t('academy:students.expiry.clear')}
          </Button>
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
              disabled={isPending || !expiresAt}
              onClick={() => expiresAt && onConfirm(expiresAt)}
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
