/**
 * Theme 1 — the custom section (CMS phase 3c): the shared body
 * (`sections/bodies/CustomColumns`) in Theme 1's frame (`T1Section`), its
 * heading block, display headings, actions (bold first, then outline, then a
 * text link, unless the Owner chose a look), media frames, icon tiles and
 * plan ticks — brand-mapped colours only (`--website-*`).
 *
 * A section group of its own (`section-groups.tsx`): only pages that use a
 * custom section download it.
 */
import { useId } from 'react';
import { cn } from '@utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import type { SectionRenderProps } from '../theme-packs/theme-pack.types';
import {
  CustomColumns,
  customHeadingDomId,
} from '../sections/bodies/CustomColumns';
import {
  firstCustomHeadingId,
  hasCustomContent,
  resolveCustomSection,
} from '../sections/bodies/custom-section.logic';
import { useSectionDesign } from '../sections/section-design';
import {
  T1Action,
  T1Heading,
  T1Media,
  T1Section,
  T1SectionHeader,
  type T1ActionVariant,
} from './t1-parts';

const POSITION_LOOKS: readonly T1ActionVariant[] = [
  'primary',
  'secondary',
  'link',
];

export function T1Custom({
  config,
  pages,
  linkRenderer,
}: SectionRenderProps<'custom'>): JSX.Element | null {
  const { locale } = usePublicWebsiteLocale();
  const { design } = useSectionDesign();
  const key = useId();
  const isPublic = !!linkRenderer;
  const section = resolveCustomSection(config, locale, pages, isPublic);
  if (isPublic && !hasCustomContent(section)) return null;
  const titleId = `${key}-title`;
  const firstHeading = firstCustomHeadingId(section);

  return (
    <T1Section
      labelledBy={
        section.title
          ? titleId
          : firstHeading
            ? customHeadingDomId(key, firstHeading)
            : undefined
      }
    >
      <T1SectionHeader
        id={titleId}
        title={section.title}
        description={section.description}
        align={design?.align === 'center' ? 'center' : 'start'}
      />
      <CustomColumns
        section={section}
        sectionKey={key}
        isPublic={isPublic}
        kit={{
          renderHeading: ({ id, level, children }) =>
            level === 'h2' ? (
              <T1Heading id={id}>{children}</T1Heading>
            ) : (
              <h3
                id={id}
                className="break-words font-display text-xl font-bold leading-snug text-[var(--website-foreground)] [text-wrap:balance] md:text-2xl"
              >
                {children}
              </h3>
            ),
          renderAction: (cta, position) => (
            <T1Action
              cta={cta}
              pages={pages}
              linkRenderer={linkRenderer}
              variant={POSITION_LOOKS[position] ?? 'link'}
              arrow={position === 0}
            />
          ),
          renderImage: ({ value, alt, frameClassName, sizes }) => (
            <T1Media
              value={value}
              alt={alt}
              sizes={sizes}
              className={cn('w-full', frameClassName)}
            />
          ),
          classes: {
            text: 'text-[1.0625rem] leading-relaxed text-[var(--website-foreground-muted)]',
            actions: 'gap-x-5',
            videoFrame: 't1-media t1-video-frame',
            videoPlay: 't1-video-play',
            checkItem: 'text-[var(--website-foreground)]',
            checkMark: 't1-plan-mark',
            divider: 'border-[var(--website-border)]',
            iconPlate: 't1-icon-tile',
            iconTitle: 'font-semibold text-[var(--website-foreground)]',
            iconBody: 'leading-relaxed text-[var(--website-foreground-muted)]',
            note: 'rounded-[var(--t1-radius-card)] border-[var(--website-input-border)] text-[var(--website-foreground-muted)]',
          },
        }}
      />
    </T1Section>
  );
}
