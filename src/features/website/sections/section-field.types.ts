/**
 * Section field descriptors.
 *
 * The Section Editor is a single generic, descriptor-driven form renderer
 * (`SectionConfigForm`) rather than 11 bespoke forms — this is what lets
 * "adding a 12th section must not require rewriting the Page Composer"
 * hold in practice: a new section type needs one new descriptor array
 * (`SECTION_FIELDS`), not a new form component. Every value the client
 * enters is still validated against the real Zod schema
 * (`getSectionConfigSchema`) at save time — this file only describes
 * which bounded, safe input control to render for which key, never
 * anything executable.
 *
 * Phase 6 — a `text`/`longText` field additionally carries `localized:
 * true` when the underlying schema field is `LocalizedText` (see
 * `section-config.schemas.ts`'s own doc comment for exactly which fields
 * these are and why). `SectionConfigForm` reads this flag to render the
 * shared English/Arabic control (`LocalizedTextControl`) instead of a
 * single plain input — the ONE place that decision is made, so a field
 * can never drift out of sync between "the schema treats this as
 * bilingual" and "the editor lets you edit it bilingually."
 *
 * `maxLength` is the field's content limit, taken from the same constant
 * the schema uses (`website.constants.ts`), so the editor's character
 * counter and the save-time validation can never disagree. `themes`
 * limits a field to the themes that actually draw it (e.g. the steps
 * plate, drawn only by Atelier); the value itself is theme-agnostic and
 * survives a theme switch untouched.
 */
import type { SectionType, WebsiteThemeKey } from '@types';

export type SectionFieldKind =
  | 'text'
  | 'longText'
  | 'boolean'
  | 'number'
  | 'select'
  | 'image'
  | 'cta'
  | 'buttons'
  | 'time'
  | 'url';

interface FieldDescriptorBase {
  readonly key: string;
  readonly labelKey: string;
  /** Offered only when the website's theme is one of these; absent = every theme. */
  readonly themes?: readonly WebsiteThemeKey[];
  /** Persistent helper text under the control (what to type, what empty means). */
  readonly hintKey?: string;
  /** What a newly added repeatable item starts with (e.g. a schedule row's day). */
  readonly defaultValue?: string | boolean;
}

export interface TextFieldDescriptor extends FieldDescriptorBase {
  readonly kind: 'text' | 'longText' | 'image' | 'cta';
  /** Only meaningful for `kind: 'text' | 'longText'` — see this file's own doc comment. */
  readonly localized?: boolean;
  /** Characters per language — see this file's own doc comment. Only meaningful for a localized `text`/`longText` field. */
  readonly maxLength?: number;
}

export interface BooleanFieldDescriptor extends FieldDescriptorBase {
  readonly kind: 'boolean';
}

export interface NumberFieldDescriptor extends FieldDescriptorBase {
  readonly kind: 'number';
  /** Input bounds. Default to `1`/`MAX_SECTION_ITEMS` — the "how many items" fields every section had before `courseCatalog.pageSize` needed its own range. The Zod schema remains the real validation. */
  readonly min?: number;
  readonly max?: number;
  /** An empty input means "not set" (the key is omitted) instead of 0. */
  readonly optional?: boolean;
}

export interface SelectFieldDescriptor extends FieldDescriptorBase {
  readonly kind: 'select';
  readonly options: readonly {
    readonly value: string;
    readonly labelKey: string;
    /** Shown under the select while this option is chosen (e.g. what choosing it makes public). */
    readonly hintKey?: string;
  }[];
}

/**
 * CMS phase 3d — a plain, non-localized value with its own input type:
 * `time` is a 24-hour `HH:MM` clock time (`<input type="time">`), `url` a
 * web address. Both say what is wrong only once the author leaves the
 * field (`section-field-inputs.tsx`).
 */
export interface PlainInputFieldDescriptor extends FieldDescriptorBase {
  readonly kind: 'time' | 'url';
}

/**
 * CMS phase 3 — a section's buttons (up to three), edited as one list and
 * stored in the `cta` / `secondaryCta` / `tertiaryCta` slots
 * (`SECTION_BUTTON_SLOTS`). Its `key` names the field, not a config key.
 */
export interface ButtonsFieldDescriptor extends FieldDescriptorBase {
  readonly kind: 'buttons';
  /** How many buttons the section needs (a CTA band needs one). */
  readonly minButtons?: number;
}

/** A fully discriminated union on `kind` — `select` is the only variant that carries `options`, so `descriptor.options` narrows correctly without a cast. */
export type SectionFieldDescriptor =
  | TextFieldDescriptor
  | BooleanFieldDescriptor
  | NumberFieldDescriptor
  | SelectFieldDescriptor
  | ButtonsFieldDescriptor
  | PlainInputFieldDescriptor;

export interface RepeatableFieldGroup {
  readonly key: string;
  readonly labelKey: string;
  readonly itemLabelKey: string;
  readonly itemFields: readonly SectionFieldDescriptor[];
  /** The schema's item cap when it is below `MAX_SECTION_ITEMS`. */
  readonly maxItems?: number;
}

export interface SectionFieldSchema {
  readonly type: SectionType;
  readonly fields: readonly SectionFieldDescriptor[];
  readonly repeatable?: RepeatableFieldGroup;
}
