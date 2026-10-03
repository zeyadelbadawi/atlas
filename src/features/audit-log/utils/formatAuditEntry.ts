/**
 * formatAuditEntry — turns one structured audit entry into something a
 * person can read: a localized sentence ("Sara created the lesson
 * “Intro to Chemistry” in the unit “Reactions”" / "محمد أنشأ درسًا بعنوان
 * «مقدمة في الكيمياء» داخل وحدة «التفاعلات»"), a few detail lines, and a
 * before/after table.
 *
 * WHY THIS EXISTS. The dashboard used to translate 27 of ~95 actions and
 * fall back to "{{actor}} made a change" for the rest, and the Platform
 * pages printed raw action codes. Every audited action now has copy in
 * `auditLog.json` (`events.<action>`, both languages — a test enforces it),
 * and anything unknown falls back to a TARGET-AWARE sentence ("changed the
 * page “Pricing”"), never a contentless one.
 *
 * SENTENCE VARIANTS. An action may have richer variants that need more
 * context, tried in this order and used only when every placeholder they
 * contain has a value:
 *   `_full` → `_inSection` → `_inCourse` → `_withName` → base → `_noTarget`
 * e.g. `course_lesson.created_inSection` is used when the row carries a
 * `sectionTitle`, and plain `course_lesson.created` otherwise. Placeholders
 * are read from the raw resource string, so adding a variant needs no code.
 *
 * Pure: takes the i18next instance (and optional formatters) rather than
 * calling hooks, so it is shared by lists, drawers and tests alike.
 */
import type { i18n as I18n } from 'i18next';
import type {
  AuditChanges,
  AuditContext,
  AuditLogEntrySummary,
  DashboardActivityItem,
  TenantAuditLogEntry,
} from '@types';
import { auditCategoryOf } from './audit-event-catalog';

const NS = 'auditLog';

/** The shape every caller normalises to (see the `from*` adapters below). */
export interface AuditEntryInput {
  readonly action: string;
  readonly actorName?: string | null;
  /** An Atlas operator performed it — shown as "Atlas" rather than by name. */
  readonly actorIsPlatformStaff?: boolean;
  readonly targetType?: string | null;
  readonly targetLabel?: string | null;
  readonly context?: AuditContext | null;
  readonly changes?: AuditChanges | null;
  readonly changedFields?: readonly string[] | null;
  readonly category?: string | null;
}

export interface FormatAuditOptions {
  /** Formats an ISO timestamp found in a changed value (`fmt.dateTime`). */
  readonly formatDateTime?: (iso: string) => string;
  readonly formatNumber?: (value: number) => string;
}

export interface FormattedAuditChange {
  readonly field: string;
  readonly label: string;
  readonly from: string;
  readonly to: string;
}

export interface FormattedAuditEntry {
  readonly sentence: string;
  readonly actorLabel: string;
  readonly categoryLabel: string;
  /** Extra readable lines ("Sections: 2 added…", "Changed: title, price."). */
  readonly details: readonly string[];
  readonly changes: readonly FormattedAuditChange[];
}

/** Variant suffixes, richest first. `''` is the base sentence. */
const VARIANT_SUFFIXES = [
  '_full',
  '_inSection',
  '_inCourse',
  '_withName',
  '',
  '_noTarget',
];

const PLACEHOLDER = /{{\s*([\w.]+)\s*}}/g;
const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;
const MAX_VALUE_LENGTH = 160;

function truncate(value: string, max = MAX_VALUE_LENGTH): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function nonEmpty(value: unknown): value is string | number | boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return typeof value === 'number' || typeof value === 'boolean';
}

/** `pricingAmountMinorUnits` → "Pricing amount minor units". */
export function humanizeKey(key: string): string {
  const words = key
    .replace(/[_.]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function listSeparator(language: string): string {
  return language.startsWith('ar') ? '، ' : ', ';
}

export function formatAuditEntry(
  entry: AuditEntryInput,
  i18n: I18n,
  options: FormatAuditOptions = {}
): FormattedAuditEntry {
  const language = i18n.language;
  const t = (key: string, values?: Record<string, unknown>): string =>
    i18n.t(`${NS}:${key}`, values ?? {});
  const has = (key: string): boolean => i18n.exists(`${NS}:${key}`);
  const rawResource = (key: string): unknown =>
    i18n.getResource(language, NS, key) ??
    i18n.getResource(i18n.languages?.[1] ?? language, NS, key);

  const context: AuditContext = entry.context ?? {};
  const separator = listSeparator(language);

  const actorLabel = entry.actorIsPlatformStaff
    ? t('actor.atlas')
    : entry.actorName?.trim() || t('actor.someone');

  const category = entry.category || auditCategoryOf(entry.action);
  const categoryLabel = has(`categories.${category}`)
    ? t(`categories.${category}`)
    : t('categories.other');

  const targetTypeLabel = (type: string | null | undefined): string => {
    if (!type) return t('targetTypes.course');
    return has(`targetTypes.${type}`)
      ? t(`targetTypes.${type}`)
      : humanizeKey(type);
  };

  const providerLabel = (key: unknown): string | undefined => {
    if (!nonEmpty(key)) return undefined;
    const raw = String(key);
    return has(`values.providers.${raw}`) ? t(`values.providers.${raw}`) : raw;
  };

  // Everything a sentence may interpolate. Context scalars pass through
  // (stringified); the derived names cover the common variants.
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(context)) {
    if (nonEmpty(value)) vars[key] = String(value);
  }
  vars.actor = actorLabel;
  if (nonEmpty(entry.targetLabel)) vars.target = entry.targetLabel.trim();
  const personName = [
    context.studentName,
    context.memberName,
    context.instructorName,
  ].find(nonEmpty);
  if (personName !== undefined) vars.name = String(personName);
  const provider =
    providerLabel(context.providerKey) ??
    (entry.targetType === 'organization_gateway_credential'
      ? providerLabel(entry.targetLabel)
      : undefined);
  if (provider) vars.provider = provider;
  if (nonEmpty(context.addOnKey))
    vars.addOn = providerLabel(context.addOnKey) ?? '';

  const satisfies = (template: string): boolean => {
    for (const match of template.matchAll(PLACEHOLDER)) {
      if (!nonEmpty(vars[match[1]])) return false;
    }
    return true;
  };

  let sentence: string | undefined;
  const base = `events.${entry.action}`;
  for (const suffix of VARIANT_SUFFIXES) {
    const template = rawResource(`${base}${suffix}`);
    if (typeof template === 'string' && satisfies(template)) {
      sentence = t(`${base}${suffix}`, vars);
      break;
    }
  }

  if (sentence === undefined && typeof rawResource(base) === 'string') {
    // Known action, but a placeholder is missing (e.g. an untitled target).
    sentence = t(base, {
      target: t('untitled'),
      provider: '',
      addOn: '',
      ...vars,
    });
  }

  if (sentence === undefined) {
    // Unknown action: say WHAT was changed, never just "made a change".
    if (entry.targetType && vars.target) {
      sentence = t('fallback.withTarget', {
        actor: actorLabel,
        targetType: targetTypeLabel(entry.targetType),
        target: vars.target,
      });
    } else if (entry.targetType && has(`targetTypes.${entry.targetType}`)) {
      sentence = t('fallback.noTarget', {
        actor: actorLabel,
        targetType: targetTypeLabel(entry.targetType),
      });
    } else {
      sentence = t('fallback.category', {
        actor: actorLabel,
        category: categoryLabel,
      });
    }
  }

  const fieldLabel = (field: string): string =>
    has(`fields.${field}`) ? t(`fields.${field}`) : humanizeKey(field);

  const formatValue = (field: string, value: unknown): string => {
    if (value === null || value === undefined || value === '')
      return t('values.empty');
    if (value === '[redacted]') return t('values.redacted');
    if (value === '[email hidden]') return t('values.emailHidden');
    if (typeof value === 'boolean')
      return value ? t('values.yes') : t('values.no');
    if (typeof value === 'number') {
      return options.formatNumber ? options.formatNumber(value) : String(value);
    }
    if (typeof value === 'string') {
      if (has(`values.${field}.${value}`)) return t(`values.${field}.${value}`);
      if (field === 'status' && has(`values.status.${value}`)) {
        return t(`values.status.${value}`);
      }
      if (ISO_DATE.test(value) && options.formatDateTime) {
        return options.formatDateTime(value);
      }
      return truncate(value);
    }
    if (Array.isArray(value)) {
      if (value.every((item) => item === null || typeof item !== 'object')) {
        return value.length === 0
          ? t('values.empty')
          : truncate(value.map((item) => String(item)).join(separator));
      }
      return t('values.itemCount', { n: value.length });
    }
    if (typeof value === 'object') {
      const localized = value as Record<string, unknown>;
      const own = localized[language.slice(0, 2)];
      const other = localized.en ?? localized.ar;
      if (typeof own === 'string' && own.trim()) return truncate(own);
      if (typeof other === 'string' && other.trim()) return truncate(other);
      return truncate(JSON.stringify(value));
    }
    return truncate(String(value));
  };

  const changes: FormattedAuditChange[] = Object.entries(
    entry.changes ?? {}
  ).map(([field, change]) => ({
    field,
    label: fieldLabel(field),
    from: formatValue(field, change?.from),
    to: formatValue(field, change?.to),
  }));

  const details: string[] = [];
  const num = (key: string): number | undefined =>
    typeof context[key] === 'number' ? (context[key] as number) : undefined;

  const added = num('sectionsAdded');
  const removed = num('sectionsRemoved');
  const updated = num('sectionsUpdated');
  if (added !== undefined || removed !== undefined || updated !== undefined) {
    if ((added ?? 0) + (removed ?? 0) + (updated ?? 0) > 0) {
      details.push(
        t('summary.sections', {
          added: added ?? 0,
          removed: removed ?? 0,
          updated: updated ?? 0,
          total: num('sectionCount') ?? 0,
        })
      );
    }
  }

  const qAdded = num('questionsAdded');
  const qRemoved = num('questionsRemoved');
  const qChanged = num('questionsChanged');
  if (
    qAdded !== undefined ||
    qRemoved !== undefined ||
    qChanged !== undefined
  ) {
    details.push(
      t('summary.questions', {
        added: qAdded ?? 0,
        removed: qRemoved ?? 0,
        changed: qChanged ?? 0,
        total: num('questionCount') ?? 0,
      })
    );
  }

  if (nonEmpty(context.changedAreas)) {
    const areas = String(context.changedAreas)
      .split(',')
      .map((area) => area.trim())
      .filter(Boolean)
      .map((area) =>
        has(`values.configAreas.${area}`)
          ? t(`values.configAreas.${area}`)
          : humanizeKey(area)
      );
    if (areas.length > 0)
      details.push(t('summary.configAreas', { areas: areas.join(separator) }));
  }

  if (nonEmpty(context.notes)) {
    details.push(
      t('summary.notes', { notes: truncate(String(context.notes)) })
    );
  }

  if (
    changes.length === 0 &&
    entry.changedFields &&
    entry.changedFields.length > 0
  ) {
    details.push(
      t('summary.changedFields', {
        fields: entry.changedFields.map(fieldLabel).join(separator),
      })
    );
  }

  return { sentence, actorLabel, categoryLabel, details, changes };
}

/* ------------------------------ adapters ------------------------------ */

export function fromTenantEntry(
  entry: TenantAuditLogEntry & { readonly changes?: AuditChanges }
): AuditEntryInput {
  return {
    action: entry.action,
    actorName: entry.actor.name,
    actorIsPlatformStaff: entry.actor.isPlatformStaff,
    targetType: entry.targetType,
    targetLabel: entry.targetLabel,
    context: entry.context,
    changes: entry.changes,
    changedFields: entry.changedFields,
    category: entry.category,
  };
}

/** The Platform Owner sees the operator's real name. */
export function fromPlatformEntry(
  entry: AuditLogEntrySummary & { readonly changes?: AuditChanges }
): AuditEntryInput {
  return {
    action: entry.action,
    actorName: entry.actor.name,
    targetType: entry.targetType,
    targetLabel: entry.targetLabel,
    context: entry.context,
    changes: entry.changes,
    changedFields: entry.changedFields,
    category: entry.category,
  };
}

export function fromDashboardItem(
  item: DashboardActivityItem
): AuditEntryInput {
  return {
    action: item.action,
    actorName: item.actorName,
    actorIsPlatformStaff: item.actorIsPlatformStaff,
    targetType: item.targetType,
    targetLabel: item.targetLabel,
    context: item.context,
    changedFields: item.changedFields,
    category: item.category,
  };
}
