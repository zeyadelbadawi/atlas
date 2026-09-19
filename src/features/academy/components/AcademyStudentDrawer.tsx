/**
 * Academy Student Drawer (P64 Phase 1).
 *
 * One learner's roster detail in a side sheet: identity, membership
 * state, enrollments (with progress/expiry and per-enrollment actions),
 * quiz and assignment outcomes, active sessions.
 *
 * Management actions render only when the server says the viewer manages
 * the academy (`viewerScope === 'academy'`). An assigned Instructor gets
 * the same read, scoped to their courses, with no buttons — the backend
 * would 403 every one of them, and a control that can only fail is worse
 * than none.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BadgeCheck,
  Ban,
  BookPlus,
  CalendarClock,
  Check,
  Loader2,
  MonitorSmartphone,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@components/data-display';
import { EmptyState, ErrorState } from '@components/feedback';
import { useDateFormatter } from '@hooks';
import { useToast, useConfirmDialog } from '@app/providers';
import { getQuizAttemptStatusTone, getSubmissionStatusTone } from '@features/learning';
import {
  useAcademyStudent,
  useApproveAcademyStudent,
  useBlockAcademyStudent,
  useEnrollAcademyStudent,
  useRejectAcademyStudent,
  useRevokeRosterEnrollment,
  useUnblockAcademyStudent,
  useUpdateRosterEnrollmentExpiry,
} from '../hooks';
import {
  getRosterEnrollmentLabelKey,
  getRosterEnrollmentTone,
  getRosterErrorKey,
  getRosterSourceLabelKey,
  getRosterStatusLabelKey,
  getRosterStatusTone,
} from '../utils/academy-roster.utils';
import {
  BlockStudentDialog,
  EnrollStudentDialog,
  EnrollmentExpiryDialog,
  RevokeEnrollmentDialog,
} from './AcademyStudentActionDialogs';
import type { ApiError } from '@api';
import type { RosterEnrollment } from '@types';

export interface AcademyStudentDrawerProps {
  readonly academyId: string;
  /** `null` keeps the sheet mounted-but-closed so its close animation still plays. */
  readonly userId: string | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function AcademyStudentDrawer({
  academyId,
  userId,
  open,
  onOpenChange,
}: AcademyStudentDrawerProps): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const { notifySuccess, notifyError } = useToast();
  const { confirm } = useConfirmDialog();

  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<RosterEnrollment | null>(
    null
  );
  const [expiryTarget, setExpiryTarget] = useState<RosterEnrollment | null>(
    null
  );

  const { data, isLoading, error, refetch } = useAcademyStudent(
    academyId,
    userId ?? '',
    { enabled: open && !!userId }
  );

  const block = useBlockAcademyStudent(academyId);
  const unblock = useUnblockAcademyStudent(academyId);
  const approve = useApproveAcademyStudent(academyId);
  const reject = useRejectAcademyStudent(academyId);
  const enroll = useEnrollAcademyStudent(academyId);
  const revoke = useRevokeRosterEnrollment(academyId);
  const updateExpiry = useUpdateRosterEnrollmentExpiry(academyId);

  const fail = (err: ApiError) => notifyError(getRosterErrorKey(err));

  const student = data?.student;
  const canManage = data?.viewerScope === 'academy';
  const activeCourseIds =
    data?.enrollments.filter((e) => e.isActive).map((e) => e.courseId) ?? [];

  const handleApprove = () => {
    if (!userId) return;
    approve.mutate(
      { userId },
      {
        onSuccess: () => notifySuccess('academy:students.toasts.approved'),
        onError: fail,
      }
    );
  };

  const handleReject = async () => {
    if (!userId || !student) return;
    const confirmed = await confirm({
      titleKey: 'academy:students.reject.title',
      descriptionKey: 'academy:students.reject.description',
      confirmLabelKey: 'academy:students.reject.confirm',
      cancelLabelKey: 'common:actions.cancel',
      values: { name: student.name },
      intent: 'destructive',
    });
    if (!confirmed) return;
    reject.mutate(
      { userId },
      {
        onSuccess: () => notifySuccess('academy:students.toasts.rejected'),
        onError: fail,
      }
    );
  };

  const handleUnblock = () => {
    if (!userId) return;
    unblock.mutate(
      { userId },
      {
        onSuccess: () => notifySuccess('academy:students.toasts.unblocked'),
        onError: fail,
      }
    );
  };

  const handleBlock = (reason?: string) => {
    if (!userId) return;
    block.mutate(
      { userId, payload: reason ? { reason } : {} },
      {
        onSuccess: () => {
          notifySuccess('academy:students.toasts.blocked');
          setIsBlockOpen(false);
        },
        onError: fail,
      }
    );
  };

  const handleEnroll = (input: {
    readonly courseId: string;
    readonly expiresAt?: string;
  }) => {
    if (!userId) return;
    enroll.mutate(
      { userId, payload: input },
      {
        onSuccess: () => {
          notifySuccess('academy:students.toasts.enrolled');
          setIsEnrollOpen(false);
        },
        onError: fail,
      }
    );
  };

  const handleRevoke = (reason: RosterEnrollment['revokeReason']) => {
    if (!userId || !revokeTarget) return;
    revoke.mutate(
      {
        userId,
        enrollmentId: revokeTarget.id,
        payload: {
          reason: reason as 'manual' | 'membership_ended' | 'suspended',
        },
      },
      {
        onSuccess: () => {
          notifySuccess('academy:students.toasts.revoked');
          setRevokeTarget(null);
        },
        onError: fail,
      }
    );
  };

  const handleExpiry = (expiresAt: string | null) => {
    if (!userId || !expiryTarget) return;
    updateExpiry.mutate(
      { userId, enrollmentId: expiryTarget.id, payload: { expiresAt } },
      {
        onSuccess: () => {
          notifySuccess(
            expiresAt
              ? 'academy:students.toasts.expirySet'
              : 'academy:students.toasts.expiryCleared'
          );
          setExpiryTarget(null);
        },
        onError: fail,
      }
    );
  };

  const isActing =
    approve.isPending || reject.isPending || unblock.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="space-y-1 border-b border-border p-6 text-start">
          <SheetTitle>{t('academy:students.drawer.title')}</SheetTitle>
          <SheetDescription>
            {t('academy:students.drawer.description')}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 p-6" aria-busy>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error || !data || !student ? (
          <div className="p-6">
            <ErrorState
              kind={error?.kind}
              onRetry={() => refetch()}
            />
          </div>
        ) : (
          <div className="space-y-6 p-6">
            {/* Identity */}
            <section className="flex items-start gap-4">
              <Avatar className="size-14">
                {student.avatar ? (
                  <AvatarImage src={student.avatar} alt="" />
                ) : null}
                <AvatarFallback>{initialsOf(student.name) || '?'}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-base font-semibold" dir="auto">
                  {student.name}
                </p>
                <p className="truncate text-sm text-muted-foreground" dir="auto">
                  {student.email}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <StatusBadge
                    labelKey={getRosterStatusLabelKey(student)}
                    tone={getRosterStatusTone(student)}
                  />
                  {student.emailVerified ? (
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      <BadgeCheck className="size-3.5" aria-hidden />
                      {t('academy:students.drawer.verified')}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {t('academy:students.drawer.unverified')}
                    </span>
                  )}
                </div>
              </div>
            </section>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">
                {t('academy:students.table.source')}
              </dt>
              <dd>{t(getRosterSourceLabelKey(student.source))}</dd>
              <dt className="text-muted-foreground">
                {t('academy:students.table.joined')}
              </dt>
              <dd>{fmt.date(student.joinedAt)}</dd>
              <dt className="text-muted-foreground">
                {t('academy:students.table.lastActivity')}
              </dt>
              <dd>
                {student.lastActivityAt
                  ? fmt.dateTime(student.lastActivityAt)
                  : '—'}
              </dd>
              <dt className="text-muted-foreground">
                {t('academy:students.drawer.activeSessions')}
              </dt>
              <dd className="inline-flex items-center gap-1">
                <MonitorSmartphone className="size-3.5 text-muted-foreground" aria-hidden />
                {data.activeSessionCount}
              </dd>
              {student.blocked && student.blockedReason ? (
                <>
                  <dt className="text-muted-foreground">
                    {t('academy:students.drawer.blockedReason')}
                  </dt>
                  <dd dir="auto">{student.blockedReason}</dd>
                </>
              ) : null}
            </dl>

            {/* Management actions */}
            {canManage ? (
              <div
                className="flex flex-wrap gap-2"
                data-testid="student-actions"
              >
                {student.membershipStatus === 'pending' ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isActing}
                      onClick={handleApprove}
                    >
                      {approve.isPending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <Check className="size-4" aria-hidden />
                      )}
                      {t('academy:students.actions.approve')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isActing}
                      onClick={() => void handleReject()}
                    >
                      <X className="size-4" aria-hidden />
                      {t('academy:students.actions.reject')}
                    </Button>
                  </>
                ) : null}
                {student.blocked ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isActing}
                    onClick={handleUnblock}
                  >
                    <ShieldCheck className="size-4" aria-hidden />
                    {t('academy:students.actions.unblock')}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    disabled={isActing}
                    onClick={() => setIsBlockOpen(true)}
                  >
                    <Ban className="size-4" aria-hidden />
                    {t('academy:students.actions.block')}
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isActing || student.blocked}
                  onClick={() => setIsEnrollOpen(true)}
                >
                  <BookPlus className="size-4" aria-hidden />
                  {t('academy:students.actions.enroll')}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('academy:students.drawer.readOnlyScope')}
              </p>
            )}

            <Separator />

            {/* Enrollments */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">
                {t('academy:students.drawer.enrollments')}
              </h3>
              {data.enrollments.length === 0 ? (
                <EmptyState
                  titleKey="academy:students.drawer.noEnrollments"
                  className="py-6"
                />
              ) : (
                <ul className="space-y-3">
                  {data.enrollments.map((enrollment) => (
                    <li
                      key={enrollment.id}
                      className="space-y-2 rounded-lg border border-border p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-medium" dir="auto">
                            {enrollment.courseTitle}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <StatusBadge
                              labelKey={getRosterEnrollmentLabelKey(enrollment)}
                              tone={getRosterEnrollmentTone(enrollment)}
                            />
                            {enrollment.enrolledAt ? (
                              <span>
                                {t('academy:students.drawer.enrolledOn', {
                                  date: fmt.date(enrollment.enrolledAt),
                                })}
                              </span>
                            ) : null}
                            {enrollment.expiresAt ? (
                              <span className="inline-flex items-center gap-1">
                                <CalendarClock className="size-3" aria-hidden />
                                {t('academy:students.drawer.expiresOn', {
                                  date: fmt.date(enrollment.expiresAt),
                                })}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {canManage && enrollment.isActive ? (
                          <div className="flex shrink-0 gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setExpiryTarget(enrollment)}
                            >
                              {t('academy:students.actions.setExpiry')}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => setRevokeTarget(enrollment)}
                            >
                              {t('academy:students.actions.revoke')}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                      {enrollment.progress ? (
                        <div className="space-y-1">
                          <Progress
                            value={enrollment.progress.percentage}
                            aria-label={t('academy:students.drawer.progress')}
                          />
                          <p className="text-xs text-muted-foreground">
                            {t('academy:students.drawer.progressSummary', {
                              percentage: Math.round(enrollment.progress.percentage),
                              completed: enrollment.progress.completedLessons,
                              total: enrollment.progress.totalLessons,
                            })}
                          </p>
                        </div>
                      ) : null}
                      {enrollment.revokedAt ? (
                        <p className="text-xs text-muted-foreground">
                          {t('academy:students.drawer.revokedOn', {
                            date: fmt.date(enrollment.revokedAt),
                          })}
                          {enrollment.revokeReason
                            ? ` · ${t(
                                `academy:students.revoke.reasons.${enrollment.revokeReason}`,
                                { defaultValue: enrollment.revokeReason }
                              )}`
                            : ''}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <Separator />

            {/* Quiz outcomes */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">
                {t('academy:students.drawer.quizOutcomes')}
              </h3>
              {data.quizOutcomes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('academy:students.drawer.noQuizOutcomes')}
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {data.quizOutcomes.map((outcome) => (
                    <li
                      key={outcome.attemptId}
                      className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate font-medium" dir="auto">
                          {outcome.quizTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('instructor:studentProgress.attemptNumber', {
                            number: outcome.attemptNumber,
                          })}
                          {outcome.submittedAt
                            ? ` · ${fmt.dateTime(outcome.submittedAt)}`
                            : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums">
                          {typeof outcome.score === 'number'
                            ? `${Math.round(outcome.score)}%`
                            : '—'}
                        </span>
                        <StatusBadge
                          labelKey={`instructor:studentProgress.quizStatus.${outcome.status}`}
                          tone={getQuizAttemptStatusTone(outcome.status)}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Assignment outcomes */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">
                {t('academy:students.drawer.assignmentOutcomes')}
              </h3>
              {data.assignmentOutcomes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('academy:students.drawer.noAssignmentOutcomes')}
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {data.assignmentOutcomes.map((outcome) => (
                    <li
                      key={outcome.submissionId}
                      className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate font-medium" dir="auto">
                          {outcome.assignmentTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {outcome.submittedAt
                            ? fmt.dateTime(outcome.submittedAt)
                            : t('academy:students.drawer.notSubmitted')}
                          {outcome.hasFeedback
                            ? ` · ${t('academy:students.drawer.hasFeedback')}`
                            : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums">
                          {typeof outcome.score === 'number'
                            ? `${Math.round(outcome.score)}%`
                            : '—'}
                        </span>
                        <StatusBadge
                          labelKey={`learning:assignment.status.${outcome.status}`}
                          tone={getSubmissionStatusTone(outcome.status)}
                        />
                        <StatusBadge
                          labelKey={`instructor:grading.status.${outcome.gradingStatus}`}
                          tone={outcome.gradingStatus === 'graded' ? 'success' : 'warning'}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </SheetContent>

      {student ? (
        <>
          <BlockStudentDialog
            open={isBlockOpen}
            onOpenChange={setIsBlockOpen}
            isPending={block.isPending}
            studentName={student.name}
            onConfirm={handleBlock}
          />
          <EnrollStudentDialog
            open={isEnrollOpen}
            onOpenChange={setIsEnrollOpen}
            isPending={enroll.isPending}
            academyId={academyId}
            studentName={student.name}
            enrolledCourseIds={activeCourseIds}
            onConfirm={handleEnroll}
          />
          <RevokeEnrollmentDialog
            open={revokeTarget !== null}
            onOpenChange={(next) => !next && setRevokeTarget(null)}
            isPending={revoke.isPending}
            courseTitle={revokeTarget?.courseTitle ?? ''}
            onConfirm={handleRevoke}
          />
          <EnrollmentExpiryDialog
            open={expiryTarget !== null}
            onOpenChange={(next) => !next && setExpiryTarget(null)}
            isPending={updateExpiry.isPending}
            courseTitle={expiryTarget?.courseTitle ?? ''}
            currentExpiresAt={expiryTarget?.expiresAt}
            onConfirm={handleExpiry}
          />
        </>
      ) : null}
    </Sheet>
  );
}
