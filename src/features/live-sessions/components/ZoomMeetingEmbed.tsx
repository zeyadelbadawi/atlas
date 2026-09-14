/**
 * The embedded Zoom meeting — a Live Session as a first-class Atlas
 * activity rather than a link that throws the student out of the product.
 *
 * COMPONENT VIEW, NOT CLIENT VIEW. Zoom's Web SDK offers both. Client View
 * seizes the whole document (it renders into its own `#zmmtg-root` and
 * hides the host page), which would mean leaving Atlas's shell, losing the
 * sidebar, and — the part that actually matters — losing RTL, because the
 * SDK's own chrome does not follow Atlas's direction. Component View
 * renders into a container we own, so the meeting sits INSIDE the course
 * page the way a lesson video does.
 *
 * THE SDK IS LOADED ON DEMAND. `@zoom/meetingsdk` is roughly ten megabytes.
 * Importing it at module scope would put it in the bundle every Atlas user
 * downloads, including the overwhelming majority who never open a live
 * session. The dynamic `import()` means it is fetched the moment a student
 * actually joins and never before.
 *
 * WHAT THIS COMPONENT IS NOT TRUSTED WITH. It receives a signature that
 * was minted server-side for one meeting, one role and one identity, and
 * it cannot alter any of them — the role is inside the signed payload. It
 * never sees the SDK secret, the account credentials, or a join URL. The
 * `customerKey` it passes is Atlas's own opaque participant key, which is
 * what makes attendance exact rather than matched on a display name.
 *
 * SDK EVENTS ARE NOT ATTENDANCE. This component reports nothing about who
 * was present. A browser can be lied to, closed, or throttled; attendance
 * comes from the provider's webhooks and post-session report, decided
 * server-side. The only thing a leave event does here is return the
 * student to the session page.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { LiveSessionJoinAuthorization } from '@types';

export interface ZoomMeetingEmbedProps {
  readonly authorization: LiveSessionJoinAuthorization;
  /** The display name shown to other participants. Never the identity attendance uses. */
  readonly userName: string;
  readonly onLeave: () => void;
}

type EmbedState = 'loading' | 'joining' | 'joined' | 'failed';

export function ZoomMeetingEmbed({
  authorization,
  userName,
  onLeave,
}: ZoomMeetingEmbedProps): JSX.Element {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<EmbedState>('loading');
  /*
    The SDK client, kept in a ref rather than state.

    It is a long-lived imperative object, not rendering data; putting it in
    state would re-render the tree on every internal change and risk
    tearing down the very container the meeting is painted into.
  */
  const clientRef = useRef<{ leaveMeeting: () => void } | null>(null);
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;

  const leave = useCallback(() => {
    try {
      clientRef.current?.leaveMeeting();
    } catch {
      // Leaving a meeting that already ended is not an error worth
      // showing anybody.
    }
    onLeaveRef.current();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function start(): Promise<void> {
      try {
        // Fetched only now — see the note on bundle size above.
        const { default: ZoomMtgEmbedded } = await import('@zoom/meetingsdk/embedded');
        if (cancelled || !containerRef.current) return;

        const client = ZoomMtgEmbedded.createClient();
        clientRef.current = client as unknown as { leaveMeeting: () => void };

        await client.init({
          zoomAppRoot: containerRef.current,
          /*
            THE SDK'S OWN CHROME IS ENGLISH, AND THAT IS A ZOOM LIMIT, not
            an Atlas one. Zoom's Web SDK ships no Arabic locale, so the
            buttons inside the meeting widget stay English for an Arabic
            user. Everything Atlas draws around it — the page, the states,
            the schedule, the controls below — is fully translated and RTL.
            Pretending otherwise with a mistranslated locale code would
            just fail to initialise.
          */
          language: 'en-US',
          patchJsMedia: true,
          customize: {
            video: { isResizable: true, popper: { disableDraggable: true } },
          },
        });

        if (cancelled) return;
        setState('joining');

        await client.join({
          signature: authorization.signature,
          sdkKey: authorization.sdkKey,
          meetingNumber: authorization.providerMeetingId,
          userName,
          /*
            NOTE THE ABSENCE OF `customerKey`.

            Atlas's participant identity IS supplied — but inside the
            SIGNED payload, server-side, where this component cannot reach
            it. Passing it again as a join option would mean the browser
            nominating its own identity, and a student who edited that
            value would have their attendance recorded against a
            classmate's key. Keeping it in the signature is what makes the
            identity bridge unforgeable, so the client is deliberately
            never told what its own participant key is.
          */
          // Present only for the host. Without it a host joining a
          // meeting that forbids joining before the host waits in their
          // own classroom and nobody else can get in.
          ...(authorization.hostToken ? { zak: authorization.hostToken } : {}),
        });

        if (!cancelled) setState('joined');
      } catch {
        // The provider's own error text is not surfaced: it is written for
        // developers, is not translated, and can carry identifiers. The
        // student gets an actionable sentence instead.
        if (!cancelled) setState('failed');
      }
    }

    void start();

    return () => {
      cancelled = true;
      try {
        clientRef.current?.leaveMeeting();
      } catch {
        // Unmounting during a failed join — nothing to leave.
      }
    };
  }, [authorization, userName, t]);

  return (
    <div className="space-y-3">
      {state === 'failed' ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{t('liveSessions:student.embed.failed')}</span>
            <Button size="sm" variant="outline" onClick={onLeave}>
              {t('liveSessions:student.embed.back')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {state === 'loading' || state === 'joining' ? (
        <div
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface p-8 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {t(
            state === 'loading'
              ? 'liveSessions:student.embed.loading'
              : 'liveSessions:student.embed.joining',
          )}
        </div>
      ) : null}

      {/*
        The meeting's own container.

        `dir="ltr"` is deliberate and is the one place Atlas stops being
        RTL. The SDK paints its own controls with absolute positioning that
        assumes a left-to-right box; inheriting `dir="rtl"` mirrors the
        video tiles and puts the toolbar off-screen. The page AROUND it
        stays RTL — this is scoped to the widget Zoom owns, not a
        concession on the feature's direction support.

        `min-h` rather than a fixed height so the meeting grows on a
        desktop and stays usable on a phone, with no per-device breakpoint.
      */}
      <div
        ref={containerRef}
        dir="ltr"
        className="min-h-[60vh] w-full overflow-hidden rounded-lg border border-border bg-black sm:min-h-[70vh]"
      />

      {state === 'joined' ? (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={leave}>
            {t('liveSessions:student.embed.leave')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
