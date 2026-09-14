/**
 * The student's Live Session page.
 *
 * EVERY REFUSAL GETS ITS OWN SENTENCE. The backend answers "may I join?"
 * with a REASON rather than a bare no, and this page exists to spend that
 * reason well: "starts in 20 minutes" and "your academy needs to reconnect
 * Zoom" are the same HTTP outcome and completely different human problems.
 * A single greyed-out button for all of them would be the easy version and
 * the useless one.
 *
 * THE PAGE DECIDES NOTHING. Every state below is rendered from the
 * server's answer; nothing here computes eligibility from the clock. A
 * student who edits their machine's time sees exactly what they saw
 * before, because the only opinion that counts is formed server-side and
 * re-formed when the grant is actually minted.
 *
 * JOINING IS TWO STEPS AND BOTH ARE SERVER-AUTHORIZED: mint a single-use
 * grant, then redeem it for a short-lived signature. The signature lives
 * in component state and nothing else — never in storage, never in the
 * URL — so it dies with the tab and cannot be shared.
 */
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  CalendarClock,
  Loader2,
  Radio,
  Video,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth, useDateFormatter } from '@/shared/hooks';
import { toast } from '@/hooks/use-toast';
import { useLiveSessionEligibility } from '../hooks/useStudentLiveSessions';
import { studentLiveSessionService } from '../services/StudentLiveSessionService';
import { ZoomMeetingEmbed } from '../components/ZoomMeetingEmbed';
import type { JoinRefusalReason, LiveSessionJoinAuthorization } from '@types';

/**
 * Which refusals are the student's own situation, and which are the
 * academy's configuration.
 *
 * The distinction drives the tone: a student can do nothing about a
 * disconnected Zoom account, so that reads as "your academy needs to…"
 * rather than as something they got wrong.
 */
const ACADEMY_SIDE_REASONS: ReadonlySet<JoinRefusalReason> = new Set([
  'provider_unavailable',
  'add_on_unavailable',
]);

/**
 * The refusals this build has copy for.
 *
 * NOT decoration — this is what stops a raw `liveSessions:student.refusal…`
 * key being shown to a student. The backend owns the reason vocabulary and
 * can grow it in a deploy that ships before this one; without an explicit
 * check, `t()` on an unknown key returns THE KEY, and a new server-side
 * reason would surface as developer text on a real student's screen.
 * Anything unrecognised degrades to an honest general message instead.
 */
const EXPLAINED_REASONS: ReadonlySet<string> = new Set<JoinRefusalReason>([
  'not_enrolled',
  'wrong_academy',
  'not_published',
  'cancelled',
  'too_early',
  'too_late',
  'provider_unavailable',
  'add_on_unavailable',
]);

export default function StudentLiveSessionPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId, liveSessionId } = useParams<{
    courseId: string;
    liveSessionId: string;
  }>();
  const { dateTime } = useDateFormatter();
  const { user } = useAuth();

  const {
    data: eligibility,
    isLoading,
    error,
    refetch,
  } = useLiveSessionEligibility(liveSessionId);

  const [authorization, setAuthorization] =
    useState<LiveSessionJoinAuthorization | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = useCallback(async () => {
    if (!liveSessionId) return;
    setIsJoining(true);
    try {
      // Two calls, deliberately: the grant is single-use and short-lived,
      // and is spent immediately for a signature scoped to one meeting.
      const grant = await studentLiveSessionService.join(liveSessionId);
      const result = await studentLiveSessionService.redeem(
        liveSessionId,
        grant.token,
      );

      if (!result.joinable) {
        // The server changed its mind between the eligibility read and
        // the join — the authoritative answer wins, and the page
        // re-reads rather than pretending.
        toast({
          variant: 'destructive',
          description: t('liveSessions:student.join.refused'),
        });
        void refetch();
        return;
      }

      setAuthorization(result);
    } catch {
      // `useApiMutation`'s toast is not used here because this is a
      // two-call sequence; a single failure message is more honest than
      // two competing ones.
      toast({
        variant: 'destructive',
        description: t('liveSessions:student.join.failed'),
      });
      void refetch();
    } finally {
      setIsJoining(false);
    }
  }, [liveSessionId, refetch, t]);

  const handleLeave = useCallback(() => {
    // The signature is discarded on leaving. Rejoining mints a fresh
    // grant rather than reusing a spent one.
    setAuthorization(null);
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !eligibility) {
    return (
      <PageContainer>
        {/* `titleKey`/`descriptionKey` — this component resolves its own
            translations, so it takes KEYS rather than rendered strings. */}
        <ErrorState
          titleKey="liveSessions:student.error.title"
          descriptionKey="liveSessions:student.error.description"
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  // THE MEETING ITSELF replaces the page's body once joined — the student
  // stays inside Atlas rather than being handed off to Zoom.
  if (authorization) {
    return (
      <PageContainer>
        {/* `title` is the SESSION's own name — data, not product copy — so
            it is passed literally. `titleKey` is still required as the
            fallback the component renders when no literal is given. */}
        <PageHeader titleKey="liveSessions:student.sessionCard" title={eligibility.title} />
        <ZoomMeetingEmbed
          authorization={authorization}
          userName={user?.name ?? t('liveSessions:student.embed.anonymous')}
          onLeave={handleLeave}
        />
      </PageContainer>
    );
  }

  const reason = eligibility.reason;
  const isAcademySide = reason ? ACADEMY_SIDE_REASONS.has(reason) : false;
  // Unknown reasons degrade to the general message rather than rendering
  // the translation key itself — see `EXPLAINED_REASONS`.
  const reasonKey = reason && EXPLAINED_REASONS.has(reason) ? reason : 'unknown';

  return (
    <PageContainer>
      <PageHeader
        titleKey="liveSessions:student.sessionCard"
        title={eligibility.title}
        descriptionKey="liveSessions:student.scheduleRange"
        // Interpolation is left to the component, which resolves the key
        // with these values — the dates are formatted for the reader's
        // own locale before they get here.
        values={{
          start: dateTime(eligibility.scheduledStartAt),
          end: dateTime(eligibility.scheduledEndAt),
        }}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Video className="size-4 text-primary" aria-hidden />
            {t('liveSessions:student.sessionCard')}
          </CardTitle>
          <SessionStatusBadge status={eligibility.status} />
        </CardHeader>

        <CardContent className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">
                {t('liveSessions:student.startsAt')}
              </dt>
              {/*
                `dir="ltr"` on the value, not the label.

                A formatted date is a bidi hazard: an Arabic sentence
                containing Latin digits and a colon reorders unpredictably
                when the whole line is RTL, so the timestamp is isolated
                while the label around it stays in the page's direction.
              */}
              <dd className="text-sm font-medium" dir="ltr">
                {dateTime(eligibility.scheduledStartAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {t('liveSessions:student.endsAt')}
              </dt>
              <dd className="text-sm font-medium" dir="ltr">
                {dateTime(eligibility.scheduledEndAt)}
              </dd>
            </div>
          </dl>

          {eligibility.joinable ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button onClick={() => void handleJoin()} disabled={isJoining}>
                {isJoining ? (
                  <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
                ) : (
                  <Radio className="me-2 size-4" aria-hidden />
                )}
                {t(
                  eligibility.isHost
                    ? 'liveSessions:student.startAsHost'
                    : 'liveSessions:student.join.action',
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                {t('liveSessions:student.join.hint')}
              </p>
            </div>
          ) : (
            <Alert variant={isAcademySide ? 'destructive' : 'default'}>
              {reason === 'too_early' ? (
                <CalendarClock className="size-4" aria-hidden />
              ) : (
                <AlertCircle className="size-4" aria-hidden />
              )}
              <AlertTitle>
                {t(`liveSessions:student.refusal.${reasonKey}.title`)}
              </AlertTitle>
              <AlertDescription>
                {t(`liveSessions:student.refusal.${reasonKey}.description`)}
              </AlertDescription>
            </Alert>
          )}

          {courseId ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/dashboard/learning/courses/${courseId}`)}
            >
              {t('liveSessions:student.backToCourse')}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

/** The session's own state, distinct from whether THIS student may join it. */
function SessionStatusBadge({ status }: { readonly status: string }): JSX.Element {
  const { t } = useTranslation();
  const variant =
    status === 'live'
      ? 'default'
      : status === 'cancelled'
        ? 'destructive'
        : 'secondary';

  return (
    <Badge variant={variant}>{t(`liveSessions:status.${status}`)}</Badge>
  );
}
