/**
 * Timeline (CMS phase 3d, batch D) — the base renderer: a learning path as
 * an ordered list down a spine (`bodies/TimelineList`). The public site
 * leaves the section out until it has a milestone; a preview says what to
 * add.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import { TimelineList } from './bodies/TimelineList';
import { resolveTimeline } from './bodies/journey-proof.logic';
import { PreviewEmptyNote } from './bodies/PreviewEmptyNote';
import type { TimelineSectionConfig } from '@types';

export function TimelineSection({
  config,
  isPublic = false,
}: {
  readonly config: TimelineSectionConfig;
  readonly isPublic?: boolean;
}): JSX.Element | null {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const milestones = resolveTimeline(config, locale);
  if (milestones.length === 0 && isPublic) return null;
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={`${container} ${section}`}
    >
      {title || description ? (
        <div className="mb-10 max-w-2xl space-y-2">
          {title ? (
            <h2
              id={headingId}
              className={`${heading} break-words text-3xl text-foreground`}
            >
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="break-words text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      {milestones.length > 0 ? (
        <TimelineList
          milestones={milestones}
          locale={locale}
          classes={{
            list: 'max-w-3xl',
            line: 'bg-border',
            marker:
              'rounded-full bg-[var(--website-primary-solid)] text-sm font-semibold text-white',
            content: 'pt-2',
            period: 'mb-1 text-sm font-medium text-muted-foreground',
            title: 'text-lg font-semibold text-foreground',
            description: 'text-muted-foreground',
          }}
        />
      ) : (
        <PreviewEmptyNote className="border-border text-muted-foreground">
          {t('website:renderer.timeline.previewEmpty')}
        </PreviewEmptyNote>
      )}
    </section>
  );
}
