/**
 * One LESSON inside the player shell — the grant, the media, the
 * heartbeat and every state in between (§E.3).
 *
 * THE ORDER OF THE STATES IS THE DESIGN. A lesson screen can be, in
 * descending order of how much it stops the learner: refused outright
 * (access ended, device cap, session conflict), lease-lost (content is
 * there, playback is paused, nothing is lost), loading, or playing. This
 * component resolves them top-down so a lower state can never render on
 * top of a higher one — showing a video with an "access ended" banner
 * above it is exactly the failure §I exists to prevent.
 *
 * THE FOUR KINDS EACH GET THEIR OWN VIEW, chosen by `grant.kind` and
 * nothing else. In particular `external` is labelled as unprotected in as
 * many words: Atlas does not host it, cannot sign it, cannot revoke it
 * and cannot watermark it, and a learner who is about to open it should
 * be told that rather than left to assume the protection badge above
 * covers it.
 *
 * COMPLETION IS THE SERVER'S DECISION. `completionEligible` comes back on
 * every heartbeat for a `watched_ratio` lesson, so the action bar can
 * offer completion the moment the rule is satisfied without a second
 * round-trip — and cannot offer it before, because the button is driven
 * by that flag rather than by anything this component measured.
 */
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, FileDown, PauseCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import type { LessonContentGrant } from '@types';
import { ProtectedVideoPlayer } from './ProtectedVideoPlayer';
import { ResourcesPanel } from './ResourcesPanel';
import { TextLessonView } from './TextLessonView';
import { YouTubeLessonPlayer } from './YouTubeLessonPlayer';

export interface LessonActivityViewProps {
  readonly grant: LessonContentGrant;
  /** False once another device took the lease — playback pauses, nothing is lost. */
  readonly leaseHeld: boolean;
  readonly onCredentialFailure: () => void;
  readonly onPositionSource: (getPosition: () => number) => void;
  /** Called when the media reaches its end, so auto-advance may arm. */
  readonly onFinished: () => void;
}

export function LessonActivityView({
  grant,
  leaseHeld,
  onCredentialFailure,
  onPositionSource,
  onFinished,
}: LessonActivityViewProps): JSX.Element {
  const { t } = useTranslation();
  const [readingPercentage, setReadingPercentage] = useState(0);
  const readingRef = useRef(readingPercentage);
  readingRef.current = readingPercentage;

  /*
   * A text lesson has no `currentTime`, so its "position" is the reading
   * percentage expressed as seconds of the lesson's nominal duration.
   * That keeps the heartbeat contract honest — the server is told where
   * the learner is, in the same unit, without this component inventing a
   * watched figure it has no way to know.
   */
  const textPositionSource = useCallback(() => {
    const duration = grant.durationSeconds ?? 0;
    return Math.round((readingRef.current / 100) * duration);
  }, [grant.durationSeconds]);

  const leaseNotice = !leaseHeld ? (
    <Alert role="status" className="border-warning">
      <PauseCircle className="size-4" aria-hidden />
      <AlertTitle>{t('learning:player.leaseLost.title')}</AlertTitle>
      <AlertDescription>
        {t('learning:player.leaseLost.description')}
      </AlertDescription>
    </Alert>
  ) : null;

  return (
    <div className="space-y-4">
      {leaseNotice}

      {grant.kind === 'video' && grant.video ? (
        <ProtectedVideoPlayer
          video={grant.video}
          expiresAt={grant.expiresAt}
          resumePositionSeconds={grant.resumePositionSeconds}
          lessonId={grant.lessonId}
          title={grant.title}
          watermarkText={grant.watermark.enabled ? grant.watermark.text : ''}
          resources={grant.resources}
          onCredentialFailure={onCredentialFailure}
          onPositionSource={onPositionSource}
          onEnded={onFinished}
          paused={!leaseHeld}
        />
      ) : null}

      {grant.kind === 'video' && !grant.video ? (
        /* A video lesson whose asset is not ready. The grant would
           normally be refused outright in that case, so this is the
           belt-and-braces branch: never an empty frame with controls. */
        <AspectRatio ratio={16 / 9}>
          <Skeleton className="size-full" />
        </AspectRatio>
      ) : null}

      {grant.kind === 'text' ? (
        <TextLessonView
          bodyHtml={grant.bodyHtml}
          title={grant.title}
          onReadingProgress={(percentage) => {
            setReadingPercentage(percentage);
            onPositionSource(textPositionSource);
            if (percentage >= 100) onFinished();
          }}
        />
      ) : null}

      {grant.kind === 'file' && grant.fileUrl ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {t('learning:player.file.description')}
          </p>
          <Button asChild>
            {/* The signed URL is rendered and nothing more — never copied,
                stored or preloaded. It dies with its presign. */}
            <a
              href={grant.fileUrl}
              target="_blank"
              rel="noreferrer noopener"
              download={grant.fileName}
            >
              <FileDown className="size-4" aria-hidden />
              {grant.fileName ?? t('learning:player.file.open')}
            </a>
          </Button>
          <p className="text-xs text-muted-foreground">
            {t('learning:player.file.expiryNote')}
          </p>
        </div>
      ) : null}

      {grant.kind === 'external' && grant.externalEmbed ? (
        /* A supported YouTube link plays INLINE, inside the same player
           shell as every other source. The server decided it was
           embeddable; the component embeds by id, never by URL. */
        <YouTubeLessonPlayer embed={grant.externalEmbed} title={grant.title} />
      ) : null}

      {grant.kind === 'external' &&
      !grant.externalEmbed &&
      grant.externalUrl ? (
        <div className="space-y-3">
          {/* The honesty requirement, stated before the link rather than
              after it: this content is not Atlas's to protect. */}
          <Alert>
            <ExternalLink className="size-4" aria-hidden />
            <AlertTitle>
              {t('learning:player.external.notProtectedTitle')}
            </AlertTitle>
            <AlertDescription>
              {t('learning:player.external.notProtectedDescription')}
            </AlertDescription>
          </Alert>

          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card py-12 text-center">
            <Button asChild variant="outline">
              <a
                href={grant.externalUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                <ExternalLink className="size-4" aria-hidden />
                {t('learning:player.external.open')}
              </a>
            </Button>
          </div>
        </div>
      ) : null}

      <ResourcesPanel resources={grant.resources} />
    </div>
  );
}
