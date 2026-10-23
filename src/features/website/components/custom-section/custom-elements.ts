/**
 * CMS phase 3c — the custom section editor's model: what each element kind
 * is called and drawn with in the "Add element" menu, what a new one starts
 * with, how one is duplicated (fresh ids all the way down), how a layout
 * change keeps every element, and how the form's summary names a problem
 * inside a column.
 */
import {
  CheckSquare,
  Heading,
  ImageIcon,
  MousePointerClick,
  MoveVertical,
  PlayCircle,
  Minus,
  Sparkles,
  Text,
  type LucideIcon,
} from 'lucide-react';
import type {
  CustomColumn,
  CustomElement,
  CustomElementKind,
  CustomSectionLayout,
  LocalizedText,
} from '@types';
import { SECTION_BUTTON_SLOTS } from '@types';
import {
  CUSTOM_SECTION_LAYOUT_COLUMNS,
  FEATURE_ICON_OPTIONS,
  MAX_CTA_LABEL_LENGTH,
  MAX_CTA_WHATSAPP_MESSAGE_LENGTH,
  MAX_CUSTOM_CHECKLIST_ITEM_LENGTH,
  MAX_CUSTOM_HEADING_LENGTH,
  MAX_CUSTOM_ICON_TEXT_LENGTH,
  MAX_CUSTOM_ICON_TEXT_TITLE_LENGTH,
  MAX_CUSTOM_TEXT_LENGTH,
  MAX_CUSTOM_VIDEO_TITLE_LENGTH,
  MAX_SHORT_TEXT,
} from '@/features/website/constants/website.constants';
import {
  EMPTY_LOCALIZED_TEXT,
  resolveLocalizedText,
} from '@/features/website/utils/localized-text.utils';

export const CUSTOM_ELEMENT_META: Record<
  CustomElementKind,
  { readonly icon: LucideIcon; readonly labelKey: string }
> = {
  heading: {
    icon: Heading,
    labelKey: 'website:sectionEditors.custom.kinds.heading',
  },
  text: { icon: Text, labelKey: 'website:sectionEditors.custom.kinds.text' },
  button: {
    icon: MousePointerClick,
    labelKey: 'website:sectionEditors.custom.kinds.button',
  },
  image: {
    icon: ImageIcon,
    labelKey: 'website:sectionEditors.custom.kinds.image',
  },
  video: {
    icon: PlayCircle,
    labelKey: 'website:sectionEditors.custom.kinds.video',
  },
  checklist: {
    icon: CheckSquare,
    labelKey: 'website:sectionEditors.custom.kinds.checklist',
  },
  iconText: {
    icon: Sparkles,
    labelKey: 'website:sectionEditors.custom.kinds.iconText',
  },
  spacer: {
    icon: MoveVertical,
    labelKey: 'website:sectionEditors.custom.kinds.spacer',
  },
  divider: {
    icon: Minus,
    labelKey: 'website:sectionEditors.custom.kinds.divider',
  },
};

const newId = () => crypto.randomUUID();

/** A new element of `kind`, as the menu adds it (empty text to fill in). */
export function createCustomElement(kind: CustomElementKind): CustomElement {
  const id = newId();
  switch (kind) {
    case 'heading':
      return { id, kind, level: 'h2', text: EMPTY_LOCALIZED_TEXT };
    case 'text':
      return { id, kind, text: EMPTY_LOCALIZED_TEXT };
    case 'button':
      return { id, kind, cta: { label: EMPTY_LOCALIZED_TEXT } };
    case 'image':
      return { id, kind, ratio: 'landscape' };
    case 'video':
      return { id, kind, videoId: '' };
    case 'checklist':
      return {
        id,
        kind,
        items: [{ id: newId(), text: EMPTY_LOCALIZED_TEXT }],
      };
    case 'iconText':
      return {
        id,
        kind,
        icon: FEATURE_ICON_OPTIONS[0] ?? 'Sparkles',
        title: EMPTY_LOCALIZED_TEXT,
      };
    case 'spacer':
      return { id, kind, size: 'medium' };
    case 'divider':
    default:
      return { id, kind: 'divider' };
  }
}

/** A copy with fresh ids (the element's and its checklist items'). */
export function duplicateCustomElement(element: CustomElement): CustomElement {
  const copy = structuredClone(element) as CustomElement;
  if (copy.kind === 'checklist') {
    return {
      ...copy,
      id: newId(),
      items: copy.items.map((item) => ({ ...item, id: newId() })),
    };
  }
  return { ...copy, id: newId() };
}

/** What a closed element's row says about it (its words, or nothing). */
export function customElementSummary(
  element: CustomElement,
  locale: 'en' | 'ar'
): string {
  const text = (value: LocalizedText | undefined) =>
    resolveLocalizedText(value, locale).replace(/\s+/g, ' ').trim();
  switch (element.kind) {
    case 'heading':
    case 'text':
      return text(element.text);
    case 'button':
      return SECTION_BUTTON_SLOTS.map((slot) => text(element[slot]?.label))
        .filter(Boolean)
        .join(' · ');
    case 'image':
      return text(element.imageAlt);
    case 'video':
      return text(element.title);
    case 'checklist':
      return element.items
        .map((item) => text(item.text))
        .filter(Boolean)
        .join(' · ');
    case 'iconText':
      return text(element.title);
    default:
      return '';
  }
}

/**
 * The columns for a new layout. Nothing is lost: going to fewer columns
 * moves the elements of the columns that go into the last one kept (in
 * order); going to more adds empty columns.
 */
export function columnsForLayout(
  columns: readonly CustomColumn[],
  layout: CustomSectionLayout
): { readonly columns: CustomColumn[]; readonly moved: number } {
  const count = CUSTOM_SECTION_LAYOUT_COLUMNS[layout];
  if (columns.length === count) return { columns: [...columns], moved: 0 };
  if (columns.length < count) {
    return {
      columns: [
        ...columns,
        ...Array.from({ length: count - columns.length }, () => ({
          id: newId(),
          elements: [],
        })),
      ],
      moved: 0,
    };
  }
  const kept = columns.slice(0, count);
  const extra = columns.slice(count).flatMap((column) => column.elements);
  const last = kept[count - 1]!;
  kept[count - 1] = { ...last, elements: [...last.elements, ...extra] };
  return { columns: kept, moved: extra.length };
}

/** Every path inside one element that can carry a problem (relative to the config). */
export function customElementIssuePaths(
  element: CustomElement,
  base: string
): string[] {
  const localized = (path: string) => [`${path}.en`, `${path}.ar`];
  switch (element.kind) {
    case 'heading':
    case 'text':
      return [...localized(`${base}.text`), `${base}.level`];
    case 'button':
      return SECTION_BUTTON_SLOTS.flatMap((slot) => [
        `${base}.${slot}`,
        ...localized(`${base}.${slot}.label`),
        ...localized(`${base}.${slot}.whatsappMessage`),
        `${base}.${slot}.url`,
        `${base}.${slot}.whatsapp`,
        `${base}.${slot}.phone`,
      ]);
    case 'image':
      return [
        `${base}.image`,
        ...localized(`${base}.imageAlt`),
        `${base}.ratio`,
      ];
    case 'video':
      return [
        `${base}.videoId`,
        ...localized(`${base}.title`),
        `${base}.poster`,
      ];
    case 'checklist':
      return [
        `${base}.items`,
        ...element.items.flatMap((_, index) =>
          localized(`${base}.items.${index}.text`)
        ),
      ];
    case 'iconText':
      return [
        `${base}.icon`,
        ...localized(`${base}.title`),
        ...localized(`${base}.text`),
      ];
    default:
      return [];
  }
}

/** The label of each part of an element, for the form's summary. */
const PART_LABELS: Readonly<Record<string, string>> = {
  text: 'website:sectionEditors.custom.fields.text',
  level: 'website:sectionEditors.custom.fields.level',
  image: 'website:sectionEditors.custom.fields.image',
  imageAlt: 'website:sectionEditors.custom.fields.imageAlt',
  ratio: 'website:sectionEditors.custom.fields.ratio',
  videoId: 'website:fields.videoLink',
  title: 'website:sectionEditors.custom.fields.title',
  poster: 'website:fields.videoPoster',
  items: 'website:sectionEditors.custom.fields.item',
  icon: 'website:sectionEditors.custom.fields.icon',
  size: 'website:sectionEditors.custom.fields.size',
  cta: 'website:buttons.button',
  secondaryCta: 'website:buttons.button',
  tertiaryCta: 'website:buttons.button',
};

/** Each part's limit, by element kind (`text` is a heading's or a paragraph's). */
function partLimit(kind: string | undefined, part: string, sub?: string) {
  if (part === 'text') {
    if (kind === 'heading') return MAX_CUSTOM_HEADING_LENGTH;
    if (kind === 'iconText') return MAX_CUSTOM_ICON_TEXT_LENGTH;
    return MAX_CUSTOM_TEXT_LENGTH;
  }
  if (part === 'title') {
    return kind === 'video'
      ? MAX_CUSTOM_VIDEO_TITLE_LENGTH
      : MAX_CUSTOM_ICON_TEXT_TITLE_LENGTH;
  }
  if (part === 'imageAlt') return MAX_SHORT_TEXT;
  if (part === 'items') return MAX_CUSTOM_CHECKLIST_ITEM_LENGTH;
  if (sub === 'label') return MAX_CTA_LABEL_LENGTH;
  if (sub === 'whatsappMessage') return MAX_CTA_WHATSAPP_MESSAGE_LENGTH;
  return undefined;
}

/**
 * How the form's summary names a problem under the custom section's
 * layout (`head` is the config key, `rest` the path after it):
 * `columns.1.elements.0.text` → "Column 2 · Heading · Text".
 */
export function resolveCustomLayoutIssue(
  head: string,
  rest: readonly string[],
  config: Readonly<Record<string, unknown>> | undefined
): {
  readonly labelKeys: readonly string[];
  readonly itemNumber?: number;
  readonly maxLength?: number;
} {
  const layoutLabel = 'website:sectionEditors.custom.layout';
  if (head !== 'columns') return { labelKeys: [layoutLabel] };
  const [columnIndex, elementsKey, elementIndex, part, next] = rest;
  const column = Number(columnIndex);
  if (!Number.isInteger(column)) return { labelKeys: [layoutLabel] };
  const columnLabel = 'website:sectionEditors.custom.column';
  const element = Number(elementIndex);
  if (elementsKey !== 'elements' || !Number.isInteger(element)) {
    return { labelKeys: [columnLabel], itemNumber: column + 1 };
  }
  const columns = config?.columns as readonly CustomColumn[] | undefined;
  const kind = columns?.[column]?.elements?.[element]?.kind;
  const kindLabel = kind
    ? CUSTOM_ELEMENT_META[kind]?.labelKey
    : 'website:sectionEditors.custom.element';
  const partLabel = part ? PART_LABELS[part] : undefined;
  return {
    labelKeys: [
      columnLabel,
      kindLabel ?? 'website:sectionEditors.custom.element',
      ...(partLabel ? [partLabel] : []),
    ],
    itemNumber: column + 1,
    maxLength: part ? partLimit(kind, part, next) : undefined,
  };
}
