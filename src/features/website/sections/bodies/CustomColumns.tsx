/**
 * CMS phase 3c — the custom section's shared body: its columns, each an
 * ordered list of elements, drawn with a theme's own pieces (`kit`).
 *
 * - The columns sit in one grid marked `data-ws-columns`, so the section
 *   design's "reverse order on phones" applies; below `md` they stack.
 *   Columns are logical: the first is on the right in Arabic.
 * - Headings keep the level the author chose (h2/h3): the section's title,
 *   when it has one, is the h2 above. Text is plain, one `<p>` per
 *   paragraph, line breaks kept (`whitespace-pre-line`) — never markup.
 * - Images sit in frames that reserve their ratio and load lazily; videos
 *   are batch A's click-to-play facade, so nothing from YouTube's player
 *   loads before the visitor presses play. Icons and ✓ marks are
 *   decorative (`aria-hidden`) beside the words they illustrate.
 * - No motion. The preview shows what the public site will leave out
 *   (an empty column, a picture or video not chosen yet) as notes.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { cn } from '@utils';
import type { WebsiteCta } from '@types';
import { resolveFeatureIcon } from '@/features/website/utils/feature-icons';
import { useSectionDesign } from '../section-design';
import { VideoFacade } from '../engage/VideoFacade';
import {
  CUSTOM_IMAGE_RATIO_CLASSES,
  customGridClass,
  customImageSizes,
  type ResolvedCustomElement,
  type ResolvedCustomSection,
} from './custom-section.logic';

/** What a theme passes to draw the body in its own language. */
export interface CustomColumnsKit {
  readonly renderHeading: (props: {
    readonly id: string;
    readonly level: 'h2' | 'h3';
    readonly children: string;
  }) => ReactNode;
  /** One button; `position` 0–2 picks the theme's look for its place in the row. */
  readonly renderAction: (cta: WebsiteCta, position: number) => ReactNode;
  readonly renderImage: (props: {
    readonly value: string | undefined;
    readonly alt: string;
    /** The reserved ratio (`aspect-*`). */
    readonly frameClassName: string;
    readonly sizes: string;
  }) => ReactNode;
  readonly classes: {
    /** The columns' grid (gap). */
    readonly grid?: string;
    /** One column: the gap between its elements. */
    readonly column?: string;
    readonly text?: string;
    /** A row of buttons. */
    readonly actions?: string;
    readonly videoFrame?: string;
    readonly videoPlay?: string;
    readonly checklist?: string;
    readonly checkItem?: string;
    readonly checkMark?: string;
    readonly divider?: string;
    readonly iconText?: string;
    readonly iconPlate?: string;
    readonly iconTitle?: string;
    readonly iconBody?: string;
    /** A preview-only note (an empty column, a video not chosen yet). */
    readonly note?: string;
  };
}

const SPACER_CLASSES = {
  small: 'h-2 md:h-3',
  medium: 'h-6 md:h-8',
  large: 'h-12 md:h-16',
} as const;

/** A heading element's id: unique on the page, stable for the section. */
export function customHeadingDomId(sectionKey: string, elementId: string) {
  return `${sectionKey}-h-${elementId}`;
}

export function CustomColumns({
  section,
  sectionKey,
  isPublic,
  kit,
}: {
  readonly section: ResolvedCustomSection;
  /** A per-section prefix (`useId`) for heading ids. */
  readonly sectionKey: string;
  readonly isPublic: boolean;
  readonly kit: CustomColumnsKit;
}): JSX.Element | null {
  const { t } = useTranslation();
  const { design } = useSectionDesign();
  if (section.columns.length === 0) return null;
  const single = section.layout === 'one';
  const centered = design?.align === 'center';

  const note = (text: string, className?: string) => (
    <p
      data-preview-note=""
      className={cn(
        'rounded-lg border border-dashed px-4 py-4 text-center text-sm',
        className,
        kit.classes.note
      )}
    >
      {text}
    </p>
  );

  const element = (
    item: ResolvedCustomElement,
    columnIndex: number
  ): ReactNode => {
    const { classes } = kit;
    switch (item.kind) {
      case 'heading':
        return item.text
          ? kit.renderHeading({
              id: customHeadingDomId(sectionKey, item.id),
              level: item.level,
              children: item.text,
            })
          : note(t('website:renderer.custom.emptyHeading'));
      case 'text':
        return item.paragraphs.length > 0 ? (
          <div className="space-y-4">
            {item.paragraphs.map((paragraph, index) => (
              <p
                key={index}
                className={cn('whitespace-pre-line break-words', classes.text)}
              >
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          note(t('website:renderer.custom.emptyText'))
        );
      case 'button':
        return item.buttons.length > 0 ? (
          <div
            className={cn(
              'flex flex-wrap items-center gap-x-4 gap-y-3',
              classes.actions
            )}
          >
            {item.buttons.map((cta, position) => (
              <span key={position} className="contents">
                {kit.renderAction(cta, position)}
              </span>
            ))}
          </div>
        ) : (
          note(t('website:renderer.custom.emptyButton'))
        );
      case 'image':
        return kit.renderImage({
          value: item.image,
          alt: item.alt,
          frameClassName: CUSTOM_IMAGE_RATIO_CLASSES[item.ratio],
          sizes: customImageSizes(section, columnIndex),
        });
      case 'video':
        return item.videoId ? (
          <VideoFacade
            videoId={item.videoId}
            title={item.title}
            poster={item.poster}
            interactive={isPublic}
            frameClassName={classes.videoFrame}
            playClassName={classes.videoPlay}
            sizes={customImageSizes(section, columnIndex)}
          />
        ) : (
          note(
            t('website:renderer.custom.emptyVideo'),
            'flex aspect-video items-center justify-center'
          )
        );
      case 'checklist':
        return item.items.length > 0 ? (
          <ul className={cn('space-y-3', classes.checklist)}>
            {item.items.map((entry) => (
              <li
                key={entry.id}
                className={cn('flex items-start gap-3', classes.checkItem)}
              >
                <span aria-hidden className={classes.checkMark}>
                  <Check className="size-3.5" strokeWidth={2.5} />
                </span>
                <span className="min-w-0 break-words">{entry.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          note(t('website:renderer.custom.emptyChecklist'))
        );
      case 'spacer':
        return (
          <div
            aria-hidden
            data-custom-spacer={item.size}
            className={SPACER_CLASSES[item.size]}
          />
        );
      case 'divider':
        return <hr className={cn('border-0 border-t', classes.divider)} />;
      case 'iconText': {
        const Icon = resolveFeatureIcon(item.icon);
        return (
          <div className={cn('flex items-start gap-4', classes.iconText)}>
            <span aria-hidden className={cn('shrink-0', classes.iconPlate)}>
              <Icon className="size-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={cn('break-words', classes.iconTitle)}>
                {item.title || t('website:renderer.custom.emptyIconTitle')}
              </p>
              {item.text ? (
                <p className={cn('mt-1 break-words', classes.iconBody)}>
                  {item.text}
                </p>
              ) : null}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div
      data-ws-columns=""
      data-custom-layout={section.layout}
      className={cn(
        'grid gap-10 lg:gap-14',
        customGridClass(section),
        // Beside each other only: stacked on phones, every column is full
        // width (also when the design reverses the stack into a flex column).
        section.verticalAlign === 'center'
          ? 'md:items-center'
          : 'md:items-start',
        single && 'max-w-3xl',
        single && centered && 'mx-auto',
        kit.classes.grid
      )}
    >
      {section.columns.map((column, columnIndex) => (
        <div
          key={column.id}
          data-custom-column={column.number}
          className={cn(
            'flex w-full min-w-0 flex-col gap-5',
            kit.classes.column
          )}
        >
          {column.elements.length > 0
            ? column.elements.map((item) => (
                <div
                  key={item.id}
                  data-custom-element={item.kind}
                  className="min-w-0"
                >
                  {element(item, columnIndex)}
                </div>
              ))
            : note(
                t('website:renderer.custom.emptyColumn', {
                  number: column.number,
                })
              )}
        </div>
      ))}
    </div>
  );
}
