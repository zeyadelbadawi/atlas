/**
 * Active device sessions (Phase 10).
 *
 * Replaces the hardcoded "Current Device — last active: now" row that
 * stood here before. That row was a fiction in two ways: it rendered a
 * single device no matter how many were actually signed in, and "now" was
 * a literal string rather than any recorded activity. Everything below is
 * real data from `GET /auth/sessions`.
 *
 * HONESTY ABOUT UNKNOWNS. Sessions created before Phase 10 have no device
 * label, IP, or last-used timestamp recorded, and the backend returns
 * those fields absent rather than inventing them. This component renders
 * an explicit "unknown" string in that case — it never falls back to
 * `startedAt` dressed up as activity, nor to a generic "This device"
 * label, because a plausible-looking placeholder is exactly what would
 * stop a user from spotting a session they don't recognise.
 *
 * REVOKING THE CURRENT SESSION is allowed and is simply "sign out this
 * device". It is handled separately from revoking another device: once
 * the backend denies this session, every subsequent request 401s, so the
 * component tears down local auth state instead of refetching a list it
 * can no longer read.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Laptop, LogOut, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmptyState, ErrorState } from '@components/feedback';
import { SectionLoader } from '@components/loading';
import { useToast } from '@hooks';
import { useSignOut } from '@/shared/hooks';
import { formatDate, formatRelativeTime } from '@/shared/utils/date.utils';
import type { LanguageCode } from '@types';
import type { UserSession } from '@types';
import { useRevokeSession, useSessions } from '../hooks';

export function ProfileSessionsCard(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { toast } = useToast();
  const { signOut } = useSignOut();
  const sessions = useSessions();
  const revokeSession = useRevokeSession();

  // Which session the confirmation dialog is currently asking about.
  // Holding the whole session (not just an id) keeps the dialog copy able
  // to name the device being revoked.
  const [pendingSession, setPendingSession] = useState<UserSession | null>(
    null
  );

  const handleConfirmRevoke = (): void => {
    if (!pendingSession) return;
    const target = pendingSession;
    setPendingSession(null);

    revokeSession.mutate(
      { sessionId: target.id, isCurrent: target.isCurrent },
      {
        onSuccess: () => {
          if (target.isCurrent) {
            // This device just revoked itself. Nothing here can succeed
            // against the backend any more, so hand off to the normal
            // sign-out path rather than leaving the UI in a state where
            // every action silently 401s.
            void signOut();
            return;
          }
          toast({
            title: t('profile:sections.security.sessionRevoked'),
            description: t(
              'profile:sections.security.sessionRevokedDescription'
            ),
          });
        },
        onError: () => {
          toast({
            variant: 'destructive',
            title: t('profile:sections.security.sessionRevokeFailed'),
            description: t(
              'profile:sections.security.sessionRevokeFailedDescription'
            ),
          });
        },
      }
    );
  };

  const renderSessionRow = (session: UserSession): JSX.Element => {
    const deviceName =
      session.deviceLabel ??
      session.userAgent ??
      t('profile:sections.security.unknownDevice');

    return (
      <li
        key={session.id}
        className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-start gap-3">
          <Laptop
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium">{deviceName}</p>
              {session.isCurrent ? (
                <Badge variant="secondary">
                  {t('profile:sections.security.thisDevice')}
                </Badge>
              ) : null}
            </div>

            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-3.5 shrink-0" aria-hidden />
              <span>
                {t('profile:sections.security.lastActive')}:{' '}
                {session.lastUsedAt
                  ? formatRelativeTime(session.lastUsedAt, language)
                  : t('profile:sections.security.unknownActivity')}
              </span>
            </p>

            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span>
                {session.ipAddress ?? t('profile:sections.security.unknownIp')}
                {' · '}
                {t('profile:sections.security.signedIn')}{' '}
                {formatDate(session.startedAt, language, 'short')}
              </span>
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="shrink-0 self-start sm:self-center"
          onClick={() => setPendingSession(session)}
          disabled={revokeSession.isPending}
          // Names the specific device, so a screen-reader user hears which
          // row this button belongs to rather than one of N identical
          // "Revoke" buttons.
          aria-label={t('profile:sections.security.revokeSessionLabel', {
            device: deviceName,
          })}
        >
          <LogOut className="me-2 size-4" aria-hidden />
          {session.isCurrent
            ? t('profile:sections.security.signOutThisDevice')
            : t('profile:actions.revoke')}
        </Button>
      </li>
    );
  };

  const renderBody = (): JSX.Element => {
    if (sessions.isLoading) {
      return <SectionLoader />;
    }

    if (sessions.isError) {
      return <ErrorState onRetry={() => void sessions.refetch()} />;
    }

    const data = sessions.data ?? [];

    // Reachable in practice only in the moment after revoking the current
    // session, before sign-out completes — but rendering it honestly beats
    // showing an empty bordered box.
    if (data.length === 0) {
      return (
        <EmptyState
          icon={Laptop}
          titleKey="profile:sections.security.noSessions"
          descriptionKey="profile:sections.security.noSessionsDescription"
        />
      );
    }

    return (
      <ul className="space-y-3" aria-busy={revokeSession.isPending}>
        {data.map(renderSessionRow)}
      </ul>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile:sections.security.sessions')}</CardTitle>
        <CardDescription>
          {t('profile:sections.security.sessionsDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>{renderBody()}</CardContent>

      {/* A real dialog, never `window.confirm`/`alert` — those block the
          page, cannot be translated or styled, and read poorly to assistive
          technology. */}
      <AlertDialog
        open={pendingSession !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSession(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingSession?.isCurrent
                ? t('profile:sections.security.signOutThisDeviceTitle')
                : t('profile:sections.security.revokeConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSession?.isCurrent
                ? t('profile:sections.security.signOutThisDeviceDescription')
                : t('profile:sections.security.revokeConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRevoke}>
              {pendingSession?.isCurrent
                ? t('profile:sections.security.signOutThisDevice')
                : t('profile:actions.revoke')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
