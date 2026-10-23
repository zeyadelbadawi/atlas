/**
 * CMS phase 4 — the pre-publish page check: things worth a second look
 * before a page goes live. Warnings only — publishing is never blocked —
 * each pointing at the section (and, where there is one, the field) to fix.
 *
 * Rules (only sections that are switched on, since only they are drawn):
 * - `imageAlt`: an image with no description (alt text) in the site's main
 *   language — screen readers and search engines get nothing for it;
 * - `buttonNoLink` / `buttonMissingPage` / `buttonHiddenPage`: a button
 *   that goes nowhere (no target, or a target the site cannot use —
 *   `resolveWebsiteCtaHref`, the renderer's own resolution), or that links
 *   to a page that was deleted or is hidden from visitors;
 * - `multipleH1`: more than one section that opens a page with its main
 *   title (`PAGE_OPENING_TYPES`, the renderer's own list): only one can be
 *   the page's `<h1>`, the others are drawn as sub-headings;
 * - `placeholder`: bracketed placeholder text left from a preset or page
 *   template (`[Price]` / `[السعر]`), in either language;
 * - `sample`: sample items (testimonials, results, timetable rows, video
 *   reviews) — the same rule as the site publish warning and the launch
 *   checklist (`countSampleItems`), not a second copy of it.
 *
 * Not checked: an oversized image. The editor holds only an image's URL —
 * not the media asset's size or dimensions — and uploads are already
 * capped (`MAX_WEBSITE_IMAGE_FILE_SIZE`) and served as responsive variants.
 */
import type {
  LocalizedText,
  SectionInstance,
  SectionType,
  WebsiteCta,
  WebsitePage,
} from '@types';
import { SECTION_BUTTON_SLOTS } from '@types';
import { PAGE_OPENING_TYPES } from '../renderer/PageHeadingContext';
import { SECTION_FIELD_SCHEMAS } from '../sections/section-fields.registry';
import { resolveWebsiteCtaHref } from './link-resolution.utils';
import { countSampleItems } from './sample-content.utils';

export type PublishCheckRule =
  | 'imageAlt'
  | 'buttonNoLink'
  | 'buttonMissingPage'
  | 'buttonHiddenPage'
  | 'multipleH1'
  | 'placeholder'
  | 'sample';

export interface PublishCheckIssue {
  /** Stable and unique within one check (a React key). */
  readonly id: string;
  readonly rule: PublishCheckRule;
  readonly sectionId: string;
  /** Position among the page's sections, zero-based. */
  readonly sectionIndex: number;
  readonly sectionType: SectionType;
  /** Where the value lives in the section config (`imageAlt`, `items.2.cta`), when one field is at fault. */
  readonly fieldPath?: string;
  /** The language of the field at fault, for a bilingual one. */
  readonly locale?: keyof LocalizedText;
  /** Values for the message (a placeholder's text, a page title, a count). */
  readonly values?: Readonly<Record<string, string | number>>;
}

export interface PublishCheckContext {
  /** Every page of the site, hidden ones included. */
  readonly pages: readonly WebsitePage[];
  readonly themeKey: string;
  /** The site's main language: the one an image description must have. */
  readonly requiredLocale: keyof LocalizedText;
}

/** An image key and where its description lives beside it. */
const IMAGE_ALT_KEYS: Readonly<Record<string, readonly string[]>> = {
  image: ['imageAlt', 'alt'],
  avatar: ['avatarAlt'],
  photo: ['photoAlt'],
};

/** Bracketed placeholder text, as the presets write it (`ph()`). */
const PLACEHOLDER_PATTERN = /\[[^[\]\n]{1,60}\]/u;

const BUTTON_KEYS: ReadonlySet<string> = new Set(SECTION_BUTTON_SLOTS);

type Visit = (
  value: unknown,
  key: string,
  path: string,
  parent: Record<string, unknown>
) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Every value under `value`, depth first, with its key, dotted path and parent object. */
function walk(value: unknown, path: string, visit: Visit): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      walk(item, path ? `${path}.${index}` : String(index), visit)
    );
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    visit(child, key, childPath, value);
    walk(child, childPath, visit);
  }
}

function isLocalizedText(value: unknown): value is Partial<LocalizedText> {
  return (
    isRecord(value) &&
    ('en' in value || 'ar' in value) &&
    Object.values(value).every(
      (text) => text === undefined || typeof text === 'string'
    )
  );
}

/**
 * Whether a field is drawn by this theme: some fields belong to one theme
 * only (`themes` on its descriptor) and are not shown anywhere else.
 */
function fieldDrawnByTheme(
  type: SectionType,
  path: string,
  themeKey: string
): boolean {
  const schema = SECTION_FIELD_SCHEMAS[type];
  if (!schema) return true;
  const segments = path.split('.');
  let fields = schema.fields;
  let key = segments[0];
  if (
    segments.length === 3 &&
    schema.repeatable &&
    segments[0] === schema.repeatable.key
  ) {
    fields = schema.repeatable.itemFields;
    key = segments[2];
  } else if (segments.length !== 1) {
    return true;
  }
  const descriptor = fields.find((field) => field.key === key);
  return (
    !descriptor?.themes ||
    (descriptor.themes as readonly string[]).includes(themeKey)
  );
}

function isButton(value: unknown, key: string): value is WebsiteCta {
  return BUTTON_KEYS.has(key) && isRecord(value) && 'label' in value;
}

/** The warnings for a page's sections (see this file's doc comment), in page order. */
export function collectPagePublishIssues(
  sections: readonly SectionInstance[],
  { pages, themeKey, requiredLocale }: PublishCheckContext
): PublishCheckIssue[] {
  const issues: PublishCheckIssue[] = [];
  let openers = 0;

  sections.forEach((section, sectionIndex) => {
    if (!section.enabled) return;
    const base = {
      sectionId: section.id,
      sectionIndex,
      sectionType: section.type,
    };
    const add = (
      rule: PublishCheckRule,
      extra: Partial<PublishCheckIssue> = {}
    ) =>
      issues.push({
        ...base,
        ...extra,
        rule,
        id: `${section.id}:${rule}:${extra.fieldPath ?? ''}:${extra.locale ?? ''}`,
      });

    if (PAGE_OPENING_TYPES.has(section.type)) {
      openers += 1;
      if (openers > 1) add('multipleH1', { values: { count: openers } });
    }

    walk(section.config, '', (value, key, path, parent) => {
      // An image with no description in the site's main language.
      const altKeys = IMAGE_ALT_KEYS[key];
      if (
        altKeys &&
        typeof value === 'string' &&
        value.trim() !== '' &&
        fieldDrawnByTheme(section.type, path, themeKey)
      ) {
        const altKey = altKeys.find((candidate) => candidate in parent);
        const alt = altKey ? parent[altKey] : undefined;
        const text = isLocalizedText(alt) ? alt[requiredLocale] : undefined;
        if (!text || text.trim() === '') {
          const parentPath = path.slice(0, path.length - key.length);
          add('imageAlt', {
            fieldPath: `${parentPath}${altKey ?? altKeys[0]}`,
            locale: requiredLocale,
          });
        }
      }

      // A button that goes nowhere, or to a page visitors cannot open.
      if (isButton(value, key)) {
        if (value.pageId && !value.authAction && !value.courseId) {
          const target = pages.find((page) => page.id === value.pageId);
          if (!target) add('buttonMissingPage', { fieldPath: path });
          else if (!target.visible) {
            add('buttonHiddenPage', {
              fieldPath: path,
              values: { page: target.title },
            });
          }
        } else if (resolveWebsiteCtaHref(value, pages) === undefined) {
          add('buttonNoLink', { fieldPath: path });
        }
      }

      // Placeholder text left from a preset or template, either language.
      if (isLocalizedText(value)) {
        for (const locale of ['en', 'ar'] as const) {
          const match = value[locale]?.match(PLACEHOLDER_PATTERN);
          if (match) {
            add('placeholder', {
              fieldPath: path,
              locale,
              values: { text: match[0] },
            });
          }
        }
      }
    });

    const samples = countSampleItems(section);
    if (samples > 0) add('sample', { values: { count: samples } });
  });

  return issues;
}
