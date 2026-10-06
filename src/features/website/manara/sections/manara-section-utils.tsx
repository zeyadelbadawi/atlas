/**
 * Helpers shared by Manara's section renderers: the stagger for a group's
 * entrance, paragraph splitting, the theme's course images, and the
 * preview-only frames a live section shows when the public site would not
 * draw it (the same rules Theme 1 and Atelier follow — a preview explains a
 * hidden section; the public route never shows a sample).
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ManaraBlock,
  ManaraSectionHeader,
  type ManaraEnv,
} from '../manara-parts';
import '../manara-sections.css';

/** Shown only in previews, where a publicly hidden section needs a reason. */
export function ManaraPreviewNote({
  children,
}: {
  readonly children: string;
}): JSX.Element {
  return (
    <ManaraBlock label={children} tight className="mnh-preview-block">
      <p data-preview-note="" className="mnh-preview-note">
        {children}
      </p>
    </ManaraBlock>
  );
}

/**
 * A live section whose data could not be loaded. Never presented as "no
 * data": the public site leaves the section out, a preview says plainly
 * that the live data failed to load.
 */
export function ManaraLiveDataUnavailable({
  isPublic,
}: {
  readonly isPublic: boolean;
}): JSX.Element | null {
  const { t } = useTranslation();
  if (isPublic) return null;
  return (
    <ManaraPreviewNote>
      {t('website:manara.home.liveData.previewUnavailable')}
    </ManaraPreviewNote>
  );
}

/**
 * The preview-only frame for a live section with no data yet: its own
 * heading, a "Sample" note saying why visitors don't see it, then labelled
 * placeholders. Never rendered on the public route.
 */
export function ManaraPreviewSample({
  headingId,
  title,
  description,
  note,
  env = 'day',
  children,
}: {
  readonly headingId: string;
  readonly title: string;
  readonly description?: string;
  readonly note: string;
  readonly env?: ManaraEnv;
  readonly children: ReactNode;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <ManaraBlock
      env={env}
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : note}
    >
      <div data-preview-sample="">
        <ManaraSectionHeader
          id={headingId}
          title={title}
          description={description}
          className="!mb-8"
        />
        <p data-preview-note="" className="mnh-sample-note">
          <span className="mnh-sample-badge">
            {t('website:renderer.testimonials.sampleBadge')}
          </span>
          {note}
        </p>
        {children}
      </div>
    </ManaraBlock>
  );
}
