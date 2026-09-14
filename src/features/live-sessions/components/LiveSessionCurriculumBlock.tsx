/**
 * Live Sessions inside one curriculum unit, in the Course Builder.
 *
 * WHY THIS LIVES IN THE BUILDER. A Live Session is a course activity, not
 * a separate product surface — an instructor building Unit 1 should add a
 * live class the same way they add a lesson, in the same place, without
 * navigating away. Managing it from a detached "Live Sessions" page would
 * make the curriculum the one place the activity is invisible.
 *
 * IT EXPLAINS ITSELF WHEN IT CANNOT WORK. The four dependencies are
 * distinct problems with distinct fixes, so the empty state names the one
 * that is actually blocking:
 *
 *   not installed / disabled / not entitled -> an add-on problem
 *   provider not connected                  -> a Zoom problem
 *   neither                                 -> just no sessions yet
 *
 * A dead "Add" button with no explanation is the thing this avoids.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Plus, Radio, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { formatDate } from '@utils';
import {
  useCourseLiveSessions,
  useCreateLiveSession,
  useLiveSessionsStatus,
  usePublishLiveSession,
  useUpdateLiveSession,
} from '../hooks/useLiveSessions';
import { LiveSessionFormDialog } from './LiveSessionFormDialog';
import { getLiveSessionStatusTone } from '../utils/liveSession.utils';
import type { LiveSessionFormData } from '../schemas/liveSession.schemas';
import type { LanguageCode, LiveSession } from '@types';

export interface LiveSessionCurriculumBlockProps {
  readonly academyId: string;
  readonly courseId: string;
  /** The unit these sessions belong to. */
  readonly sectionId: string;
}

type DialogState =
  | null
  | { readonly mode: 'create' }
  | { readonly mode: 'edit'; readonly session: LiveSession };

/** `datetime-local` gives a local wall-clock string; the API wants an absolute instant. */
function toIso(localValue: string): string {
  return new Date(localValue).toISOString();
}

export function LiveSessionCurriculumBlock({
  academyId,
  courseId,
  sectionId,
}: LiveSessionCurriculumBlockProps): JSX.Element | null {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<DialogState>(null);

  const statusQuery = useLiveSessionsStatus(academyId);
  const sessionsQuery = useCourseLiveSessions(academyId, courseId);
  const createSession = useCreateLiveSession(academyId, courseId);
  const updateSession = useUpdateLiveSession(academyId, courseId);
  const publishSession = usePublishLiveSession(academyId, courseId);

  // Never render a half-answer: while the add-on state is unknown, showing
  // either an "install the add-on" notice or a working Add button would be
  // a guess, and one of them would be wrong.
  if (statusQuery.isLoading) return null;

  const status = statusQuery.data;
  const addOnUsable = status?.addOn.usable === true;

  const sessions = (sessionsQuery.data ?? []).filter(
    (session) => session.sectionId === sectionId,
  );

  // Nothing to show and nothing to offer — stay out of the way entirely
  // rather than advertising an add-on on every unit of every course.
  if (!addOnUsable && sessions.length === 0) return null;

  const providerConnected = status?.provider.status === 'connected';

  const handleSubmit = async (data: LiveSessionFormData): Promise<void> => {
    const payload = {
      title: data.title,
      description: data.description || undefined,
      scheduledStartAt: toIso(data.scheduledStartAt),
      scheduledEndAt: toIso(data.scheduledEndAt),
      recordingEnabled: data.recordingEnabled,
    };

    if (dialog?.mode === 'edit') {
      await updateSession.mutateAsync({
        liveSessionId: dialog.session.id,
        input: payload,
      });
    } else {
      await createSession.mutateAsync({ ...payload, sectionId });
    }
    setDialog(null);
  };

  return (
    <div className="space-y-2">
      {sessions.length > 0 ? (
        <ol className="space-y-2">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <Radio className="size-4" strokeWidth={1.75} aria-hidden />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {session.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {/* Centralized formatter, so Arabic dates and RTL are
                      handled the same way as everywhere else in Atlas. */}
                  {formatDate(session.scheduledStartAt, language, 'short')}
                </p>
              </div>

              {session.recordingEnabled ? (
                <Badge variant="outline" className="gap-1">
                  <Video className="size-3" aria-hidden />
                  {t('liveSessions:badge.recording')}
                </Badge>
              ) : null}

              <Badge variant={getLiveSessionStatusTone(session.status)}>
                {t(`liveSessions:status.${session.status}`)}
              </Badge>

              {/*
                PUBLISH IS THE TRANSITION THAT MAKES A CLASS REAL — it
                creates the meeting at the provider and tells the enrolled
                students. Until it happens the session is a draft nobody
                but the instructor can see, so the action is offered
                prominently rather than hidden behind the edit dialog.

                It is offered ONLY when the provider is genuinely
                connected. Publishing without a connection cannot succeed,
                and an enabled button that always fails is worse than an
                explained one that is absent — this is the "never show a
                misleading ready state" rule applied literally: add-on
                usable is NOT the same as provider connected.
              */}
              {session.status === 'draft' ? (
                providerConnected ? (
                  <Button
                    variant="default"
                    size="sm"
                    disabled={publishSession.isPending}
                    onClick={() =>
                      void publishSession.mutateAsync({ liveSessionId: session.id })
                    }
                  >
                    {t('liveSessions:publish.action')}
                  </Button>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    {t('liveSessions:publish.needsProvider')}
                  </Badge>
                )
              ) : null}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDialog({ mode: 'edit', session })}
              >
                {t('common:actions.edit')}
              </Button>
            </li>
          ))}
        </ol>
      ) : null}

      {addOnUsable ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialog({ mode: 'create' })}
          >
            <Plus className="size-4" strokeWidth={2} aria-hidden />
            {t('liveSessions:addToUnit')}
          </Button>

          {/*
            A session can be SCHEDULED without a provider connection — the
            curriculum is still being built — but it cannot be JOINED. Say
            so here, once, rather than letting the instructor discover it
            at the moment a class is supposed to start.
          */}
          {!providerConnected ? (
            <button
              type="button"
              onClick={() => navigate(DASHBOARD_ROUTES.liveSessionsSettings)}
              className="inline-flex items-center gap-1.5 rounded-sm text-xs text-warning underline-offset-4 hover:underline"
            >
              <AlertCircle className="size-3.5" aria-hidden />
              {t('liveSessions:providerNotConnectedShort')}
            </button>
          ) : null}
        </div>
      ) : null}

      <LiveSessionFormDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        mode={dialog?.mode === 'edit' ? 'edit' : 'create'}
        defaultValues={
          dialog?.mode === 'edit'
            ? {
                title: dialog.session.title,
                description: dialog.session.description ?? '',
                scheduledStartAt: dialog.session.scheduledStartAt,
                scheduledEndAt: dialog.session.scheduledEndAt,
                recordingEnabled: dialog.session.recordingEnabled,
              }
            : undefined
        }
        isPending={createSession.isPending || updateSession.isPending}
        onSubmit={handleSubmit}
        error={createSession.error ?? updateSession.error}
        recordingQuota={status?.recordingQuota}
      />
    </div>
  );
}
