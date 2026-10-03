/**
 * The unified player route (§E.2, §E.3, §E.4).
 *
 * ONE COMPONENT SERVES BOTH PLAYER PATHS. `/my/courses/:courseId/learn/
 * :lessonId` renders a lesson (and is the one path that works without a
 * session, for a preview); `/my/courses/:courseId/activities/:itemId`
 * renders whatever type the sequence says that id is. They are one
 * component because everything except the content area is identical, and
 * two components would be two places for the sidebar, the progress bar
 * and Previous/Next to drift apart — which is the bug the sequence
 * endpoint was built to end.
 *
 * THE SEQUENCE IS THE SPINE AND THE GRANT IS THE CONTENT. The sequence
 * answers "what is this, where does it sit, what comes next, why is that
 * locked" and carries no content of any kind; the grant answers "may I
 * have the bytes, for how long, and what must I show while they play".
 * Neither is derived from the other, and neither is cached in place of
 * the other.
 *
 * A PREVIEW OPENS WITHOUT A SESSION. The sequence endpoint requires one,
 * so an anonymous preview visitor gets a grant and no sequence — which is
 * exactly why the lesson route carries its own type in the URL. The shell
 * then renders with an empty curriculum and a preview rail inviting
 * enrolment, rather than an error about a curriculum the visitor was
 * never entitled to.
 *
 * THE TWO DEVICE DIALOGS ARE OPENED BY THE SERVER'S ANSWER, NOT BY A
 * GUESS. A 403 `deviceLimit` opens the device list with removal in it; a
 * 409 opens the takeover confirmation naming the other device. Neither is
 * ever opened speculatively, and neither retries on its own except after
 * the learner has done the thing that makes the refusal go away.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { buildPath, LEARNER_ROUTES } from '@app/routes/route-paths';
import { useAuth } from '@hooks';
import type { CourseSequenceItem, LanguageCode } from '@types';
import { useLearnerSurface } from '../context/LearnerSurface.context';
import {
  useCourseSequence,
  useLearnerDevices,
  useRemoveLearnerDevice,
  useSessionTakeover,
} from '../hooks';
import { ActivityLockCard } from '../components/ActivityLockCard';
import { AssessmentActivityView } from '../components/AssessmentActivityView';
import { DeviceLimitDialog } from '../components/DeviceLimitDialog';
import { LessonActivityView } from '../components/LessonActivityView';
import { PlayerActionBar } from '../components/PlayerActionBar';
import { PlayerFailureState } from '../components/PlayerFailureState';
import { PlayerShell } from '../components/PlayerShell';
import { ProtectionReport } from '../components/ProtectionReport';
import { SessionTakeoverDialog } from '../components/SessionTakeoverDialog';
import {
  useCompleteLessonInPlayer,
  useUndoLessonCompletion,
} from '../hooks/useLessonCompletion';
import { useLessonGrant } from '../hooks/useLessonGrant';
import { usePlaybackHeartbeat } from '../hooks/usePlaybackHeartbeat';
import {
  findSequenceNeighbours,
  formatSequenceOrdinal,
  isFinalActivity,
  isSequenceItemFinished,
} from '../utils/sequence.utils';

export default function LearnerPlayerPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { academyId, buildHref } = useLearnerSurface();
  const { user } = useAuth();
  const language = i18n.language as LanguageCode;

  const {
    courseId = '',
    lessonId,
    itemId,
  } = useParams<{
    courseId: string;
    lessonId?: string;
    itemId?: string;
  }>();

  /** The id of whatever is on screen, whichever route supplied it. */
  const currentId = lessonId ?? itemId ?? '';
  const isLessonRoute = !!lessonId;

  const sequenceQuery = useCourseSequence(courseId, { enabled: !!user?.id });
  const items = useMemo(
    () => sequenceQuery.data?.items ?? [],
    [sequenceQuery.data]
  );
  const { current, previous, next } = findSequenceNeighbours(items, currentId);

  /*
   * Only ever used to tell "still processing" apart from the server's
   * deliberately ambiguous 404 — see `player-failure.utils.ts`. A lesson
   * the curriculum has just listed as reachable, refused with a 404, is
   * very likely a video that has not finished encoding.
   */
  const sequenceSaysAvailable = !!current && current.state !== 'locked';

  /*
   * NO GRANT IS REQUESTED FOR A LOCKED LESSON. The server would refuse it
   * anyway — and that refusal is rate-limited per learner and written to
   * `content_access_log` (§I, §R), so asking for something the curriculum
   * has already said is locked spends a learner's grant budget to learn
   * nothing. The lock card below says more than the refusal would: it has
   * the REASON, which the deliberately-ambiguous 404 does not carry.
   */
  const isLockedActivity = current?.state === 'locked';

  const grantQuery = useLessonGrant(courseId, currentId, {
    enabled: isLessonRoute && !isLockedActivity && !!courseId && !!currentId,
    sequenceSaysAvailable,
  });
  const { grant, failure, refresh } = grantQuery;

  /*
   * The heartbeat reads position through a getter the content view hands
   * up, rather than through state — `currentTime` changes several times a
   * second, and a re-render per tick would re-arm the interval it feeds.
   */
  const positionSourceRef = useRef<() => number>(() => 0);
  const handlePositionSource = useCallback((getPosition: () => number) => {
    positionSourceRef.current = getPosition;
  }, []);
  const getPositionSeconds = useCallback(() => positionSourceRef.current(), []);

  const heartbeat = usePlaybackHeartbeat({
    courseId,
    lessonId: currentId,
    lease: grant?.playbackLease ?? null,
    getPositionSeconds,
    enabled: isLessonRoute && !isLockedActivity && !!grant && !!user?.id,
  });

  const completeLesson = useCompleteLessonInPlayer(courseId);
  const undoCompletion = useUndoLessonCompletion(courseId);

  const [hasFinishedPlaying, setHasFinishedPlaying] = useState(false);
  useEffect(() => setHasFinishedPlaying(false), [currentId]);
  // A stale failure from the previous activity must not follow the
  // learner to the next one.
  const resetCompletion = completeLesson.reset;
  const resetUndo = undoCompletion.reset;
  useEffect(() => {
    resetCompletion();
    resetUndo();
  }, [currentId, resetCompletion, resetUndo]);

  /* ---------- device and session dialogs ---------- */

  const [takeoverOpen, setTakeoverOpen] = useState(false);
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [takeoverError, setTakeoverError] = useState<string | undefined>();

  const devicesQuery = useLearnerDevices({ enabled: deviceDialogOpen });
  const removeDevice = useRemoveLearnerDevice();
  const takeover = useSessionTakeover();

  /*
   * The dialogs follow the server's answer. Opened in an effect rather
   * than during render because opening a dialog is a side effect, and
   * because the same failure must not re-open a dialog the learner has
   * deliberately dismissed — hence the guard on the previous kind.
   */
  const lastHandledFailureRef = useRef<string | null>(null);
  useEffect(() => {
    const kind = failure?.kind ?? null;
    if (kind === lastHandledFailureRef.current) return;
    lastHandledFailureRef.current = kind;

    if (kind === 'sessionConflict') setTakeoverOpen(true);
    if (kind === 'deviceLimit') setDeviceDialogOpen(true);
  }, [failure?.kind]);

  const confirmTakeover = () => {
    setTakeoverError(undefined);
    takeover.mutate(
      { courseId, ...(isLessonRoute ? { lessonId: currentId } : {}) },
      {
        onSuccess: () => {
          setTakeoverOpen(false);
          // The learner has just taken the lease; asking again is now the
          // correct move rather than a speculative retry.
          refresh();
        },
        onError: () => setTakeoverError(t('errors:conflict.description')),
      }
    );
  };

  const handleRemoveDevice = (deviceId: string) => {
    removeDevice.mutate(deviceId, {
      onSuccess: () => {
        setDeviceDialogOpen(false);
        refresh();
      },
    });
  };

  /* ---------- navigation ---------- */

  const hrefFor = useCallback(
    (item: CourseSequenceItem): string | undefined =>
      item.type === 'lesson'
        ? buildHref(
            buildPath(LEARNER_ROUTES.playerLesson, {
              courseId,
              lessonId: item.id,
            })
          )
        : buildHref(
            buildPath(LEARNER_ROUTES.playerActivity, {
              courseId,
              itemId: item.id,
            })
          ),
    [buildHref, courseId]
  );

  const goTo = useCallback(
    (item: CourseSequenceItem) => {
      const href = hrefFor(item);
      if (href) navigate(href);
    },
    [hrefFor, navigate]
  );

  // A lesson opened on the activity route (a hand-typed or stale link)
  // moves to its own path, where its player is — never the generic
  // activity card.
  const lessonOnActivityRoute = !isLessonRoute && current?.type === 'lesson';
  useEffect(() => {
    if (!lessonOnActivityRoute || !current) return;
    const href = hrefFor(current);
    if (href) navigate(href, { replace: true });
  }, [lessonOnActivityRoute, current, hrefFor, navigate]);

  /* ---------- completion ---------- */

  const isCompleted = current ? isSequenceItemFinished(current.state) : false;

  // Atlas observes its own players' playback; it cannot observe YouTube's.
  // A watched-ratio rule on an embedded lesson therefore can never be met,
  // and the bar says so instead of waiting for evidence that cannot come.
  const isUnobservableEmbed =
    grant?.kind === 'external' && !!grant.externalEmbed;
  const canComplete =
    grant?.completionRule === 'watched_ratio'
      ? !isUnobservableEmbed && heartbeat.completionEligible
      : true;
  const completionHintKey =
    grant?.completionRule === 'watched_ratio' && isUnobservableEmbed
      ? 'learning:player.completion.externalNotTracked'
      : 'learning:player.completion.watchMoreHint';

  const handleComplete = () => {
    if (!isLessonRoute || !currentId) return;
    completeLesson.mutate({ lessonId: currentId });
  };

  /*
    FINISH COURSE (Task C).

    Offered on the activity that finishes the course — every other one is
    already finished — whatever its type, and equally when the learner
    comes back to it, refreshes, or opens it directly (it is derived from
    the server's sequence, never from session state). Finishing a lesson
    that is not yet complete completes it first (the backend's completion
    is idempotent: a second call is a no-op, not an error), then opens the
    completion page, which reads the server's verdict — so a quiz still
    failed or an assignment awaiting grading is reported there, never a
    dead end here. A second click while finishing does nothing.
  */
  const isFinal = isFinalActivity(items, current);
  const finishingRef = useRef(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const completeHref = buildHref(
    buildPath(LEARNER_ROUTES.courseComplete, { courseId })
  );
  const needsLessonCompletion = isLessonRoute && !isCompleted;
  const canFinish =
    !needsLessonCompletion || (!!grant && canComplete && heartbeat.leaseHeld);
  const handleFinish = async () => {
    if (finishingRef.current || !canFinish) return;
    finishingRef.current = true;
    setIsFinishing(true);
    try {
      if (needsLessonCompletion && currentId) {
        await completeLesson.mutateAsync({ lessonId: currentId });
      }
      navigate(completeHref);
    } catch {
      // `completeLesson.error` carries the message to the bar.
    } finally {
      finishingRef.current = false;
      setIsFinishing(false);
    }
  };

  const handleUndo = () => {
    if (!isLessonRoute || !currentId) return;
    undoCompletion.mutate(currentId);
  };

  /* ---------- content area ---------- */

  const backHref = buildHref(
    buildPath(LEARNER_ROUTES.courseProgress, { courseId })
  );

  const courseTitle =
    sequenceQuery.data?.courseTitle ??
    grant?.title ??
    t('learning:player.untitledCourse');

  let content: JSX.Element;

  if (isLockedActivity && isLessonRoute) {
    content = (
      <ActivityLockCard
        lockReason={current?.lockReason ?? null}
        availableAt={current?.availableAt}
      />
    );
  } else if (failure) {
    content = (
      <PlayerFailureState
        failure={failure}
        onRetry={refresh}
        courseId={courseId}
      />
    );
  } else if (isLessonRoute && grantQuery.isLoading) {
    content = (
      <div className="space-y-4">
        <AspectRatio ratio={16 / 9}>
          <Skeleton className="size-full rounded-lg" />
        </AspectRatio>
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  } else if (isLessonRoute && grant) {
    content = (
      <LessonActivityView
        grant={grant}
        leaseHeld={heartbeat.leaseHeld}
        onCredentialFailure={refresh}
        onPositionSource={handlePositionSource}
        onFinished={() => setHasFinishedPlaying(true)}
      />
    );
  } else if (!isLessonRoute && current && !lessonOnActivityRoute) {
    content = (
      <AssessmentActivityView
        courseId={courseId}
        item={current}
        onContinue={next ? () => goTo(next) : undefined}
        continueLabel={
          next
            ? t('learning:player.completion.nextIs', {
                position: formatSequenceOrdinal(next, language),
                title: next.title,
              })
            : undefined
        }
        lessonHref={(lessonId) =>
          buildHref(
            buildPath(LEARNER_ROUTES.playerLesson, { courseId, lessonId })
          )
        }
      />
    );
  } else if (sequenceQuery.isLoading || lessonOnActivityRoute) {
    content = <Skeleton className="h-48 w-full" />;
  } else {
    /*
     * An id that is in neither the sequence nor a grant. Honest rather
     * than a blank frame: the activity is not one this learner can reach,
     * and the curriculum beside it still shows everything they can.
     */
    content = (
      <PlayerFailureState
        failure={{ kind: 'unavailable' }}
        onRetry={() => void sequenceQuery.refetch()}
        courseId={courseId}
      />
    );
  }

  /*
   * The preview rail. Shown when the grant says this is a preview lesson
   * AND the curriculum is unavailable — which together mean a visitor who
   * is not enrolled. Enrolled learners opening a preview lesson see their
   * normal curriculum and need no invitation to enrol in a course they
   * are already in.
   */
  const showPreviewRail = !!grant?.isPreview && items.length === 0;

  return (
    <>
      <PlayerShell
        courseTitle={courseTitle}
        backHref={backHref}
        completedCount={sequenceQuery.data?.completedCount ?? 0}
        totalCount={sequenceQuery.data?.totalCount ?? 0}
        items={items}
        currentItem={current}
        hrefFor={hrefFor}
        fallbackTitle={grant?.title}
        fallbackDurationSeconds={grant?.durationSeconds ?? null}
        headerAside={
          grant ? <ProtectionReport protection={grant.protection} /> : null
        }
        actionBar={
          items.length > 0 || isLessonRoute ? (
            <PlayerActionBar
              previous={previous}
              next={next}
              language={language}
              onGoTo={goTo}
              onComplete={isLessonRoute && grant ? handleComplete : undefined}
              onUndoComplete={isLessonRoute ? handleUndo : undefined}
              isCompleted={isCompleted}
              isCompleting={completeLesson.isPending}
              isUndoing={undoCompletion.isPending}
              canComplete={canComplete && heartbeat.leaseHeld}
              completionHintKey={completionHintKey}
              hasFinishedPlaying={hasFinishedPlaying}
              finish={
                isFinal && items.length > 0
                  ? {
                      onFinish: () => void handleFinish(),
                      isFinishing: isFinishing || completeLesson.isPending,
                      canFinish,
                      hintKey: completionHintKey,
                    }
                  : undefined
              }
              errorMessage={
                completeLesson.error || undoCompletion.error
                  ? t('learning:player.completion.failed')
                  : undefined
              }
            />
          ) : null
        }
      >
        {showPreviewRail ? (
          <Alert>
            <GraduationCap className="size-4" aria-hidden />
            <AlertTitle>{t('learning:player.preview.title')}</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{t('learning:player.preview.description')}</p>
              <Button
                size="sm"
                // The academy's own course page — where enrolling happens —
                // not the learner app's outline, which needs an enrolment.
                onClick={() => navigate(buildHref(`/courses/${courseId}`))}
              >
                {t('learning:player.preview.action')}
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {content}
      </PlayerShell>

      <SessionTakeoverDialog
        open={takeoverOpen}
        onOpenChange={setTakeoverOpen}
        conflict={failure?.sessionConflict}
        onConfirm={confirmTakeover}
        isPending={takeover.isPending}
        errorMessage={takeoverError}
      />

      <DeviceLimitDialog
        open={deviceDialogOpen}
        onOpenChange={setDeviceDialogOpen}
        devices={devicesQuery.data?.devices}
        maxDevices={devicesQuery.data?.maxDevices}
        isLoading={devicesQuery.isLoading}
        onRemove={handleRemoveDevice}
        removingDeviceId={
          removeDevice.isPending ? removeDevice.variables : undefined
        }
        errorMessage={
          removeDevice.error
            ? t('learning:learnerDashboard.devices.removeFailed')
            : undefined
        }
      />
    </>
  );
}
