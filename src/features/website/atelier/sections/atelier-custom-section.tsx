/**
 * Atelier — the custom section (CMS phase 3c): the shared body
 * (`sections/bodies/CustomColumns`) as an Atelier chapter: the chapter mark
 * and serif heading block, serif headings, hairline rules, framed plates,
 * brand ticks and Atelier's actions (the brand button first, then the ghost
 * button, then the underlined link, unless the Owner chose a look).
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
  AtelierAction,
  AtelierChapter,
  AtelierHeading,
  AtelierMedia,
  AtelierSectionHeader,
  type AtelierActionVariant,
} from '../atelier-parts';

const POSITION_LOOKS: readonly AtelierActionVariant[] = [
  'primary',
  'ghost',
  'link',
];

export function AtelierCustom({
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
  const hasHeader = !!(section.title || section.description);

  return (
    <AtelierChapter
      labelledBy={
        section.title
          ? titleId
          : firstHeading
            ? customHeadingDomId(key, firstHeading)
            : undefined
      }
      numbered={hasHeader}
    >
      {hasHeader ? (
        <AtelierSectionHeader
          id={titleId}
          title={section.title}
          description={section.description}
        />
      ) : null}
      <CustomColumns
        section={section}
        sectionKey={key}
        isPublic={isPublic}
        kit={{
          renderHeading: ({ id, level, children }) => (
            <AtelierHeading
              as={level}
              id={id}
              size={level === 'h2' ? 'title' : 'subtitle'}
              className="max-w-4xl"
            >
              {children}
            </AtelierHeading>
          ),
          renderAction: (cta, position) => (
            <AtelierAction
              cta={cta}
              pages={pages}
              linkRenderer={linkRenderer}
              variant={POSITION_LOOKS[position] ?? 'link'}
            />
          ),
          renderImage: ({ value, alt, frameClassName, sizes }) => (
            <AtelierMedia
              value={value}
              alt={alt}
              sizes={sizes}
              className={cn('w-full', frameClassName)}
            />
          ),
          classes: {
            grid: 'lg:gap-x-16',
            column: 'gap-6',
            text: 'max-w-[var(--at-measure)] text-[1.0625rem] leading-relaxed text-[var(--atelier-text-muted)]',
            actions: 'gap-x-6',
            videoFrame: 'at-frame atx-video-frame',
            videoPlay: 'atx-video-play',
            checklist: 'max-w-[var(--at-measure)]',
            checkItem: 'text-[var(--atelier-text)]',
            checkMark: 'atx-mark',
            divider: 'border-[var(--atelier-hairline)]',
            iconPlate:
              'inline-flex size-11 items-center justify-center rounded-full border border-[var(--atelier-hairline)] text-[var(--atelier-brand)]',
            iconTitle:
              'at-serif text-lg leading-snug text-[var(--atelier-text)]',
            iconBody: 'leading-relaxed text-[var(--atelier-text-muted)]',
            note: 'border-[var(--atelier-hairline)] text-[var(--atelier-text-muted)]',
          },
        }}
      />
    </AtelierChapter>
  );
}
