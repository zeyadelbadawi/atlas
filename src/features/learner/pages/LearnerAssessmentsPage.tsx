/**
 * `/my/assessments` — the learner's quizzes and assignments (§E.1).
 *
 * Two tabs over one page rather than two routes: a learner asking "what
 * do I still owe?" does not separate the two, and the due dates that
 * answer it interleave. The tab is local state, not a URL segment,
 * because switching it is a filter over the same question rather than a
 * different page.
 *
 * BOTH LISTS STAY MOUNTED. `Tabs` keeps the inactive panel in the tree,
 * so tabbing back to a list the learner has already seen shows it
 * immediately instead of re-running a request and flickering a skeleton
 * over data that had not changed.
 *
 * OUTSTANDING WORK IS EMPHASISED, NOT REORDERED. The server's order is
 * kept — it is the order the deadlines fall in — and an item the learner
 * still owes is marked rather than floated to the top, because a list
 * that reshuffles itself as work is submitted is a list nobody can scan
 * twice.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, ClipboardList } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { useDateFormatter } from '@hooks';
import { useLearningPaths } from '@features/learning';
import type { LearnerAssessmentItem } from '@types';
import { LearnerPageHeader } from '../components/LearnerPageHeader';
import { LearnerSectionPlaceholder } from '../components/LearnerSectionPlaceholder';
import { useLearnerAssessments } from '../hooks';
import {
  isAssessmentOutstanding,
  learnerAssessmentStateLabel,
} from '../utils/assessment-state.utils';

type AssessmentTab = 'quizzes' | 'assignments';

/** One list, used for both tabs — the wire shape is the same for each. */
function AssessmentList({
  type,
  emptyTitleKey,
  emptyDescriptionKey,
}: {
  readonly type: 'quiz' | 'assignment';
  readonly emptyTitleKey: string;
  readonly emptyDescriptionKey: string;
}): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const paths = useLearningPaths();
  const { data, isLoading, error, refetch } = useLearnerAssessments(type);

  if (error) return <ErrorState onRetry={() => void refetch()} />;

  if (isLoading) {
    return (
      <div className="space-y-2" role="status" aria-live="polite">
        <span className="sr-only">
          {t('learning:learnerDashboard.assessments.loading')}
        </span>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const items: readonly LearnerAssessmentItem[] = data ?? [];

  if (items.length === 0) {
    return (
      <LearnerSectionPlaceholder
        icon={ClipboardList}
        titleKey={emptyTitleKey}
        descriptionKey={emptyDescriptionKey}
      />
    );
  }

  return (
    <ul className="space-y-2" role="list">
      {items.map((item) => {
        const href =
          item.type === 'quiz'
            ? paths.quiz(item.courseId, item.id)
            : paths.assignment(item.courseId, item.id);
        const outstanding = isAssessmentOutstanding(item.state);

        return (
          <li
            key={`${item.type}-${item.id}`}
            className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium text-foreground">
                <a
                  href={href}
                  className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.title}
                </a>
              </h3>
              <p className="truncate text-xs text-muted-foreground">
                {item.courseTitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {item.dueAt ? (
                <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
                  <CalendarClock className="size-3.5" aria-hidden />
                  <span className="sr-only">
                    {t('learning:player.activity.due')}
                  </span>
                  {fmt.dateTime(item.dueAt)}
                </span>
              ) : null}

              {item.score !== null ? (
                <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">
                  {t('learning:learnerDashboard.assessments.score', {
                    score: item.score,
                  })}
                </span>
              ) : null}

              <Badge variant={outstanding ? 'secondary' : 'outline'}>
                {learnerAssessmentStateLabel(item.state, t)}
              </Badge>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function LearnerAssessmentsPage(): JSX.Element {
  const { t } = useTranslation();
  const [tab, setTab] = useState<AssessmentTab>('quizzes');

  return (
    <>
      <LearnerPageHeader
        section="assessments"
        titleKey="learning:learnerDashboard.assessments.title"
        descriptionKey="learning:learnerDashboard.assessments.subtitle"
      />

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as AssessmentTab)}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
          <TabsTrigger value="quizzes">
            {t('learning:learnerDashboard.assessments.tabs.quizzes')}
          </TabsTrigger>
          <TabsTrigger value="assignments">
            {t('learning:learnerDashboard.assessments.tabs.assignments')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quizzes" forceMount hidden={tab !== 'quizzes'}>
          <AssessmentList
            type="quiz"
            emptyTitleKey="learning:learnerDashboard.assessments.quizzes.empty.title"
            emptyDescriptionKey="learning:learnerDashboard.assessments.quizzes.empty.description"
          />
        </TabsContent>

        <TabsContent
          value="assignments"
          forceMount
          hidden={tab !== 'assignments'}
        >
          <AssessmentList
            type="assignment"
            emptyTitleKey="learning:learnerDashboard.assessments.assignments.empty.title"
            emptyDescriptionKey="learning:learnerDashboard.assessments.assignments.empty.description"
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
