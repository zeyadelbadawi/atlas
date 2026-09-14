/**
 * Live Sessions in the student's course page — a class alongside their
 * lessons, quizzes and assignments.
 *
 * WHY A CARD HERE RATHER THAN A ROW IN THE CURRICULUM TREE. The existing
 * student course page already keeps quizzes and assignments in their own
 * card beside the sections/lessons list, because `CourseSection` carries
 * only `lessons`. Live Sessions follow the pattern the page already
 * established rather than reshaping the curriculum contract to add a
 * fourth activity type to a tree that today holds one.
 *
 * RENDERS NOTHING WHEN THERE IS NOTHING. A course with no live sessions —
 * which is most courses — shows no empty card, no "0 sessions" heading.
 * The list is also empty for a student who is not enrolled, because the
 * endpoint answers that way deliberately: whether a course HAS live
 * sessions is itself information.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CalendarClock, Radio, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDateFormatter } from '@/shared/hooks';
import { useStudentCourseLiveSessions } from '../hooks/useStudentLiveSessions';
import type { StudentLiveSession } from '@types';

export interface StudentLiveSessionListProps {
  readonly courseId: string;
}

export function StudentLiveSessionList({
  courseId,
}: StudentLiveSessionListProps): JSX.Element | null {
  const { t } = useTranslation();
  const { data: sessions, isLoading } = useStudentCourseLiveSessions(courseId);

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }
  // Nothing to say — so nothing is said.
  if (!sessions || sessions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="size-4 text-primary" aria-hidden />
          {t('liveSessions:student.listTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sessions.map((session) => (
          <SessionRow key={session.id} courseId={courseId} session={session} />
        ))}
      </CardContent>
    </Card>
  );
}

function SessionRow({
  courseId,
  session,
}: {
  readonly courseId: string;
  readonly session: StudentLiveSession;
}): JSX.Element {
  const { t } = useTranslation();
  const { dateTime } = useDateFormatter();

  const isCancelled = session.status === 'cancelled';
  const isLive = session.status === 'live';

  const content = (
    <>
      {isLive ? (
        <Radio className="size-4 shrink-0 text-destructive" aria-hidden />
      ) : (
        <CalendarClock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      )}

      <span className="min-w-0 flex-1">
        {/* `truncate` rather than wrapping: a long Arabic title must not
            push the date column off a narrow screen. */}
        <span className="block truncate font-medium">{session.title}</span>
        {/* The timestamp is direction-isolated — see the note on the
            session page: Latin digits inside an RTL line reorder. */}
        <span className="block text-xs text-muted-foreground" dir="ltr">
          {dateTime(session.scheduledStartAt)}
        </span>
      </span>

      {isLive ? (
        <Badge variant="destructive">{t('liveSessions:status.live')}</Badge>
      ) : isCancelled ? (
        <Badge variant="secondary">{t('liveSessions:status.cancelled')}</Badge>
      ) : session.recordingAvailable ? (
        <Badge variant="outline">{t('liveSessions:student.recorded')}</Badge>
      ) : null}
    </>
  );

  const className =
    'flex items-center gap-3 rounded-md border border-border p-3 text-sm transition-colors duration-fast ease-standard';

  // A cancelled session is still SHOWN — a student who wrote it in their
  // diary needs to see that it is off — but it is not a link to a room
  // nobody can enter.
  if (isCancelled) {
    return (
      <div className={`${className} opacity-60`} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link
      to={`/dashboard/learning/courses/${courseId}/live-sessions/${session.id}`}
      className={`${className} hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
    >
      {content}
    </Link>
  );
}
