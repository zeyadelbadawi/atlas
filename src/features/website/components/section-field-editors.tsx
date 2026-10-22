/**
 * The section fields with an editor of their own (CMS phase 3d): a YouTube
 * link, a deadline in the academy's time zone and a pricing section's plans
 * (`CustomFieldDescriptor`). `SectionConfigForm` hands every such field to
 * `CustomSectionField` and asks `resolveCustomFieldIssue` how to name a
 * problem inside one, so the generic form stays generic.
 */
import type { SectionFieldDescriptor } from '../sections/section-field.types';
import type { CustomFieldDescriptor } from '../sections/section-field.types';
import type { PricingPlan, WebsitePage } from '@types';
import type { FieldErrorLookup } from './SectionButtonsEditor';
import { YouTubeVideoField } from './YouTubeVideoField';
import { DeadlineField, type DeadlineValue } from './DeadlineField';
import { PricingPlansEditor, resolvePlanIssue } from './PricingPlansEditor';

const CUSTOM_KINDS: ReadonlySet<string> = new Set([
  'youtube',
  'deadline',
  'plans',
]);

export function isCustomField(
  descriptor: SectionFieldDescriptor
): descriptor is CustomFieldDescriptor {
  return CUSTOM_KINDS.has(descriptor.kind);
}

/** How the form's summary names a problem inside a custom field (`rest` is the path after its key). */
export function resolveCustomFieldIssue(
  descriptor: CustomFieldDescriptor,
  rest: readonly string[]
): {
  readonly labelKeys: readonly string[];
  readonly itemNumber?: number;
  readonly maxLength?: number;
} {
  if (descriptor.kind === 'plans' && rest.length > 0) {
    return resolvePlanIssue(rest);
  }
  return { labelKeys: [descriptor.labelKey] };
}

export function CustomSectionField({
  descriptor,
  draft,
  onPatch,
  errorFor,
  pages,
  academyId,
}: {
  readonly descriptor: CustomFieldDescriptor;
  /** The section's config as typed. */
  readonly draft: Readonly<Record<string, unknown>>;
  /** Merges these keys into the config. */
  readonly onPatch: (patch: Record<string, unknown>) => void;
  readonly errorFor: FieldErrorLookup;
  readonly pages: readonly WebsitePage[];
  readonly academyId: string;
}): JSX.Element {
  const { key, labelKey } = descriptor;
  const id = `section-field-${key}`;
  switch (descriptor.kind) {
    case 'youtube':
      return (
        <YouTubeVideoField
          id={id}
          labelKey={labelKey}
          value={draft[key] as string | undefined}
          onChange={(next) => onPatch({ [key]: next })}
          schemaError={errorFor(key, labelKey)}
        />
      );
    case 'deadline':
      return (
        <DeadlineField
          id={id}
          labelKey={labelKey}
          academyId={academyId}
          value={{
            deadline: (draft[key] as string | undefined) ?? '',
            timeZone: draft.timeZone as string | undefined,
          }}
          onChange={(next: DeadlineValue) =>
            onPatch({ [key]: next.deadline, timeZone: next.timeZone })
          }
          schemaError={
            errorFor(key, labelKey) ?? errorFor('timeZone', labelKey)
          }
        />
      );
    case 'plans':
    default:
      return (
        <PricingPlansEditor
          labelKey={labelKey}
          value={draft[key] as (Partial<PricingPlan> & { id: string })[]}
          onChange={(next) => onPatch({ [key]: next })}
          errorFor={errorFor}
          pages={pages}
          academyId={academyId}
        />
      );
  }
}
