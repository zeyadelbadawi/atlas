/**
 * The preview-only frames a live section uses when the public site would not
 * draw it (the same §D.4 rules Theme 1 follows — a preview explains a
 * hidden section, the public route never shows a sample).
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AtelierChapter, AtelierSectionHeader } from '../atelier-parts';
import '../atelier-sections.css';

/** Shown only in previews, where a publicly hidden section needs a reason. */
export function AtelierPreviewNote({
  children,
}: {
  readonly children: string;
}): JSX.Element {
  return (
    <AtelierChapter label={children} className="ath-preview-chapter">
      <p data-preview-note="" className="ath-preview-note">
        {children}
      </p>
    </AtelierChapter>
  );
}

/**
 * A live section whose data could not be loaded. Never presented as "no
 * data": the public site leaves the section out, a preview says plainly
 * that the live data failed to load.
 */
export function AtelierLiveDataUnavailable({
  isPublic,
}: {
  readonly isPublic: boolean;
}): JSX.Element | null {
  const { t } = useTranslation();
  if (isPublic) return null;
  return (
    <AtelierPreviewNote>
      {t('website:atelier.home.liveData.previewUnavailable')}
    </AtelierPreviewNote>
  );
}

/**
 * The preview-only frame for a live section with no data yet: its own
 * heading, a "Sample" note saying why visitors don't see it, then labelled
 * placeholders. Never rendered on the public route.
 */
export function AtelierPreviewSample({
  headingId,
  title,
  description,
  note,
  env = 'paper',
  children,
}: {
  readonly headingId: string;
  readonly title: string;
  readonly description?: string;
  readonly note: string;
  readonly env?: 'paper' | 'ink';
  readonly children: ReactNode;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <AtelierChapter
      env={env}
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : note}
    >
      <div data-preview-sample="">
        <AtelierSectionHeader
          id={headingId}
          title={title}
          description={description}
          numbered={false}
          className="!mb-8"
        />
        <p data-preview-note="" className="ath-sample-note">
          <span className="ath-sample-badge">
            {t('website:renderer.testimonials.sampleBadge')}
          </span>
          {note}
        </p>
        {children}
      </div>
    </AtelierChapter>
  );
}
