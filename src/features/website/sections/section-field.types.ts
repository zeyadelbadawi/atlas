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
 */
import type { SectionType } from '@types';

export type SectionFieldKind = 'text' | 'longText' | 'boolean' | 'number' | 'select' | 'image' | 'cta';

interface FieldDescriptorBase {
  readonly key: string;
  readonly labelKey: string;
}

export interface TextFieldDescriptor extends FieldDescriptorBase {
  readonly kind: 'text' | 'longText' | 'image' | 'cta';
}

export interface BooleanFieldDescriptor extends FieldDescriptorBase {
  readonly kind: 'boolean';
}

export interface NumberFieldDescriptor extends FieldDescriptorBase {
  readonly kind: 'number';
}

export interface SelectFieldDescriptor extends FieldDescriptorBase {
  readonly kind: 'select';
  readonly options: readonly { readonly value: string; readonly labelKey: string }[];
}

/** A fully discriminated union on `kind` — `select` is the only variant that carries `options`, so `descriptor.options` narrows correctly without a cast. */
export type SectionFieldDescriptor =
  | TextFieldDescriptor
  | BooleanFieldDescriptor
  | NumberFieldDescriptor
  | SelectFieldDescriptor;

export interface RepeatableFieldGroup {
  readonly key: string;
  readonly labelKey: string;
  readonly itemLabelKey: string;
  readonly itemFields: readonly SectionFieldDescriptor[];
}

export interface SectionFieldSchema {
  readonly type: SectionType;
  readonly fields: readonly SectionFieldDescriptor[];
  readonly repeatable?: RepeatableFieldGroup;
}
