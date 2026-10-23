/**
 * Manara — the custom section (CMS phase 3c): the shared body
 * (`sections/bodies/CustomColumns`) in a Manara block: its eyebrow-and-title
 * opening, the display face for headings, block-coloured icon tiles, round
 * ticks, framed media and Manara's actions (the accent button first, then
 * the outline, then the link, unless the Owner chose a look). Colours come
 * from the block's ground (`--mn-env-*`), so every ground reads.
 *
 * A section group of its own (`section-groups.tsx`): only pages that use a
 * custom section download it.
 */
import { useId } from 'react';
import { cn } from '@utils';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import {
  CustomColumns,
  customHeadingDomId,
} from '@/features/website/sections/bodies/CustomColumns';
import {
  firstCustomHeadingId,
  hasCustomContent,
  resolveCustomSection,
} from '@/features/website/sections/bodies/custom-section.logic';
import { useSectionDesign } from '@/features/website/sections/section-design';
import {
  ManaraAction,
  ManaraBlock,
  ManaraHeading,
  ManaraMedia,
  ManaraSectionHeader,
  type ManaraActionVariant,
} from '../manara-parts';

const POSITION_LOOKS: readonly ManaraActionVariant[] = [
  'accent',
  'outline',
  'link',
];

export function ManaraCustom({
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
    <ManaraBlock
      labelledBy={
        section.title
          ? titleId
          : firstHeading
            ? customHeadingDomId(key, firstHeading)
            : undefined
      }
    >
      <ManaraSectionHeader
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
          renderHeading: ({ id, level, children }) => (
            <ManaraHeading
              as={level}
              id={id}
              size={level === 'h2' ? 'title' : 'subtitle'}
            >
              {children}
            </ManaraHeading>
          ),
          renderAction: (cta, position) => (
            <ManaraAction
              cta={cta}
              pages={pages}
              linkRenderer={linkRenderer}
              variant={POSITION_LOOKS[position] ?? 'link'}
              arrow={position === 0}
            />
          ),
          renderImage: ({ value, alt, frameClassName, sizes }) => (
            <ManaraMedia
              value={value}
              alt={alt}
              sizes={sizes}
              className={cn('w-full', frameClassName)}
            />
          ),
          classes: {
            text: 'mn-body mn-muted',
            videoFrame: 'mn-frame mnx-video-frame',
            videoPlay: 'mnx-video-play',
            checkItem: 'font-medium',
            checkMark: 'mnx-mark',
            divider: 'border-[var(--mn-env-line)]',
            iconPlate: 'mnh-feature-icon',
            iconTitle: 'mn-font-display text-lg font-extrabold leading-snug',
            iconBody: 'mn-muted leading-relaxed',
            note: 'border-[var(--mn-env-line)] mn-muted',
          },
        }}
      />
    </ManaraBlock>
  );
}
