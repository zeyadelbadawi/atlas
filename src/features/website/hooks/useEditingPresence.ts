/**
 * Announces that this user has an editor open, and reports who else does.
 *
 * WHY POLLING AND NOT A SOCKET. Atlas has no WebSocket or SSE
 * infrastructure today, and presence on a CMS editor does not justify
 * introducing one: the population is a handful of staff per Academy, the
 * information is only useful at human reaction speed, and a persistent
 * connection per open editor is a real operational cost (connection
 * limits, sticky routing, reconnect handling) bought for a banner. A
 * heartbeat on an interval reuses the HTTP path, the auth, the rate
 * limiting and the error handling that already exist.
 *
 * THE INTERVAL IS NOT ARBITRARY. It matches the server's
 * `EDITING_HEARTBEAT_INTERVAL_SECONDS`, and the server's session TTL is
 * three times that, so two missed beats — a backgrounded tab, a flaky
 * connection — do not make a colleague vanish from the banner and
 * reappear. One request every 20 seconds per OPEN EDITOR is the whole
 * cost; nothing polls a resource nobody is editing.
 *
 * IT STOPS WHEN THE TAB IS HIDDEN. A backgrounded tab is not someone
 * editing, and browsers throttle its timers anyway. Hiding the tab lets
 * the session age out naturally, which is the honest signal; showing it
 * again resumes immediately rather than waiting for the next tick.
 *
 * FAILURES ARE SILENT ON PURPOSE. Presence is advisory — the thing that
 * actually protects the work is the version check on save. A presence
 * request that fails must never produce an error toast on top of an editor
 * someone is working in.
 */
import { useEffect, useRef, useState } from 'react';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';
import type { EditingParticipant } from '@types';

/** Mirrors the server's `EDITING_HEARTBEAT_INTERVAL_SECONDS`. */
const HEARTBEAT_INTERVAL_MS = 20_000;

export interface UseEditingPresenceOptions {
  readonly academyId: string;
  readonly pageId: string;
  /** False for a read-only viewer: they are not editing, so they announce nothing. */
  readonly enabled: boolean;
}

export function useEditingPresence({
  academyId,
  pageId,
  enabled,
}: UseEditingPresenceOptions): readonly EditingParticipant[] {
  const [participants, setParticipants] = useState<readonly EditingParticipant[]>([]);
  // Kept in a ref so the effect below does not need it as a dependency —
  // it only ever reads it during teardown.
  const releasedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !academyId || !pageId) return;

    let cancelled = false;
    releasedRef.current = false;

    const beat = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const result = await websiteConfigurationService.heartbeatPageEditingSession(
          academyId,
          pageId
        );
        if (!cancelled) setParticipants(result.participants);
      } catch {
        // Advisory only — see this file's own doc comment. An editor whose
        // presence request fails keeps editing, and its save is still
        // protected by the version check.
        if (!cancelled) setParticipants([]);
      }
    };

    void beat();
    const timer = window.setInterval(() => void beat(), HEARTBEAT_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void beat();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);

      // Best-effort: tells colleagues immediately rather than making them
      // wait out the TTL. Never required for correctness — closing a laptop
      // never sends this, and the TTL covers exactly that case.
      if (!releasedRef.current) {
        releasedRef.current = true;
        void websiteConfigurationService
          .releasePageEditingSession(academyId, pageId)
          .catch(() => undefined);
      }
    };
  }, [academyId, pageId, enabled]);

  return participants;
}
