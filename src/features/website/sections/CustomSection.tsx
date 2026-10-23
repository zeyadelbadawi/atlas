/**
 * Custom section (CMS phase 3c) — the base renderer, for any theme without
 * its own (the retired themes): the shared body (`bodies/CustomColumns`) in
 * the theme-neutral frame, heading and buttons the other base renderers use.
 * Loaded only by pages that draw one (`section-groups.tsx`, `base:custom`).
 */
import { useId } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '@utils';
import type { CustomSectionConfig, WebsitePage } from '@types';
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';
import { ThemeImage } from '../theme-assets';
import { useSectionDesignAttributes } from './section-design';
import { BaseSectionAction } from './engage/BaseSectionAction';
import { CustomColumns, customHeadingDomId } from './bodies/CustomColumns';
import {
  firstCustomHeadingId,
  hasCustomContent,
  resolveCustomSection,
} from './bodies/custom-section.logic';

const LOOKS = ['primary', 'secondary', 'link'] as const;

export function CustomSection({
  config,
  pages,
  linkRenderer,
}: {
  readonly config: CustomSectionConfig;
  readonly pages: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
}): JSX.Element | null {
  const container = useWebsiteContainerClass();
  const sectionClass = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const designAttributes = useSectionDesignAttributes();
  const { locale } = usePublicWebsiteLocale();
  const key = useId();
  const isPublic = !!linkRenderer;
  const section = resolveCustomSection(config, locale, pages, isPublic);
  if (isPublic && !hasCustomContent(section)) return null;
  const titleId = `${key}-title`;
  const firstHeading = firstCustomHeadingId(section);

  return (
    <section
      aria-labelledby={
        section.title
          ? titleId
          : firstHeading
            ? customHeadingDomId(key, firstHeading)
            : undefined
      }
      {...designAttributes}
      className={`${container} ${sectionClass}`}
    >
      {section.title || section.description ? (
        <div className="mb-10 max-w-2xl space-y-2">
          {section.title ? (
            <h2
              id={titleId}
              className={`${heading} break-words text-3xl text-foreground`}
            >
              {section.title}
            </h2>
          ) : null}
          {section.description ? (
            <p className="break-words text-muted-foreground">
              {section.description}
            </p>
          ) : null}
        </div>
      ) : null}
      <CustomColumns
        section={section}
        sectionKey={key}
        isPublic={isPublic}
        kit={{
          renderHeading: ({ id, level: Level, children }) => (
            <Level
              id={id}
              className={cn(
                heading,
                'break-words text-foreground',
                Level === 'h2' ? 'text-3xl' : 'text-xl'
              )}
            >
              {children}
            </Level>
          ),
          renderAction: (cta, position) => (
            <BaseSectionAction
              cta={cta}
              pages={pages}
              linkRenderer={linkRenderer}
              look={LOOKS[position] ?? 'link'}
            />
          ),
          renderImage: ({ value, alt, frameClassName, sizes }) => (
            <div
              className={cn(
                'relative overflow-hidden bg-muted',
                frameClassName
              )}
              style={{ borderRadius: 'var(--website-radius)' }}
            >
              <ThemeImage
                value={value}
                alt={alt}
                sizes={sizes}
                loading="lazy"
                className="size-full object-cover"
                fallback={
                  <div
                    aria-hidden
                    className="flex size-full items-center justify-center text-muted-foreground"
                  >
                    <ImageIcon className="size-7 opacity-50" />
                  </div>
                }
              />
            </div>
          ),
          classes: {
            text: 'leading-relaxed text-muted-foreground',
            videoFrame: 'rounded-[var(--website-radius)] bg-muted',
            videoPlay:
              'size-16 rounded-full bg-[var(--website-primary-solid)] text-white',
            checkMark:
              'mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--website-primary-solid)] text-white',
            checkItem: 'text-foreground',
            divider: 'border-border',
            iconPlate:
              'inline-flex size-11 items-center justify-center rounded-md bg-muted text-[var(--website-primary-solid)]',
            iconTitle: 'font-semibold text-foreground',
            iconBody: 'text-sm leading-relaxed text-muted-foreground',
            note: 'border-border text-muted-foreground',
          },
        }}
      />
    </section>
  );
}
