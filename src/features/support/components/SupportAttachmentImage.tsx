/**
 * P53 — an attachment as it appears inside a conversation.
 *
 * Renders at a bounded size rather than full width: a screenshot is
 * evidence attached to a sentence, not the message itself, so it must not
 * push the text it belongs to off the screen. Clicking opens the full image
 * in a new tab from the already-fetched object URL — no second request, and
 * no download link (a viewer sandbox or a bearer-token route would make a
 * plain `<a download>` unreliable, and the browser's own "open image" is
 * what people expect).
 *
 * `alt` is the stored file name. There is no alt-text field on a support
 * attachment (see `SupportAttachmentInputDto`), and inventing an empty alt
 * would leave a screen-reader user with no indication that the message
 * carries an image at all.
 */
import { useTranslation } from 'react-i18next';
import { ImageOff, Loader2 } from 'lucide-react';
import { useSupportAttachmentUrl } from '../hooks/useSupportAttachmentUrl';
import type { SupportCaseAttachment } from '@types';

export interface SupportAttachmentImageProps {
  readonly attachment: SupportCaseAttachment;
}

export function SupportAttachmentImage({
  attachment,
}: SupportAttachmentImageProps): JSX.Element {
  const { t } = useTranslation();
  const state = useSupportAttachmentUrl(attachment.url);

  if (state.status === 'loading') {
    return (
      <div
        className="flex h-24 w-40 items-center justify-center rounded-md border border-border bg-muted"
        data-testid="support-attachment-loading"
      >
        <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">{t('support:attachment.loading')}</span>
      </div>
    );
  }

  if (state.status === 'failed') {
    return (
      <div
        className="flex h-24 w-40 flex-col items-center justify-center gap-1 rounded-md border border-border bg-muted p-2 text-center"
        data-testid="support-attachment-failed"
      >
        <ImageOff className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-xs text-muted-foreground">
          {t('support:attachment.unavailable')}
        </span>
      </div>
    );
  }

  return (
    <a
      href={state.objectUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-block max-w-full rounded-md border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-testid="support-attachment-image"
    >
      <img
        src={state.objectUrl}
        // The file name the requester's own machine gave the file. Shown to
        // assistive technology; never used to address storage.
        alt={attachment.fileName}
        className="max-h-64 max-w-full rounded-md object-contain"
      />
    </a>
  );
}
