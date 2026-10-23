/**
 * CMS phase 3d (batch D) — the repeatable-item fields with an editor of
 * their own: a video review's YouTube link (`youtube`, batch A's
 * `YouTubeVideoField`, reused) and a download's link (`fileLink`,
 * `FileLinkField`). `SectionConfigForm` routes an item field of these kinds
 * here in one line, so the generic form stays generic.
 */
import type {
  CustomFieldDescriptor,
  FileLinkFieldDescriptor,
  SectionFieldDescriptor,
} from '../sections/section-field.types';
import { YouTubeVideoField } from './YouTubeVideoField';
import { FileLinkField } from './FileLinkField';

export type ItemEditorFieldDescriptor =
  | (CustomFieldDescriptor & { readonly kind: 'youtube' })
  | FileLinkFieldDescriptor;

export function isItemEditorField(
  descriptor: SectionFieldDescriptor
): descriptor is ItemEditorFieldDescriptor {
  return descriptor.kind === 'youtube' || descriptor.kind === 'fileLink';
}

export function ItemEditorField({
  descriptor,
  id,
  value,
  onChange,
  academyId,
  error,
  revealError,
}: {
  readonly descriptor: ItemEditorFieldDescriptor;
  readonly id: string;
  readonly value: unknown;
  readonly onChange: (value: string) => void;
  readonly academyId: string;
  /** The form's message for this value, already translated. */
  readonly error?: string;
  /** After a refused Apply: show the problem before the field was left. */
  readonly revealError: boolean;
}): JSX.Element {
  if (descriptor.kind === 'youtube') {
    return (
      <YouTubeVideoField
        id={id}
        labelKey={descriptor.labelKey}
        value={typeof value === 'string' ? value : undefined}
        onChange={onChange}
        schemaError={error}
      />
    );
  }
  return (
    <FileLinkField
      id={id}
      labelKey={descriptor.labelKey}
      value={value}
      onChange={onChange}
      academyId={academyId}
      error={error}
      revealError={revealError}
    />
  );
}
