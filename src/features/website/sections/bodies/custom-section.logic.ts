/**
 * CMS phase 3c — the custom section's shared logic: its config read for one
 * visitor's language, ready for any theme to draw (`CustomColumns`).
 *
 * - Text is plain and multi-line: a blank line starts a paragraph, a single
 *   line break stays a line break. Nothing is ever read as markup.
 * - On the public site an element with nothing to show is left out (a
 *   picture or video not chosen yet, a heading without words, a button row
 *   whose buttons all lead nowhere), and so is a column left empty by that:
 *   the remaining columns share the row. A preview keeps every element and
 *   column so the author sees the structure they are building.
 */
import { SECTION_BUTTON_SLOTS } from '@types';
import type {
  CustomElement,
  CustomImageRatio,
  CustomSectionConfig,
  CustomSectionLayout,
  CustomSectionRatio,
  PublicWebsiteLocale,
  WebsiteCta,
  WebsitePage,
} from '@types';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import { resolveWebsiteCtaHref } from '@/features/website/utils/link-resolution.utils';

export type ResolvedCustomElement =
  | {
      readonly id: string;
      readonly kind: 'heading';
      readonly level: 'h2' | 'h3';
      readonly text: string;
    }
  | {
      readonly id: string;
      readonly kind: 'text';
      /** Paragraphs; each may hold single line breaks. */
      readonly paragraphs: readonly string[];
    }
  | {
      readonly id: string;
      readonly kind: 'button';
      /** The buttons to draw, in order (1–3). */
      readonly buttons: readonly WebsiteCta[];
    }
  | {
      readonly id: string;
      readonly kind: 'image';
      readonly image: string | undefined;
      readonly alt: string;
      readonly ratio: CustomImageRatio;
    }
  | {
      readonly id: string;
      readonly kind: 'video';
      readonly videoId: string;
      readonly title: string;
      readonly poster: string | undefined;
    }
  | {
      readonly id: string;
      readonly kind: 'checklist';
      readonly items: readonly { readonly id: string; readonly text: string }[];
    }
  | {
      readonly id: string;
      readonly kind: 'spacer';
      readonly size: 'small' | 'medium' | 'large';
    }
  | { readonly id: string; readonly kind: 'divider' }
  | {
      readonly id: string;
      readonly kind: 'iconText';
      readonly icon: string;
      readonly title: string;
      readonly text: string;
    };

export interface ResolvedCustomColumn {
  readonly id: string;
  /** 1-based, as the author numbers them in the editor. */
  readonly number: number;
  readonly elements: readonly ResolvedCustomElement[];
}

export interface ResolvedCustomSection {
  readonly title: string;
  readonly description: string;
  /** The layout as drawn: a public column left empty drops out. */
  readonly layout: CustomSectionLayout;
  readonly ratio: CustomSectionRatio;
  readonly verticalAlign: 'top' | 'center';
  readonly columns: readonly ResolvedCustomColumn[];
}

/** Splits plain text into paragraphs at blank lines; trims each. */
export function toCustomParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

const LAYOUT_BY_COUNT: Record<number, CustomSectionLayout> = {
  1: 'one',
  2: 'two',
  3: 'three',
};

function resolveElement(
  element: CustomElement,
  locale: PublicWebsiteLocale,
  pages: readonly WebsitePage[],
  isPublic: boolean
): ResolvedCustomElement | null {
  const text = (value: Parameters<typeof resolveLocalizedText>[0]) =>
    resolveLocalizedText(value, locale).trim();
  switch (element.kind) {
    case 'heading': {
      const value = text(element.text);
      if (!value && isPublic) return null;
      return {
        id: element.id,
        kind: 'heading',
        level: element.level === 'h3' ? 'h3' : 'h2',
        text: value,
      };
    }
    case 'text': {
      const paragraphs = toCustomParagraphs(
        resolveLocalizedText(element.text, locale)
      );
      if (paragraphs.length === 0 && isPublic) return null;
      return { id: element.id, kind: 'text', paragraphs };
    }
    case 'button': {
      const buttons = SECTION_BUTTON_SLOTS.map((slot) => element[slot]).filter(
        (cta): cta is WebsiteCta =>
          !!cta &&
          !!text(cta.label) &&
          (!isPublic || !!resolveWebsiteCtaHref(cta, pages, locale))
      );
      if (buttons.length === 0 && isPublic) return null;
      return { id: element.id, kind: 'button', buttons };
    }
    case 'image':
      if (!element.image && isPublic) return null;
      return {
        id: element.id,
        kind: 'image',
        image: element.image || undefined,
        alt: text(element.imageAlt),
        ratio: element.ratio ?? 'landscape',
      };
    case 'video':
      if (!element.videoId && isPublic) return null;
      return {
        id: element.id,
        kind: 'video',
        videoId: element.videoId,
        title: text(element.title),
        poster: element.poster || undefined,
      };
    case 'checklist': {
      const items = element.items
        .map((item) => ({ id: item.id, text: text(item.text) }))
        .filter((item) => item.text);
      if (items.length === 0 && isPublic) return null;
      return { id: element.id, kind: 'checklist', items };
    }
    case 'spacer':
      return { id: element.id, kind: 'spacer', size: element.size };
    case 'divider':
      return { id: element.id, kind: 'divider' };
    case 'iconText': {
      const title = text(element.title);
      if (!title && isPublic) return null;
      return {
        id: element.id,
        kind: 'iconText',
        icon: element.icon,
        title,
        text: text(element.text),
      };
    }
    default:
      // A kind this build does not know (newer data): drawn as nothing.
      return null;
  }
}

/** Whether an element draws anything a visitor reads or sees (a spacer or divider alone does not). */
function isContent(element: ResolvedCustomElement): boolean {
  return element.kind !== 'spacer' && element.kind !== 'divider';
}

export function resolveCustomSection(
  config: CustomSectionConfig,
  locale: PublicWebsiteLocale,
  pages: readonly WebsitePage[],
  isPublic: boolean
): ResolvedCustomSection {
  const columns = (config.columns ?? [])
    .map((column, index) => ({
      id: column.id,
      number: index + 1,
      elements: (column.elements ?? [])
        .map((element) => resolveElement(element, locale, pages, isPublic))
        .filter((element): element is ResolvedCustomElement => !!element),
    }))
    .filter(
      (column) =>
        !isPublic || column.elements.some((element) => isContent(element))
    );
  const configured = config.layout ?? 'one';
  const layout = isPublic
    ? (LAYOUT_BY_COUNT[columns.length] ?? 'one')
    : configured;
  return {
    title: resolveLocalizedText(config.title, locale).trim(),
    description: resolveLocalizedText(config.description, locale).trim(),
    layout,
    // A ratio belongs to the two-column layout the author chose.
    ratio:
      layout === 'two' && configured === 'two'
        ? (config.ratio ?? 'equal')
        : 'equal',
    verticalAlign: config.verticalAlign === 'center' ? 'center' : 'top',
    columns,
  };
}

/** Whether the public site has anything of this section to show. */
export function hasCustomContent(section: ResolvedCustomSection): boolean {
  return (
    !!section.title ||
    !!section.description ||
    section.columns.some((column) => column.elements.some(isContent))
  );
}

/** The first heading element, which names the section when it has no title. */
export function firstCustomHeadingId(
  section: ResolvedCustomSection
): string | undefined {
  for (const column of section.columns) {
    const heading = column.elements.find(
      (element) => element.kind === 'heading' && element.text
    );
    if (heading) return heading.id;
  }
  return undefined;
}

/** The desktop grid for a layout (columns stack below `md`; logical, so the order mirrors in Arabic). */
export const CUSTOM_GRID_CLASSES: Record<
  CustomSectionLayout | `two-${CustomSectionRatio}`,
  string
> = {
  one: 'grid-cols-1',
  two: 'md:grid-cols-2',
  'two-equal': 'md:grid-cols-2',
  'two-wideNarrow': 'md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]',
  'two-narrowWide': 'md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]',
  three: 'md:grid-cols-2 lg:grid-cols-3',
};

export function customGridClass(section: ResolvedCustomSection): string {
  return section.layout === 'two'
    ? CUSTOM_GRID_CLASSES[`two-${section.ratio}`]
    : CUSTOM_GRID_CLASSES[section.layout];
}

/** The reserved frame per image ratio (no layout shift). */
export const CUSTOM_IMAGE_RATIO_CLASSES: Record<CustomImageRatio, string> = {
  landscape: 'aspect-[4/3]',
  wide: 'aspect-video',
  square: 'aspect-square',
  portrait: 'aspect-[4/5]',
};

/** The rendered width of one column, for choosing an image's file. */
export function customImageSizes(
  section: ResolvedCustomSection,
  columnIndex: number
): string {
  switch (section.layout) {
    case 'one':
      return '(min-width: 768px) 48rem, 100vw';
    case 'three':
      return '(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 100vw';
    case 'two':
    default: {
      const wide =
        (section.ratio === 'wideNarrow' && columnIndex === 0) ||
        (section.ratio === 'narrowWide' && columnIndex === 1);
      const narrow = section.ratio !== 'equal' && !wide;
      return wide
        ? '(min-width: 768px) 60vw, 100vw'
        : narrow
          ? '(min-width: 768px) 30vw, 100vw'
          : '(min-width: 768px) 45vw, 100vw';
    }
  }
}
