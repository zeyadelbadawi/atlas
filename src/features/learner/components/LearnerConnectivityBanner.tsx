/**
 * Academy offline — one calm line at the top of the learner portal that
 * says what the connection and the learner's saved changes are doing.
 * Silent while everything is normal; never covers content.
 *
 *   offline       "You're offline. Showing what was saved on this device
 *                 at 14:05. Lessons you've opened can still be read;
 *                 videos need a connection." (+ "2 changes will sync")
 *   reconnecting  "Reconnecting…"
 *   syncing       "Syncing your progress…"
 *   synced        "Your progress is synced." (for a few seconds)
 *   attention     "1 change couldn't be synced." + Retry / Discard
 *
 * Learner wording, not the dashboard's: a learner thinks in lessons,
 * progress and submissions. `role="status"` with polite announcements;
 * logical properties only (`text-start`, `gap`), so it mirrors in Arabic.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@utils';
import { useAuth, useDateFormatter } from '@hooks';
import { discardUnsyncableOutbox, retryOutbox } from '@services/offline';
import {
  useConnectivity,
  useOutboxState,
} from '@app/providers/offline/useOfflineState';
import { useOfflineSavedAt } from '@app/providers/offline/offline-status';

const SYNCED_NOTICE_MS = 4_000;
const K = 'learning:offline.banner';

type BannerState =
  'hidden' | 'offline' | 'reconnecting' | 'syncing' | 'synced' | 'attention';

export function LearnerConnectivityBanner(): JSX.Element | null {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const { session } = useAuth();
  const connectivity = useConnectivity();
  const outbox = useOutboxState();
  const savedAt = useOfflineSavedAt();
  const [showSynced, setShowSynced] = useState(false);
  const announcedSync = useRef(outbox.lastSyncedAt);
  const attention = outbox.failed + outbox.conflict;

  useEffect(() => {
    if (
      outbox.lastSyncedAt === null ||
      outbox.lastSyncedAt === announcedSync.current ||
      outbox.pending > 0 ||
      outbox.syncing ||
      attention > 0
    ) {
      return;
    }
    announcedSync.current = outbox.lastSyncedAt;
    setShowSynced(true);
    const timer = setTimeout(() => setShowSynced(false), SYNCED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [outbox.lastSyncedAt, outbox.pending, outbox.syncing, attention]);

  const state: BannerState =
    connectivity.state === 'offline' || session.offline
      ? 'offline'
      : connectivity.state === 'reconnecting'
        ? 'reconnecting'
        : attention > 0
          ? 'attention'
          : outbox.pending > 0 || outbox.syncing
            ? 'syncing'
            : showSynced
              ? 'synced'
              : 'hidden';

  if (state === 'hidden') return null;

  const tone =
    state === 'offline' || state === 'attention'
      ? 'border-warning/30 bg-warning-surface text-warning'
      : state === 'synced'
        ? 'border-success/30 bg-success-surface text-success'
        : 'border-border bg-muted text-muted-foreground';

  return (
    <div className="mx-auto w-full max-w-content px-4 pt-4 sm:px-6 lg:px-8">
      <div
        role="status"
        aria-live="polite"
        data-learner-connectivity={state}
        className={cn(
          'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-4 py-2 text-sm',
          tone
        )}
      >
        {state === 'offline' ? (
          <WifiOff className="size-4 shrink-0" aria-hidden />
        ) : null}
        {state === 'reconnecting' || state === 'syncing' ? (
          <Loader2
            className="size-4 shrink-0 animate-spin motion-reduce:animate-none"
            aria-hidden
          />
        ) : null}
        {state === 'synced' ? (
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
        ) : null}
        {state === 'attention' ? (
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
        ) : null}

        <p className="min-w-0 flex-1 text-start">
          {state === 'offline' ? (
            <>
              <span className="font-medium">{t(`${K}.offlineTitle`)}</span>{' '}
              <span className="opacity-90">
                {savedAt
                  ? t(`${K}.savedAt`, {
                      time: fmt.dateTime(new Date(savedAt).toISOString()),
                    })
                  : t(`${K}.noCopy`)}{' '}
                {t(`${K}.whatWorks`)}
                {outbox.pending > 0
                  ? ` ${t(`${K}.pending`, { count: outbox.pending })}`
                  : ''}
              </span>
            </>
          ) : null}
          {state === 'reconnecting' ? t(`${K}.reconnecting`) : null}
          {state === 'syncing' ? t(`${K}.syncing`) : null}
          {state === 'synced' ? t(`${K}.synced`) : null}
          {state === 'attention'
            ? t(`${K}.attention`, { count: attention })
            : null}
        </p>

        {state === 'attention' && outbox.failed > 0 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void retryOutbox()}
            className="h-7 gap-1.5"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            {t(`${K}.retry`)}
          </Button>
        ) : null}
        {state === 'attention' ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void discardUnsyncableOutbox()}
            className="h-7"
          >
            {t(`${K}.discard`)}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
