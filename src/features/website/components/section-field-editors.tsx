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
import {
  ComparisonGridEditor,
  resolveComparisonIssue,
} from './ComparisonGridEditor';
import { CustomSectionEditor } from './custom-section/CustomSectionEditor';
import { resolveCustomLayoutIssue } from './custom-section/custom-elements';

const CUSTOM_KINDS: ReadonlySet<string> = new Set([
  'youtube',
  'deadline',
  'plans',
  'comparison',
  'customLayout',
]);

/** The config keys the custom section's layout editor writes. */
const CUSTOM_LAYOUT_KEYS = ['layout', 'ratio', 'verticalAlign', 'columns'];

/**
 * The config keys a custom field edits, when more than its own `key`: the
 * comparison grid edits `columns` and `rows` (so a problem under `rows` is
 * named after it too).
 */
export function customFieldKeys(
  descriptor: CustomFieldDescriptor
): readonly string[] {
  if (descriptor.kind === 'customLayout') return CUSTOM_LAYOUT_KEYS;
  return descriptor.kind === 'comparison'
    ? ['columns', 'rows']
    : [descriptor.key];
}

export function isCustomField(
  descriptor: SectionFieldDescriptor
): descriptor is CustomFieldDescriptor {
  return CUSTOM_KINDS.has(descriptor.kind);
}

/** How the form's summary names a problem inside a custom field (`rest` is the path after `head`, the config key it is under). */
export function resolveCustomFieldIssue(
  descriptor: CustomFieldDescriptor,
  rest: readonly string[],
  head: string = descriptor.key,
  /** The section's config as typed (the custom section names an element by its kind). */
  draft?: Readonly<Record<string, unknown>>
): {
  readonly labelKeys: readonly string[];
  readonly itemNumber?: number;
  readonly maxLength?: number;
} {
  if (descriptor.kind === 'plans' && rest.length > 0) {
    return resolvePlanIssue(rest);
  }
  if (descriptor.kind === 'comparison') {
    return resolveComparisonIssue(head, rest);
  }
  if (descriptor.kind === 'customLayout') {
    return resolveCustomLayoutIssue(head, rest, draft);
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
  revealErrors = false,
}: {
  readonly descriptor: CustomFieldDescriptor;
  /** The section's config as typed. */
  readonly draft: Readonly<Record<string, unknown>>;
  /** Merges these keys into the config. */
  readonly onPatch: (patch: Record<string, unknown>) => void;
  readonly errorFor: FieldErrorLookup;
  readonly pages: readonly WebsitePage[];
  readonly academyId: string;
  /** After a refused Apply: fields that wait for blur show their problem now. */
  readonly revealErrors?: boolean;
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
    case 'comparison':
      return (
        <ComparisonGridEditor
          labelKey={labelKey}
          columns={
            draft.columns as Parameters<
              typeof ComparisonGridEditor
            >[0]['columns']
          }
          rows={
            draft.rows as Parameters<typeof ComparisonGridEditor>[0]['rows']
          }
          onChange={onPatch}
          errorFor={errorFor}
        />
      );
    case 'customLayout':
      return (
        <CustomSectionEditor
          draft={draft}
          onPatch={onPatch}
          errorFor={errorFor}
          revealErrors={revealErrors}
          pages={pages}
          academyId={academyId}
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
