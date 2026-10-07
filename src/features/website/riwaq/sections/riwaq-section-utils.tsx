/**
 * Preview-only frames for Riwaq's live sections: when the public site
 * would leave a section out (no data yet, or the data failed to load), a
 * dashboard preview says why instead — the same rules Themes 1–3 follow.
 * The public route never shows a sample.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RiwaqBand, RiwaqSectionHead, type RiwaqGround } from '../riwaq-parts';

/** Shown only in previews, where a publicly hidden section needs a reason. */
export function RiwaqPreviewNote({
  children,
}: {
  readonly children: string;
}): JSX.Element {
  return (
    <RiwaqBand label={children} tight colonnade={false}>
      <p data-preview-note="" className="rw-note">
        {children}
      </p>
    </RiwaqBand>
  );
}

/**
 * A live section whose data could not be loaded. Never presented as "no
 * data": the public site leaves the section out, a preview says plainly
 * that the live data failed to load.
 */
export function RiwaqLiveDataUnavailable({
  isPublic,
}: {
  readonly isPublic: boolean;
}): JSX.Element | null {
  const { t } = useTranslation();
  if (isPublic) return null;
  return (
    <RiwaqPreviewNote>
      {t('website:riwaq.home.liveData.previewUnavailable')}
    </RiwaqPreviewNote>
  );
}

/**
 * The preview-only frame for a live section with no data yet: its head, a
 * "Sample" note saying why visitors don't see it, then labelled
 * placeholders. Never rendered on the public route.
 */
export function RiwaqPreviewSample({
  headingId,
  label,
  title,
  description,
  note,
  ground = 'porcelain',
  children,
}: {
  readonly headingId: string;
  readonly label?: string;
  readonly title: string;
  readonly description?: string;
  readonly note: string;
  readonly ground?: RiwaqGround;
  readonly children: ReactNode;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <RiwaqBand
      ground={ground}
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : note}
    >
      <div data-preview-sample="">
        <RiwaqSectionHead
          id={headingId}
          label={label}
          title={title}
          description={description}
        />
        <p data-preview-note="" className="rw-note mb-8">
          <span className="rw-badge">
            {t('website:renderer.testimonials.sampleBadge')}
          </span>
          {note}
        </p>
        {children}
      </div>
    </RiwaqBand>
  );
}
