/**
 * Inline text editing on the visual editor's canvas: which content field a
 * piece of text on the page shows.
 *
 * The theme renderers are not changed (and the public site gains nothing):
 * the editor reads what the page drew. Double-clicking text in the
 * selected section takes the element under the pointer (or the nearest
 * ancestor inside the section) and compares its text with the section's
 * visitor-facing text fields in the previewed language, list items and
 * button labels included. The text is edited in place only when exactly
 * one field shows exactly that text; otherwise the editor falls back to
 * the panel (the matching field there is focused when there is one).
 *
 * Everything here is pure, so it is unit tested without a canvas.
 */
import { SECTION_BUTTON_SLOTS } from '@types';
import type { LocalizedText, SectionInstance, WebsiteThemeKey } from '@types';
import { MAX_CTA_LABEL_LENGTH } from '../constants/website.constants';
import type { PublicWebsiteLocale } from '../constants/locale.constants';
import { SECTION_FIELD_SCHEMAS } from '../sections/section-fields.registry';
import type {
  SectionFieldDescriptor,
  TextFieldDescriptor,
} from '../sections/section-field.types';

export type InlineTextPath = readonly (string | number)[];

/** One text field of a section, as the canvas shows it in one language. */
export interface InlineTextCandidate {
  /** Where the value sits in the section's config, e.g. `['items', 2, 'title']`. */
  readonly path: InlineTextPath;
  /** The language being previewed, and so the side of the field edited. */
  readonly locale: PublicWebsiteLocale;
  /** What the canvas shows for this field. */
  readonly shown: string;
  /**
   * Whether the field can be edited in place: it is stored per language,
   * and the canvas shows its own text for this language (not the English
   * text an empty Arabic side falls back to).
   */
  readonly editable: boolean;
  readonly maxLength?: number;
  readonly multiline: boolean;
  /** The field's label (an i18n key), for announcements. */
  readonly labelKey: string;
  /** The id of the panel's input for this field in this language. */
  readonly fieldId: string;
}

export type InlineTextMatch =
  | { readonly kind: 'editable'; readonly candidate: InlineTextCandidate }
  | { readonly kind: 'panel'; readonly candidate: InlineTextCandidate }
  | {
      readonly kind: 'ambiguous';
      readonly candidates: readonly InlineTextCandidate[];
    }
  | { readonly kind: 'none' };

type Config = Record<string, unknown>;

function isLocalizedText(value: unknown): value is LocalizedText {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as LocalizedText).en === 'string' &&
    typeof (value as LocalizedText).ar === 'string'
  );
}

function isLocalizedTextField(descriptor: SectionFieldDescriptor): boolean {
  return (
    (descriptor.kind === 'text' || descriptor.kind === 'longText') &&
    descriptor.localized === true &&
    // An image's description is never drawn as text on the page.
    !/Alt$/.test(descriptor.key)
  );
}

function isOffered(
  descriptor: SectionFieldDescriptor,
  themeKey: WebsiteThemeKey
): boolean {
  return !descriptor.themes || descriptor.themes.includes(themeKey);
}

/** The panel's ids: `section-field-<path with dashes>-<locale>` (`SectionConfigForm`). */
function sectionFieldId(
  path: InlineTextPath,
  locale: PublicWebsiteLocale
): string {
  return `section-field-${path.join('-')}-${locale}`;
}

function candidateFor(
  value: unknown,
  path: InlineTextPath,
  locale: PublicWebsiteLocale,
  details: Pick<
    InlineTextCandidate,
    'maxLength' | 'multiline' | 'labelKey' | 'fieldId'
  >
): InlineTextCandidate | null {
  if (typeof value === 'string') {
    // Saved before text was bilingual: shown as is, edited in the panel.
    return value.trim()
      ? { path, locale, shown: value, editable: false, ...details }
      : null;
  }
  if (!isLocalizedText(value)) return null;
  const own = value[locale];
  // `resolveLocalizedText`: a blank side shows the English text instead.
  const shown = own || value.en;
  if (!shown.trim()) return null;
  return { path, locale, shown, editable: own.length > 0, ...details };
}

/**
 * Every text field of `section` the canvas can be showing, in `locale`:
 * its localized text fields, its list items' text fields and its button
 * labels — only those with text (an empty field draws nothing to click).
 */
export function inlineTextCandidates(
  section: Pick<SectionInstance, 'type' | 'config'>,
  themeKey: WebsiteThemeKey,
  locale: PublicWebsiteLocale
): InlineTextCandidate[] {
  const schema = SECTION_FIELD_SCHEMAS[section.type];
  if (!schema) return [];
  const config = (section.config ?? {}) as unknown as Config;
  const out: InlineTextCandidate[] = [];
  const push = (candidate: InlineTextCandidate | null) => {
    if (candidate) out.push(candidate);
  };

  const ctaLabel = (key: string, labelKey: string) => {
    const cta = config[key] as Config | undefined;
    if (!cta || typeof cta !== 'object') return;
    push(
      candidateFor(cta.label, [key, 'label'], locale, {
        maxLength: MAX_CTA_LABEL_LENGTH,
        multiline: false,
        labelKey,
        fieldId: `cta-label-${key}-${locale}`,
      })
    );
  };

  for (const field of schema.fields) {
    if (!isOffered(field, themeKey)) continue;
    if (isLocalizedTextField(field)) {
      push(
        candidateFor(config[field.key], [field.key], locale, {
          maxLength: (field as TextFieldDescriptor).maxLength,
          multiline: field.kind === 'longText',
          labelKey: field.labelKey,
          fieldId: sectionFieldId([field.key], locale),
        })
      );
    } else if (field.kind === 'buttons') {
      for (const slot of SECTION_BUTTON_SLOTS) {
        ctaLabel(slot, 'website:fields.ctaLabelPlaceholder');
      }
    } else if (field.kind === 'cta') {
      ctaLabel(field.key, field.labelKey);
    }
  }

  const repeatable = schema.repeatable;
  const items = repeatable ? config[repeatable.key] : undefined;
  if (repeatable && Array.isArray(items)) {
    items.forEach((item, index) => {
      if (!item || typeof item !== 'object') return;
      for (const field of repeatable.itemFields) {
        if (!isOffered(field, themeKey) || !isLocalizedTextField(field)) {
          continue;
        }
        const path = [repeatable.key, index, field.key];
        push(
          candidateFor((item as Config)[field.key], path, locale, {
            maxLength: (field as TextFieldDescriptor).maxLength,
            multiline: field.kind === 'longText',
            labelKey: field.labelKey,
            fieldId: sectionFieldId(path, locale),
          })
        );
      }
    });
  }
  return out;
}

/** Whitespace as a reader sees it: runs collapsed, ends trimmed. */
export function normalizeInlineText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Which field shows `text` — exact (whitespace-normalised) and unique, or not. */
export function matchInlineText(
  text: string,
  candidates: readonly InlineTextCandidate[]
): InlineTextMatch {
  const wanted = normalizeInlineText(text);
  if (!wanted) return { kind: 'none' };
  const hits = candidates.filter(
    (candidate) => normalizeInlineText(candidate.shown) === wanted
  );
  if (hits.length === 0) return { kind: 'none' };
  if (hits.length > 1) return { kind: 'ambiguous', candidates: hits };
  const [candidate] = hits as [InlineTextCandidate];
  return candidate.editable
    ? { kind: 'editable', candidate }
    : { kind: 'panel', candidate };
}

/**
 * The text element double-clicked: the first of `start` and its ancestors,
 * up to (not including) `boundary` (the section's anchor), whose text one
 * or more fields show.
 */
export function findInlineTextTarget(
  start: Element,
  boundary: Element,
  candidates: readonly InlineTextCandidate[]
): { readonly element: Element; readonly match: InlineTextMatch } | null {
  let element: Element | null = start;
  while (element && element !== boundary && boundary.contains(element)) {
    const match = matchInlineText(element.textContent ?? '', candidates);
    if (match.kind !== 'none') return { element, match };
    element = element.parentElement;
  }
  return null;
}

/**
 * Whether `element` can be typed into in place for `candidate`: it holds
 * only text (no child elements, whose structure typing would disturb) and
 * that text is exactly the stored value, so a caret position in the
 * element is the same position in the value.
 */
export function canEditInPlace(
  element: Element,
  candidate: InlineTextCandidate
): boolean {
  if (!candidate.editable) return false;
  const nodes = Array.from(element.childNodes);
  if (nodes.length === 0) return false;
  if (!nodes.every((node) => node.nodeType === 3)) return false;
  if (element.closest('input, textarea, select')) return false;
  return element.textContent === candidate.shown;
}

/** `config` with the text at `path` set to `text` in `locale` (the other language untouched). */
export function setInlineText<T>(
  config: T,
  path: InlineTextPath,
  locale: PublicWebsiteLocale,
  text: string
): T {
  const [head, ...rest] = path;
  if (head === undefined) {
    const current = config as unknown as LocalizedText;
    return { ...current, [locale]: text } as T;
  }
  if (Array.isArray(config)) {
    const copy = [...config];
    copy[head as number] = setInlineText(
      copy[head as number],
      rest,
      locale,
      text
    );
    return copy as T;
  }
  const record = (config ?? {}) as Config;
  return {
    ...record,
    [head]: setInlineText(record[head as string], rest, locale, text),
  } as T;
}

/** The text a delete key removes, as `[start, end)` offsets into `text`. */
export function deletionRange(
  inputType: string,
  text: string,
  start: number,
  end: number
): readonly [number, number] {
  if (start !== end) return [start, end];
  switch (inputType) {
    case 'deleteContentBackward':
      return [previousBoundary(text, start), start];
    case 'deleteContentForward':
      return [start, nextBoundary(text, start)];
    case 'deleteWordBackward': {
      const match = /\S*\s*$/.exec(text.slice(0, start));
      return [start - (match?.[0].length ?? 0), start];
    }
    case 'deleteWordForward': {
      const match = /^\s*\S*/.exec(text.slice(start));
      return [start, start + (match?.[0].length ?? 0)];
    }
    case 'deleteSoftLineBackward':
    case 'deleteHardLineBackward': {
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      return [lineStart === start ? Math.max(0, start - 1) : lineStart, start];
    }
    case 'deleteSoftLineForward':
    case 'deleteHardLineForward': {
      const lineEnd = text.indexOf('\n', start);
      return [
        start,
        lineEnd === -1 ? text.length : Math.max(lineEnd, start + 1),
      ];
    }
    default:
      return [start, end];
  }
}

/** `Intl.Segmenter` (graphemes), where the browser has it. */
interface GraphemeSegmenter {
  segment(text: string): Iterable<{ segment: string; index: number }>;
}
function segmenter(): (new () => GraphemeSegmenter) | undefined {
  return (Intl as unknown as { Segmenter?: new () => GraphemeSegmenter })
    .Segmenter;
}

/** One user-perceived character back (a surrogate pair or a combined emoji counts once). */
function previousBoundary(text: string, offset: number): number {
  if (offset <= 0) return 0;
  const Segmenter = segmenter();
  if (Segmenter) {
    let last = 0;
    for (const { index } of new Segmenter().segment(text.slice(0, offset))) {
      last = index;
    }
    return last;
  }
  const code = text.charCodeAt(offset - 1);
  return code >= 0xdc00 && code <= 0xdfff && offset >= 2
    ? offset - 2
    : offset - 1;
}

function nextBoundary(text: string, offset: number): number {
  if (offset >= text.length) return text.length;
  const Segmenter = segmenter();
  if (Segmenter) {
    const segments = new Segmenter().segment(text.slice(offset));
    const first = segments[Symbol.iterator]().next().value as
      { segment: string } | undefined;
    return offset + (first?.segment.length ?? 1);
  }
  const code = text.charCodeAt(offset);
  return code >= 0xd800 && code <= 0xdbff ? offset + 2 : offset + 1;
}

/**
 * The text after typing `data` over `[start, end)`, kept within
 * `maxLength`: what does not fit is dropped (text already over the limit,
 * saved before it, can still be shortened). `limited` says input was cut.
 */
export function applyInlineInput(
  text: string,
  start: number,
  end: number,
  data: string,
  maxLength?: number
): {
  readonly text: string;
  readonly caret: number;
  readonly limited: boolean;
} {
  const before = text.slice(0, start);
  const after = text.slice(end);
  let insert = data;
  let limited = false;
  if (maxLength !== undefined) {
    const room = Math.max(0, maxLength - before.length - after.length);
    if (insert.length > room) {
      insert = insert.slice(0, room);
      limited = true;
    }
  }
  return {
    text: before + insert + after,
    caret: before.length + insert.length,
    limited,
  };
}
