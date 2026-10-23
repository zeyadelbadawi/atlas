/**
 * Riwaq — the custom section (CMS phase 3c): the shared body
 * (`sections/bodies/CustomColumns`) in a Riwaq band: the head on the page
 * grid, Riwaq's titles, ruled icon cells, marker ticks, windows for images
 * and Riwaq's actions (solid first, then the line button, then the link,
 * unless the Owner chose a look). Colours come from the band's ground
 * (`--rw-env-*`). One column sits beside the page rail, like the head's
 * title; two or three use the band's full width.
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
import {
  RiwaqAction,
  RiwaqBand,
  RiwaqHeading,
  RiwaqSectionHead,
  RiwaqWindow,
  type RiwaqActionVariant,
} from '../riwaq-parts';

const POSITION_LOOKS: readonly RiwaqActionVariant[] = ['solid', 'line', 'link'];

export function RiwaqCustom({
  config,
  pages,
  linkRenderer,
}: SectionRenderProps<'custom'>): JSX.Element | null {
  const { locale } = usePublicWebsiteLocale();
  const key = useId();
  const isPublic = !!linkRenderer;
  const section = resolveCustomSection(config, locale, pages, isPublic);
  if (isPublic && !hasCustomContent(section)) return null;
  const titleId = `${key}-title`;
  const firstHeading = firstCustomHeadingId(section);

  return (
    <RiwaqBand
      labelledBy={
        section.title
          ? titleId
          : firstHeading
            ? customHeadingDomId(key, firstHeading)
            : undefined
      }
    >
      <RiwaqSectionHead
        id={titleId}
        title={section.title}
        description={section.description}
      />
      <CustomColumns
        section={section}
        sectionKey={key}
        isPublic={isPublic}
        kit={{
          renderHeading: ({ id, level, children }) => (
            <RiwaqHeading
              as={level}
              id={id}
              size={level === 'h2' ? 'title' : 'subtitle'}
            >
              {children}
            </RiwaqHeading>
          ),
          renderAction: (cta, position) => (
            <RiwaqAction
              cta={cta}
              pages={pages}
              linkRenderer={linkRenderer}
              variant={POSITION_LOOKS[position] ?? 'link'}
              arrow={position === 0}
            />
          ),
          renderImage: ({ value, alt, frameClassName, sizes }) => (
            <RiwaqWindow
              value={value}
              alt={alt}
              sizes={sizes}
              className={cn('w-full', frameClassName)}
            />
          ),
          classes: {
            grid: cn(
              section.layout === 'one' && 'lg:ms-[calc(25%_+_var(--rw-gap)/4)]'
            ),
            text: 'rw-body leading-relaxed',
            videoFrame: 'rw-window rwx-video-frame',
            videoPlay: 'rwx-video-play',
            checkItem: 'text-[var(--rw-env-text)]',
            checkMark: 'rwx-mark',
            divider: 'border-[var(--rw-env-rule)]',
            iconPlate: 'rws-outcome-icon',
            iconTitle:
              'rw-subtitle !text-[clamp(1.125rem,1rem+0.5vw,1.375rem)]',
            iconBody: 'leading-relaxed text-[var(--rw-env-muted)]',
            note: 'border-[var(--rw-env-rule-strong)] text-[var(--rw-env-muted)]',
          },
        }}
      />
    </RiwaqBand>
  );
}
