/**
 * Section Config Form.
 *
 * The ONE generic form the Section Editor dialog renders, driven by
 * `SECTION_FIELD_SCHEMAS[type]` (see `section-field.types.ts` for why).
 *
 * The form's working state is intentionally `Record<string, unknown>` —
 * this component is generic across 11 different config shapes by design,
 * so it cannot be typed as any one of them. The boundary where real type
 * safety is enforced is `onSave`: nothing reaches the caller until
 * `getSectionConfigSchema(type).safeParse(...)` accepts it, so an invalid
 * or malformed value can never be persisted — this is the same
 * "validate at the boundary, stay loose in a genuinely generic renderer"
 * pattern used nowhere else in Atlas because nowhere else needs a
 * runtime-driven form; it is not a general license for `any`.
 *
 * FIELD-LEVEL ERRORS. A refused Apply marks each offending field (per
 * item, per language) from the zod issues' paths, focuses the first one
 * and keeps a short summary at the top — never a single generic "some
 * values need correcting". Text over a content limit is shown from the
 * moment the section opens, untruncated: limits tightened after some
 * content was written (`website.constants.ts`), so a section can arrive
 * holding text the next save will refuse. The same path-level messages
 * cover what the API refused on the last page save (`serverIssues`), in
 * case the server found something this check did not.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, BadgeCheck, Plus, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { WebsiteImageField } from './WebsiteImageField';
import { resolveSectionImagePurpose } from '../constants/image-recommendations.constants';
import {
  LocalizedTextField,
  type LocalizedFieldErrors,
} from './LocalizedTextField';
import { PublicWebsiteLocaleProvider } from '../renderer/PublicWebsiteLocaleContext';
import {
  PUBLIC_WEBSITE_LOCALES,
  PUBLIC_WEBSITE_LOCALE_LABELS,
  DEFAULT_PUBLIC_WEBSITE_LOCALE,
  type PublicWebsiteLocale,
} from '../constants/locale.constants';
import { useWebsiteFaqEntries, useWebsiteTestimonialEntries } from '../hooks';
import { SECTION_FIELD_SCHEMAS } from '../sections/section-fields.registry';
import { getSectionConfigSchema } from '../schemas/website-section.schemas';
import {
  collectSectionIssues,
  isOverLimitIssue,
  type SectionContentIssue,
} from '../schemas/section-content-issues';
import {
  MAX_CTA_LABEL_LENGTH,
  MAX_SECTION_ITEMS,
  MAX_SELECTED_COURSES,
} from '../constants/website.constants';
import { isSafeExternalUrl } from '../utils/url-safety.utils';
import { useCourses } from '@features/course';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { EMPTY_LOCALIZED_TEXT } from '../utils/localized-text.utils';
import { WebsiteThemeScope } from '../renderer/WebsiteThemeScope';
import { SectionRenderer } from '../sections/SectionRenderer';
import type {
  SectionFieldDescriptor,
  SectionFieldSchema,
} from '../sections/section-field.types';
import { DEFAULT_RESPONSIVE_VISIBILITY } from '@types';
import type {
  LanguageCode,
  LocalizedText,
  SectionConfigMap,
  SectionInstance,
  SectionType,
  WebsiteConfiguration,
  WebsiteContentStatus,
  WebsiteCta,
  WebsitePage,
} from '@types';

type DraftValue = Record<string, unknown>;

export interface SectionConfigFormProps<TType extends SectionType> {
  readonly type: TType;
  readonly academyId: string;
  readonly initialConfig: SectionConfigMap[TType];
  readonly pages: readonly WebsitePage[];
  /**
   * Phase 6 — the real theme/brand this Academy's public site renders
   * under, so the live inline preview below uses the SAME
   * `WebsiteThemeScope`/`SectionRenderer` pipeline as the actual public
   * site (never a second, simplified preview renderer).
   */
  readonly configuration: Pick<WebsiteConfiguration, 'themeKey' | 'brand'>;
  readonly onSave: (config: SectionConfigMap[TType]) => void;
  readonly onCancel: () => void;
  readonly isSaving: boolean;
  /** What the API refused in this section on the last page save (config-relative paths); shown until the section is edited. */
  readonly serverIssues?: readonly SectionContentIssue[];
}

/**
 * The translated message for one field path, or `undefined` when it has
 * none. `maxLength` is the field's own limit: a field that has one reports
 * its over-limit text itself (live counter), so that issue is skipped here.
 */
type FieldErrorLookup = (
  path: string,
  labelKey: string,
  maxLength?: number
) => string | undefined;

/** Both languages' messages for a localized field at `path`. */
function localizedErrors(
  errorFor: FieldErrorLookup,
  path: string,
  labelKey: string,
  maxLength?: number
): LocalizedFieldErrors {
  return {
    en: errorFor(`${path}.en`, labelKey, maxLength),
    ar: errorFor(`${path}.ar`, labelKey, maxLength),
  };
}

/** Whether a descriptor is offered under this theme (see `SectionFieldDescriptor.themes`). */
function isOfferedFor(
  descriptor: SectionFieldDescriptor,
  themeKey: WebsiteConfiguration['themeKey']
): boolean {
  return !descriptor.themes || descriptor.themes.includes(themeKey);
}

/**
 * Which field an issue path belongs to — the label a person reads in the
 * summary and the limit an over-length message names.
 */
function resolveIssueField(
  schema: SectionFieldSchema,
  path: string
): {
  readonly labelKeys: readonly string[];
  readonly itemNumber?: number;
  readonly language?: 'en' | 'ar';
  readonly maxLength?: number;
} {
  const parts = path.split('.');
  const last = parts[parts.length - 1];
  const language =
    parts.length > 1 && (last === 'en' || last === 'ar') ? last : undefined;
  if (language) parts.pop();
  const [head, second, third] = parts;

  const field = schema.fields.find((candidate) => candidate.key === head);
  if (field) {
    if (field.kind === 'cta') {
      return {
        labelKeys:
          second === 'label'
            ? [field.labelKey, 'website:fields.ctaLabelPlaceholder']
            : [field.labelKey],
        language,
        maxLength: second === 'label' ? MAX_CTA_LABEL_LENGTH : undefined,
      };
    }
    return {
      labelKeys: [field.labelKey],
      language,
      maxLength: 'maxLength' in field ? field.maxLength : undefined,
    };
  }

  const group = schema.repeatable;
  if (group && head === group.key) {
    const index = Number(second);
    if (!Number.isInteger(index)) return { labelKeys: [group.labelKey] };
    const itemField = group.itemFields.find(
      (candidate) => candidate.key === third
    );
    return {
      labelKeys: itemField
        ? [group.itemLabelKey, itemField.labelKey]
        : [group.itemLabelKey],
      itemNumber: index + 1,
      language,
      maxLength:
        itemField && 'maxLength' in itemField ? itemField.maxLength : undefined,
    };
  }

  return { labelKeys: ['website:editor.sectionSettings'], language };
}

interface LibraryOption {
  readonly id: string;
  readonly label: string;
  readonly status: WebsiteContentStatus;
  readonly visible: boolean;
}

/** Why a picked entry will not show publicly — `null` when it will. */
function libraryEntryProblem(
  option: LibraryOption | undefined
): 'missing' | 'archived' | 'draft' | 'hidden' | null {
  if (!option) return 'missing';
  if (option.status === 'archived') return 'archived';
  if (option.status === 'draft') return 'draft';
  if (!option.visible) return 'hidden';
  return null;
}

/**
 * Content-library picker for a FAQ / Testimonials section.
 *
 * The section shows the picked entries in the order listed here
 * (`libraryEntryIds`), so the picked list is the editor: reorder, remove.
 * Every pick stays listed even after it stops qualifying (unpublished,
 * hidden, archived, deleted) — labelled with why it won't show and
 * removable — so nothing disappears from the site without the Owner
 * seeing why. Only published, visible entries can be added.
 */
export function LibraryEntryPicker({
  titleKey,
  helpKey,
  options,
  selectedIds,
  onChange,
}: {
  readonly titleKey: string;
  readonly helpKey: string;
  /** Every library entry, any status; `undefined` while loading. */
  readonly options: readonly LibraryOption[] | undefined;
  readonly selectedIds: readonly string[];
  readonly onChange: (ids: string[]) => void;
}): JSX.Element | null {
  const { t } = useTranslation();
  if (!options) return null;
  if (options.length === 0 && selectedIds.length === 0) return null;

  const byId = new Map(options.map((option) => [option.id, option]));
  const available = options.filter(
    (option) =>
      libraryEntryProblem(option) === null && !selectedIds.includes(option.id)
  );
  const unavailable = selectedIds.filter(
    (id) => libraryEntryProblem(byId.get(id)) !== null
  );
  const atLimit = selectedIds.length >= MAX_SECTION_ITEMS;

  const move = (index: number, delta: -1 | 1) => {
    const next = [...selectedIds];
    const [moved] = next.splice(index, 1);
    next.splice(index + delta, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <p className="text-sm font-medium text-foreground">{t(titleKey)}</p>
      <p className="text-xs text-muted-foreground">{t(helpKey)}</p>

      <p className="text-xs font-medium text-foreground">
        {t('website:editor.libraryEntriesSelected')}
      </p>
      {selectedIds.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('website:editor.libraryEntriesNoneSelected')}
        </p>
      ) : (
        <ol className="space-y-2" data-testid="library-selected">
          {selectedIds.map((id, index) => {
            const option = byId.get(id);
            const problem = libraryEntryProblem(option);
            const label =
              option?.label || t('website:editor.libraryEntriesUnknownLabel');
            return (
              <li
                key={id}
                className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
              >
                <Badge variant="secondary" aria-hidden>
                  {index + 1}
                </Badge>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1">{label}</span>
                  {problem ? (
                    <span className="block text-xs text-destructive">
                      {t(`website:editor.libraryEntriesProblem.${problem}`)}
                    </span>
                  ) : null}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === 0}
                  aria-label={t('website:editor.libraryEntriesMoveUp', {
                    label,
                  })}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="size-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === selectedIds.length - 1}
                  aria-label={t('website:editor.libraryEntriesMoveDown', {
                    label,
                  })}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="size-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('website:editor.libraryEntriesRemove', {
                    label,
                  })}
                  onClick={() =>
                    onChange(selectedIds.filter((existing) => existing !== id))
                  }
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </li>
            );
          })}
        </ol>
      )}
      {unavailable.length > 0 ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          onClick={() =>
            onChange(selectedIds.filter((id) => !unavailable.includes(id)))
          }
        >
          {t('website:editor.libraryEntriesRemoveUnavailable', {
            count: unavailable.length,
          })}
        </Button>
      ) : null}

      {available.length > 0 ? (
        <>
          <p className="text-xs font-medium text-foreground">
            {t('website:editor.libraryEntriesAvailable')}
          </p>
          <ul className="space-y-2" data-testid="library-available">
            {available.map((option) => (
              <li key={option.id} className="flex items-center gap-2 text-sm">
                <span className="line-clamp-1 flex-1">{option.label}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={atLimit}
                  aria-label={t('website:editor.libraryEntriesAddLabel', {
                    label: option.label,
                  })}
                  onClick={() => onChange([...selectedIds, option.id])}
                >
                  <Plus className="size-4" aria-hidden />
                  {t('website:editor.libraryEntriesAdd')}
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {atLimit ? (
        <p className="text-xs text-muted-foreground">
          {t('website:editor.libraryEntriesLimit', {
            count: MAX_SECTION_ITEMS,
          })}
        </p>
      ) : null}
    </div>
  );
}

/** Every entry, any status: a pick that stopped qualifying must stay visible (and removable) in the picker. */
const LIBRARY_PICKER_QUERY = {
  pagination: { page: 1, pageSize: 100 },
} as const;

/** Fetches and adapts the Academy's FAQ library — kept separate from `TestimonialLibraryField` so each calls its own hook unconditionally, never behind a runtime branch. */
function FaqLibraryField({
  academyId,
  selectedIds,
  onChange,
}: {
  readonly academyId: string;
  readonly selectedIds: readonly string[];
  readonly onChange: (ids: string[]) => void;
}): JSX.Element | null {
  const { i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { data } = useWebsiteFaqEntries(academyId, {
    query: LIBRARY_PICKER_QUERY,
  });
  const options: LibraryOption[] | undefined = data?.items.map((entry) => ({
    id: entry.id,
    label: entry.question[language] || entry.question.en,
    status: entry.status,
    visible: entry.visible,
  }));

  return (
    <LibraryEntryPicker
      titleKey="website:editor.libraryEntries"
      helpKey="website:editor.libraryEntriesHelpFaq"
      options={options}
      selectedIds={selectedIds}
      onChange={onChange}
    />
  );
}

/** Same reasoning as `FaqLibraryField` — see its doc comment. */
function TestimonialLibraryField({
  academyId,
  selectedIds,
  onChange,
}: {
  readonly academyId: string;
  readonly selectedIds: readonly string[];
  readonly onChange: (ids: string[]) => void;
}): JSX.Element | null {
  const { i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { data } = useWebsiteTestimonialEntries(academyId, {
    query: LIBRARY_PICKER_QUERY,
  });
  const options: LibraryOption[] | undefined = data?.items.map((entry) => ({
    id: entry.id,
    label: `${entry.quote[language] || entry.quote.en} — ${entry.authorName}`,
    status: entry.status,
    visible: entry.visible,
  }));

  return (
    <LibraryEntryPicker
      titleKey="website:editor.libraryEntries"
      helpKey="website:editor.libraryEntriesHelpTestimonials"
      options={options}
      selectedIds={selectedIds}
      onChange={onChange}
    />
  );
}

/**
 * Featured Courses "selected" mode: the Owner picks which courses show, in
 * pick order (the public site renders them in that order). Offers only
 * courses the public site can actually show — published and public — and
 * names any earlier pick that no longer qualifies, so nothing silently
 * disappears.
 */
function FeaturedCoursesPicker({
  academyId,
  selectedIds,
  onChange,
}: {
  readonly academyId: string;
  readonly selectedIds: readonly string[];
  readonly onChange: (ids: string[]) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const { data } = useCourses(academyId, {
    query: {
      pagination: { page: 1, pageSize: 100 },
      filters: { status: 'published', visibility: 'public' },
    },
  });
  const options = data?.items ?? [];
  const unavailable = data
    ? selectedIds.filter((id) => !options.some((course) => course.id === id))
    : [];
  const atLimit = selectedIds.length >= MAX_SELECTED_COURSES;

  const toggle = (id: string, checked: boolean) =>
    onChange(
      checked
        ? [...selectedIds, id]
        : selectedIds.filter((existing) => existing !== id)
    );

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <p className="text-sm font-medium text-foreground">
        {t('website:editor.featuredCoursesTitle')}
      </p>
      <p className="text-xs text-muted-foreground">
        {t('website:editor.featuredCoursesHelp')}
      </p>
      {data && options.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('website:editor.featuredCoursesEmpty')}
        </p>
      ) : (
        <ul className="space-y-2">
          {options.map((course) => {
            const position = selectedIds.indexOf(course.id);
            const checked = position >= 0;
            return (
              <li key={course.id}>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={checked}
                    disabled={!checked && atLimit}
                    onCheckedChange={(next) => toggle(course.id, next === true)}
                  />
                  <span className="line-clamp-1 flex-1">{course.title}</span>
                  {checked ? (
                    <Badge variant="secondary" aria-hidden>
                      {position + 1}
                    </Badge>
                  ) : null}
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {atLimit ? (
        <p className="text-xs text-muted-foreground">
          {t('website:editor.featuredCoursesLimit', {
            count: MAX_SELECTED_COURSES,
          })}
        </p>
      ) : null}
      {unavailable.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            {t('website:editor.featuredCoursesUnavailable', {
              count: unavailable.length,
            })}
          </span>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() =>
              onChange(selectedIds.filter((id) => !unavailable.includes(id)))
            }
          >
            {t('website:editor.featuredCoursesRemoveUnavailable')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Which target kind a CTA currently points to — derived from which field is populated, never stored separately (see `WebsiteCta`'s doc comment). */
type CtaLinkType = 'page' | 'external' | 'course';

/**
 * Checked by KEY PRESENCE (`!== undefined`), never truthiness. `setLinkType`
 * below sets the newly-chosen field to `''` (a course/URL not yet picked
 * is still that link type, just incomplete) — a truthy check on an empty
 * string reports `false`, so the type this very function had just told the
 * Select to switch to would immediately be inferred as 'page' again on
 * the next render, snapping the dropdown straight back before a tenant
 * could type or pick anything.
 */
function inferLinkType(value: Partial<WebsiteCta> | undefined): CtaLinkType {
  if (value?.courseId !== undefined) return 'course';
  if (value?.url !== undefined) return 'external';
  return 'page';
}

/**
 * The one editor for every CTA in the Section Registry (Hero primary/
 * secondary, CTA banner). Exposes a Link Type selector so a tenant picks
 * an internal page, a real Course, or types an external URL — rather
 * than `url` being a silently unreachable field, as it was before Prompt
 * 11 (see `Reports/ARCHITECTURE.md`, Prompt 11, "CTA Editor Gap").
 */
function CtaFieldEditor({
  value,
  onChange,
  labelKey,
  path,
  errorFor,
  pages,
  academyId,
}: {
  readonly value: Partial<WebsiteCta> | undefined;
  readonly onChange: (next: Partial<WebsiteCta> | undefined) => void;
  readonly labelKey: string;
  /** The CTA's key in the section config, e.g. `cta` or `secondaryCta`. */
  readonly path: string;
  readonly errorFor: FieldErrorLookup;
  readonly pages: readonly WebsitePage[];
  readonly academyId: string;
}): JSX.Element {
  const { t } = useTranslation();
  const linkType = inferLinkType(value);
  const urlValue = value?.url ?? '';
  const urlError =
    (urlValue && !isSafeExternalUrl(urlValue)) ||
    Boolean(errorFor(`${path}.url`, labelKey));

  const { data: coursesData } = useCourses(academyId, {
    query: {
      pagination: { page: 1, pageSize: 100 },
      filters: { status: 'published' },
    },
  });
  const courses = coursesData?.items ?? [];

  const emptyLabel: LocalizedText = { en: '', ar: '' };

  const setLinkType = (type: CtaLinkType) => {
    // Switching target kind clears the other kinds' fields — a CTA
    // never carries a stale pageId/url/courseId from a previous choice.
    const base = { label: value?.label ?? emptyLabel };
    if (type === 'page') onChange(base);
    else if (type === 'external') onChange({ ...base, url: '' });
    else onChange({ ...base, courseId: '' });
  };

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <p className="text-sm font-medium text-foreground">{t(labelKey)}</p>
      {/* Every section CTA shares one label limit (`websiteCtaSchema`). */}
      <LocalizedTextField
        id={`cta-label-${path}`}
        labelKey="website:fields.ctaLabelPlaceholder"
        value={value?.label as Partial<LocalizedText> | undefined}
        onChange={(label) => onChange({ ...value, label })}
        required
        maxLength={MAX_CTA_LABEL_LENGTH}
        errors={localizedErrors(
          errorFor,
          `${path}.label`,
          'website:fields.ctaLabelPlaceholder',
          MAX_CTA_LABEL_LENGTH
        )}
      />

      <div className="space-y-1.5">
        <Label>{t('website:fields.linkType')}</Label>
        <Select
          value={linkType}
          onValueChange={(next) => setLinkType(next as CtaLinkType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="page">
              {t('website:fields.linkTypePage')}
            </SelectItem>
            <SelectItem value="external">
              {t('website:fields.linkTypeExternal')}
            </SelectItem>
            <SelectItem value="course">
              {t('website:fields.linkTypeCourse')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {linkType === 'page' ? (
        <Select
          value={value?.pageId}
          onValueChange={(pageId) =>
            onChange({ label: value?.label ?? emptyLabel, pageId })
          }
        >
          <SelectTrigger>
            <SelectValue
              placeholder={t('website:fields.ctaTargetPlaceholder')}
            />
          </SelectTrigger>
          <SelectContent>
            {pages.map((page) => (
              <SelectItem key={page.id} value={page.id}>
                {page.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {linkType === 'course' ? (
        <Select
          value={value?.courseId}
          onValueChange={(courseId) =>
            onChange({ label: value?.label ?? emptyLabel, courseId })
          }
        >
          <SelectTrigger>
            <SelectValue
              placeholder={t('website:fields.ctaCoursePlaceholder')}
            />
          </SelectTrigger>
          <SelectContent>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {linkType === 'external' ? (
        <div className="space-y-1">
          <Input
            dir="ltr"
            placeholder="https://example.com"
            aria-invalid={urlError || undefined}
            data-field-error={urlError || undefined}
            value={urlValue}
            onChange={(event) =>
              onChange({
                // `label` is `LocalizedText`, so the fallback must be one
                // too — a bare `''` here produced legacy-shaped data that
                // the bilingual label editor could not bind to.
                label: value?.label ?? EMPTY_LOCALIZED_TEXT,
                url: event.target.value,
              })
            }
          />
          {urlError ? (
            <p className="text-xs text-destructive">
              {t('validation:invalidUrl')}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ScalarField({
  descriptor,
  path,
  errorFor,
  value,
  onChange,
  academyId,
  sectionType,
}: {
  readonly descriptor: SectionFieldDescriptor;
  /** Where the value lives in the section config, e.g. `title` or `items.2.title`. */
  readonly path: string;
  readonly errorFor: FieldErrorLookup;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
  readonly academyId: string;
  /** Which section this field belongs to — decides the image recommendation. */
  readonly sectionType: SectionType;
}): JSX.Element {
  const id = `section-field-${path.replace(/\./g, '-')}`;

  if (
    (descriptor.kind === 'text' || descriptor.kind === 'longText') &&
    descriptor.localized
  ) {
    return (
      <LocalizedTextField
        id={id}
        labelKey={descriptor.labelKey}
        value={value as Partial<LocalizedText> | undefined}
        onChange={onChange}
        multiline={descriptor.kind === 'longText'}
        maxLength={descriptor.maxLength}
        errors={localizedErrors(
          errorFor,
          path,
          descriptor.labelKey,
          descriptor.maxLength
        )}
      />
    );
  }

  const error = errorFor(path, descriptor.labelKey);
  const errorId = `${id}-message`;
  return (
    <div className="space-y-1">
      <ScalarControl
        descriptor={descriptor}
        id={id}
        value={value}
        onChange={onChange}
        academyId={academyId}
        sectionType={sectionType}
        invalidProps={
          error
            ? {
                'aria-invalid': true,
                'aria-describedby': errorId,
                'data-field-error': true,
              }
            : {}
        }
      />
      {error ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** What marks a plain control invalid — spread onto the focusable element. */
interface InvalidControlProps {
  readonly 'aria-invalid'?: true;
  readonly 'aria-describedby'?: string;
  readonly 'data-field-error'?: true;
}

/** The input for one non-localized field (`ScalarField` adds its error message). */
function ScalarControl({
  descriptor,
  id,
  value,
  onChange,
  academyId,
  sectionType,
  invalidProps,
}: {
  readonly descriptor: SectionFieldDescriptor;
  readonly id: string;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
  readonly academyId: string;
  readonly sectionType: SectionType;
  readonly invalidProps: InvalidControlProps;
}): JSX.Element {
  const { t } = useTranslation();
  switch (descriptor.kind) {
    case 'longText':
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{t(descriptor.labelKey)}</Label>
          <Textarea
            id={id}
            rows={3}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            {...invalidProps}
          />
        </div>
      );
    case 'boolean':
      return (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!value}
            onCheckedChange={(checked) => onChange(checked === true)}
            {...invalidProps}
          />
          {t(descriptor.labelKey)}
        </label>
      );
    case 'number':
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{t(descriptor.labelKey)}</Label>
          <Input
            id={id}
            type="number"
            min={descriptor.min ?? 1}
            max={descriptor.max ?? MAX_SECTION_ITEMS}
            value={
              (value as number | undefined) ?? (descriptor.optional ? '' : 0)
            }
            onChange={(e) =>
              onChange(
                descriptor.optional && e.target.value === ''
                  ? undefined
                  : Number(e.target.value)
              )
            }
            {...invalidProps}
          />
        </div>
      );
    case 'select':
      return (
        <div className="space-y-1.5">
          <Label>{t(descriptor.labelKey)}</Label>
          <Select value={(value as string) ?? ''} onValueChange={onChange}>
            <SelectTrigger {...invalidProps}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {descriptor.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    case 'image':
      return (
        // The picker has several controls; the wrapper is what an error
        // focuses, so it takes focus programmatically only.
        <div
          tabIndex={invalidProps['data-field-error'] ? -1 : undefined}
          {...invalidProps}
        >
          <WebsiteImageField
            id={id}
            labelKey={descriptor.labelKey}
            value={value as string | undefined}
            onChange={onChange}
            academyId={academyId}
            // Section fields are generically named (`image`, `avatar`), so the
            // SECTION is what says whether this is a full-bleed hero band or a
            // 64px round avatar — they want very different files.
            purpose={resolveSectionImagePurpose(sectionType, descriptor.key)}
          />
        </div>
      );
    case 'text':
    default:
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{t(descriptor.labelKey)}</Label>
          <Input
            id={id}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            {...invalidProps}
          />
        </div>
      );
  }
}

export function SectionConfigForm<TType extends SectionType>({
  type,
  academyId,
  initialConfig,
  pages,
  configuration,
  onSave,
  onCancel,
  isSaving,
  serverIssues,
}: SectionConfigFormProps<TType>): JSX.Element {
  const { t, i18n } = useTranslation();
  const schema = SECTION_FIELD_SCHEMAS[type];
  const initialDraft = initialConfig as unknown as DraftValue;
  const [draft, setDraft] = useState<DraftValue>(initialDraft);
  const fields = schema.fields.filter((field) =>
    isOfferedFor(field, configuration.themeKey)
  );
  const itemFields =
    schema.repeatable?.itemFields.filter((field) =>
      isOfferedFor(field, configuration.themeKey)
    ) ?? [];

  /*
   * Which problems are on screen. Over-limit text always is — from the
   * moment the section opens, since it may predate the limit. Everything
   * else (a required title still empty, an unsafe URL) appears once Apply
   * has been tried, so a fresh section doesn't open covered in red. The
   * API's issues from the last refused page save stay until the section
   * is edited.
   */
  const [attempted, setAttempted] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const issues = useMemo(() => {
    const own = collectSectionIssues(type, draft).filter(
      (issue) => attempted || isOverLimitIssue(issue)
    );
    if (draft !== initialDraft || !serverIssues?.length) return own;
    const known = new Set(own.map((issue) => issue.path));
    return [...own, ...serverIssues.filter((issue) => !known.has(issue.path))];
  }, [type, draft, initialDraft, attempted, serverIssues]);

  const messageFor = (
    issue: SectionContentIssue,
    labelKey: string,
    max?: number
  ) => {
    const limit = issue.maximum ?? max;
    if (isOverLimitIssue(issue)) {
      return limit === undefined
        ? t('website:editor.shortenText')
        : t('website:editor.shortenTo', { count: limit });
    }
    return issue.messageKey.startsWith('validation:') &&
      i18n.exists(issue.messageKey)
      ? t(issue.messageKey, { field: t(labelKey) })
      : t('website:editor.fieldInvalid');
  };

  const errorFor: FieldErrorLookup = (path, labelKey, maxLength) => {
    const issue = issues.find((candidate) => candidate.path === path);
    if (!issue) return undefined;
    // A field with its own limit already says "shorten to N" under its
    // counter for what this editor's check found (`maximum` is set); an
    // over-limit only the API reported still needs saying here.
    if (
      maxLength !== undefined &&
      isOverLimitIssue(issue) &&
      issue.maximum !== undefined
    ) {
      return undefined;
    }
    return messageFor(issue, labelKey, maxLength);
  };

  const summary = issues.map((issue) => {
    const field = resolveIssueField(schema, issue.path);
    const [first, ...rest] = field.labelKeys.map((key) => t(key));
    const name = [
      field.itemNumber !== undefined ? `${first} ${field.itemNumber}` : first,
      ...rest,
      ...(field.language
        ? [
            t(
              field.language === 'en'
                ? 'website:editor.languageEnglish'
                : 'website:editor.languageArabic'
            ),
          ]
        : []),
    ].join(' · ');
    return {
      key: issue.path,
      text: `${name}: ${messageFor(issue, field.labelKeys[field.labelKeys.length - 1], field.maxLength)}`,
    };
  });

  // After a refused Apply, take the author to the first field to fix.
  useEffect(() => {
    if (focusRequest === 0) return;
    const target =
      formRef.current?.querySelector<HTMLElement>('[data-field-error]') ??
      summaryRef.current;
    if (!target) return;
    if ('scrollIntoView' in target) target.scrollIntoView({ block: 'center' });
    target.focus({ preventScroll: true });
  }, [focusRequest]);

  // Phase 6 — which language the live preview shows. Independent of the
  // admin's own dashboard chrome language (`i18n.language`) and of which
  // side of the editor fields the admin is currently typing into — a
  // small, explicit toggle so an Owner can genuinely check their Arabic
  // content looks right before saving, not just trust it does.
  const [previewLocale, setPreviewLocale] = useState<PublicWebsiteLocale>(
    DEFAULT_PUBLIC_WEBSITE_LOCALE
  );

  // Phase 6 — live inline preview. Reactive to every keystroke (`draft`),
  // scoped to just this one section instance, rendered through the exact
  // same `SectionRenderer`/`WebsiteThemeScope` the real public site and
  // the Page Editor's own whole-page preview already use — never a
  // simplified stand-in. Deliberately built from `draft` directly (not
  // the schema-validated result `onSave` produces): a preview should keep
  // reflecting in-progress edits even mid-typo, exactly like the public
  // site would once saved, rather than freezing/erroring on every
  // momentarily-invalid keystroke.
  const previewTheme = getWebsiteTheme(configuration.themeKey);
  const previewInstance: SectionInstance = {
    id: 'section-config-form-preview',
    type,
    enabled: true,
    visibility: DEFAULT_RESPONSIVE_VISIBILITY,
    config: draft as unknown as SectionConfigMap[TType],
  } as SectionInstance;

  const setField = (key: string, value: unknown) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const items =
    (schema.repeatable
      ? (draft[schema.repeatable.key] as DraftValue[] | undefined)
      : undefined) ?? [];

  const addItem = () => {
    if (!schema.repeatable) return;
    const blank: DraftValue = { id: crypto.randomUUID() };
    for (const field of itemFields) {
      const isLocalized =
        (field.kind === 'text' || field.kind === 'longText') && field.localized;
      blank[field.key] =
        field.kind === 'boolean'
          ? false
          : isLocalized
            ? { en: '', ar: '' }
            : '';
    }
    setField(schema.repeatable.key, [...items, blank]);
  };

  const updateItem = (index: number, key: string, value: unknown) => {
    if (!schema.repeatable) return;
    const next = items.map((item, i) =>
      i === index ? { ...item, [key]: value } : item
    );
    setField(schema.repeatable.key, next);
  };

  /**
   * Theme 1 plan §D.4 — the ONLY way a sample testimonial becomes real. An
   * explicit Owner action, never a side effect of editing its text (a typo
   * fix must not turn a placeholder quote into a published one).
   */
  const confirmItemReal = (index: number) => {
    if (!schema.repeatable) return;
    setField(
      schema.repeatable.key,
      items.map((item, i) => {
        if (i !== index) return item;
        const real = { ...item };
        delete real.sample;
        return real;
      })
    );
  };
  const hasSampleItems = items.some((item) => item.sample === true);

  const removeItem = (index: number) => {
    if (!schema.repeatable) return;
    setField(
      schema.repeatable.key,
      items.filter((_, i) => i !== index)
    );
  };

  const handleSave = () => {
    const result = getSectionConfigSchema(type).safeParse(draft);
    if (!result.success) {
      setAttempted(true);
      setFocusRequest((count) => count + 1);
      return;
    }
    onSave(result.data as SectionConfigMap[TType]);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div ref={formRef} className="space-y-5">
        {summary.length > 0 ? (
          <div
            ref={summaryRef}
            tabIndex={-1}
            role={attempted ? 'alert' : 'status'}
            data-testid="section-form-issues"
            className="space-y-1 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm"
          >
            <p className="font-medium text-destructive">
              {attempted
                ? t('website:editor.fieldIssuesSummary', {
                    count: summary.length,
                  })
                : t('website:editor.overLimitSummary', {
                    count: summary.length,
                  })}
            </p>
            <ul className="list-disc space-y-0.5 ps-5 text-xs text-foreground">
              {summary.map((entry) => (
                <li key={entry.key}>{entry.text}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {fields.map((field) =>
          field.kind === 'cta' ? (
            <CtaFieldEditor
              key={field.key}
              labelKey={field.labelKey}
              path={field.key}
              errorFor={errorFor}
              pages={pages}
              academyId={academyId}
              value={draft[field.key] as Partial<WebsiteCta> | undefined}
              onChange={(value) => setField(field.key, value)}
            />
          ) : (
            <ScalarField
              key={field.key}
              descriptor={field}
              path={field.key}
              errorFor={errorFor}
              value={draft[field.key]}
              onChange={(value) => setField(field.key, value)}
              academyId={academyId}
              sectionType={type}
            />
          )
        )}

        {schema.repeatable ? (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                {t(schema.repeatable.labelKey)}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addItem}
                disabled={
                  items.length >=
                  (schema.repeatable.maxItems ?? MAX_SECTION_ITEMS)
                }
              >
                <Plus className="size-3.5" aria-hidden />
                {t('website:editor.addItem')}
              </Button>
            </div>
            {hasSampleItems ? (
              <p className="text-xs text-muted-foreground">
                {t('website:editor.sampleHelp')}
              </p>
            ) : null}
            {items.map((item, index) => (
              <div
                key={(item.id as string) ?? index}
                className="space-y-3 rounded-md border border-border p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t(schema.repeatable!.itemLabelKey)} {index + 1}
                    </p>
                    {item.sample === true ? (
                      <>
                        <Badge variant="outline" className="whitespace-nowrap">
                          {t('website:editor.sampleBadge')}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="min-h-6 px-2 text-xs"
                          onClick={() => confirmItemReal(index)}
                        >
                          <BadgeCheck className="size-3.5" aria-hidden />
                          {t('website:editor.markTestimonialReal')}
                        </Button>
                      </>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    aria-label={t('website:editor.removeItem')}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
                {itemFields.map((field) => (
                  <ScalarField
                    key={field.key}
                    descriptor={field}
                    path={`${schema.repeatable!.key}.${index}.${field.key}`}
                    errorFor={errorFor}
                    value={item[field.key]}
                    onChange={(value) => updateItem(index, field.key, value)}
                    academyId={academyId}
                    sectionType={type}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : null}

        {type === 'featuredCourses' && draft.mode === 'selected' ? (
          <FeaturedCoursesPicker
            academyId={academyId}
            selectedIds={(draft.courseIds as string[] | undefined) ?? []}
            onChange={(ids) => setField('courseIds', ids)}
          />
        ) : null}
        {type === 'faq' ? (
          <FaqLibraryField
            academyId={academyId}
            selectedIds={(draft.libraryEntryIds as string[] | undefined) ?? []}
            onChange={(ids) => setField('libraryEntryIds', ids)}
          />
        ) : null}
        {type === 'testimonials' ? (
          <TestimonialLibraryField
            academyId={academyId}
            selectedIds={(draft.libraryEntryIds as string[] | undefined) ?? []}
            onChange={(ids) => setField('libraryEntryIds', ids)}
          />
        ) : null}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {t('website:editor.applyChanges')}
          </Button>
        </div>
      </div>

      {/*
        Phase 6 — live inline preview, updating on every field change.
        `pointer-events-none` + the section's own `enabled: true` keeps it
        a pure visual preview (CTA buttons/links stay inert, matching the
        whole-page preview's own established convention — see
        `WebsitePageEditorPage`'s doc comment on `linkRenderer`).
      */}
      <div className="space-y-2 lg:sticky lg:top-0 lg:self-start">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('website:editor.livePreview')}
          </p>
          <div className="flex overflow-hidden rounded-md border border-border text-xs">
            {PUBLIC_WEBSITE_LOCALES.map((candidate) => (
              <button
                key={candidate}
                type="button"
                onClick={() => setPreviewLocale(candidate)}
                className={
                  candidate === previewLocale
                    ? 'bg-primary px-2.5 py-1 font-medium text-primary-foreground'
                    : 'px-2.5 py-1 text-muted-foreground hover:text-foreground'
                }
              >
                {PUBLIC_WEBSITE_LOCALE_LABELS[candidate]}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-border">
          <div className="pointer-events-none">
            <WebsiteThemeScope theme={previewTheme} brand={configuration.brand}>
              <PublicWebsiteLocaleProvider locale={previewLocale}>
                <SectionRenderer
                  instance={previewInstance}
                  academyId={academyId}
                  pages={pages}
                />
              </PublicWebsiteLocaleProvider>
            </WebsiteThemeScope>
          </div>
        </div>
      </div>
    </div>
  );
}
