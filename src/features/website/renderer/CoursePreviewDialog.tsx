/**
 * The public course preview (P64 Phase 4).
 *
 * The free sample a prospective student watches before buying. The server
 * has always allowed this — `LessonContentService.getContent()`
 * short-circuits on `isOpenPreview` and its route is behind
 * `OptionalJwtAuthGuard` — so this asks for a grant with whatever session
 * the visitor has, including none at all.
 *
 * WHY IT REUSES `useLessonGrant` rather than fetching a grant itself: a
 * grant is a credential with an expiry, and that hook is the one place
 * that already knows not to carry one lesson's credential onto another
 * lesson's screen, when a credential has died, and how to classify a
 * refusal. A second, simpler copy here would be a second place for those
 * rules to be wrong. Nothing in it needs a session — it keys on
 * `user?.id`, which is simply undefined for a visitor.
 *
 * WHY IT DOES NOT REUSE `ProtectedVideoPlayer`: that player requires
 * watermark text, a resume position and credential-failure callbacks —
 * all session concepts. An anonymous visitor has no identity to watermark
 * and no progress to resume, and inventing those values to satisfy a prop
 * type would put a claim on screen that nothing backs. A marketing
 * preview is honestly just a video element.
 */
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { YouTubeLessonPlayer } from '@features/learner';
import { useLessonGrant } from '@features/learner';

export interface CoursePreviewDialogProps {
  readonly courseId: string;
  readonly lessonId: string | null;
  readonly lessonTitle: string;
  readonly onOpenChange: (open: boolean) => void;
}

export function CoursePreviewDialog({
  courseId,
  lessonId,
  lessonTitle,
  onOpenChange,
}: CoursePreviewDialogProps): JSX.Element {
  const { t } = useTranslation();
  const open = !!lessonId;

  // `sequenceSaysAvailable` is a learner-sequence concept; a visitor has
  // no sequence, and the preview short-circuit is the authority here.
  const { grant, isLoading, failure } = useLessonGrant(
    courseId,
    lessonId ?? '',
    {
      enabled: open,
    }
  );

  const body = (): JSX.Element => {
    if (isLoading) {
      return (
        <div
          className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden />
          <span>{t('website:renderer.courseDetails.previewLoading')}</span>
        </div>
      );
    }

    // Any refusal reads the same to a visitor on purpose: the server
    // answers an unreachable lesson with 404 so a preview flag can never
    // be turned into an oracle for a paid catalogue's lesson ids, and
    // restating a reason here would undo that.
    if (failure || !grant) {
      return (
        <p
          className="py-10 text-center text-sm text-muted-foreground"
          role="status"
        >
          {t('website:renderer.courseDetails.previewUnavailable')}
        </p>
      );
    }

    if (grant.kind === 'external' && grant.externalEmbed) {
      return (
        <YouTubeLessonPlayer embed={grant.externalEmbed} title={grant.title} />
      );
    }

    if (grant.video) {
      return (
        <div className="overflow-hidden rounded-lg bg-black">
          <AspectRatio ratio={16 / 9}>
            <video
              key={grant.video.url}
              src={grant.video.url}
              poster={grant.video.posterUrl}
              controls
              controlsList="nodownload"
              disablePictureInPicture={false}
              preload="metadata"
              className="size-full"
              data-testid="course-preview-video"
            >
              {/* No captions track is delivered with a preview grant; saying
                  so is better than implying one exists. */}
            </video>
          </AspectRatio>
        </div>
      );
    }

    // A preview lesson may legitimately be text or a file. Those are not
    // a video preview, and pretending to play one would be worse than
    // saying plainly what this is.
    return (
      <p
        className="py-10 text-center text-sm text-muted-foreground"
        role="status"
      >
        {t('website:renderer.courseDetails.previewNotPlayable')}
      </p>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-start">
            {t('website:renderer.courseDetails.previewDialogTitle')}
          </DialogTitle>
          <DialogDescription className="text-start">
            {t('website:renderer.courseDetails.previewDialogDescription')}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm font-medium text-foreground">{lessonTitle}</p>
        {body()}
      </DialogContent>
    </Dialog>
  );
}
