/**
 * Heading — semantic level and visual size chosen separately (a page has
 * one `h1`; a section title can look large at `h2`), in the theme's heading
 * style, with an optional highlighted phrase (Theme 1 plan §B: "a highlight
 * stroke under one heading phrase").
 *
 * The highlight is plain text wrapped in a span marked
 * `data-highlight`; how it's drawn (stroke, underline, colour) is the
 * theme's CSS, so the words themselves never change and screen readers read
 * one continuous heading. Only the first occurrence is highlighted; a
 * phrase that isn't in the text (e.g. after the Owner edits the title) is
 * simply ignored.
 *
 * Sizes follow §B (display 64/56/40, title 40/32/28 px at
 * desktop/tablet/mobile); `text-balance` avoids a lone last word.
 */
import { cn } from '@utils';
import { useWebsiteHeadingClass } from '../renderer/renderer-style.utils';
import { splitHighlight } from './split-highlight';

export type HeadingLevel = 1 | 2 | 3 | 4;
export type HeadingSize = 'display' | 'title' | 'subtitle';

export interface HeadingProps {
  readonly level: HeadingLevel;
  readonly size?: HeadingSize;
  readonly id?: string;
  readonly highlight?: string;
  readonly align?: 'start' | 'center';
  readonly className?: string;
  readonly children: string;
}

const SIZE_CLASSES: Record<HeadingSize, string> = {
  display: 'text-[2.5rem] leading-[1.1] md:text-[3.5rem] lg:text-[4rem]',
  title: 'text-[1.75rem] leading-tight md:text-[2rem] lg:text-[2.5rem]',
  subtitle: 'text-xl leading-snug md:text-2xl',
};

const TAGS = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4' } as const;

export function Heading({
  level,
  size = 'title',
  id,
  highlight,
  align = 'start',
  className,
  children,
}: HeadingProps): JSX.Element {
  const headingClass = useWebsiteHeadingClass();
  const Tag = TAGS[level];
  const parts = splitHighlight(children, highlight);
  return (
    <Tag
      id={id}
      className={cn(
        headingClass,
        SIZE_CLASSES[size],
        'text-balance break-words',
        align === 'center' ? 'text-center' : 'text-start',
        className
      )}
    >
      {parts ? (
        <>
          {parts[0]}
          <span data-highlight className="website-highlight relative">
            {parts[1]}
          </span>
          {parts[2]}
        </>
      ) : (
        children
      )}
    </Tag>
  );
}
