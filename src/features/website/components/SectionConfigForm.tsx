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
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
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
import { LocalizedTextField } from './LocalizedTextField';
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
import { MAX_SECTION_ITEMS } from '../constants/website.constants';
import { isSafeExternalUrl } from '../utils/url-safety.utils';
import { useCourses } from '@features/course';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { EMPTY_LOCALIZED_TEXT } from '../utils/localized-text.utils';
import { WebsiteThemeScope } from '../renderer/WebsiteThemeScope';
import { SectionRenderer } from '../sections/SectionRenderer';
import type { SectionFieldDescriptor } from '../sections/section-field.types';
import { DEFAULT_RESPONSIVE_VISIBILITY } from '@types';
import type {
  LanguageCode,
  LocalizedText,
  SectionConfigMap,
  SectionInstance,
  SectionType,
  WebsiteConfiguration,
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
}

interface LibraryOption {
  readonly id: string;
  readonly label: string;
}

function LibraryEntryPicker({
  titleKey,
  helpKey,
  options,
  selectedIds,
  onChange,
}: {
  readonly titleKey: string;
  readonly helpKey: string;
  readonly options: readonly LibraryOption[];
  readonly selectedIds: readonly string[];
  readonly onChange: (ids: string[]) => void;
}): JSX.Element | null {
  const { t } = useTranslation();
  if (options.length === 0) return null;

  const toggle = (id: string, checked: boolean) => {
    onChange(
      checked
        ? [...selectedIds, id]
        : selectedIds.filter((existing) => existing !== id)
    );
  };

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <p className="text-sm font-medium text-foreground">{t(titleKey)}</p>
      <p className="text-xs text-muted-foreground">{t(helpKey)}</p>
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={selectedIds.includes(option.id)}
              onCheckedChange={(checked) => toggle(option.id, checked === true)}
            />
            <span className="line-clamp-1">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** Fetches and adapts the Academy's published FAQ library — kept separate from `TestimonialLibraryField` so each calls its own hook unconditionally, never behind a runtime branch. */
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
    query: { filters: { status: 'published' } },
  });
  const options: LibraryOption[] = (data?.items ?? []).map((entry) => ({
    id: entry.id,
    label: entry.question[language] || entry.question.en,
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
    query: { filters: { status: 'published' } },
  });
  const options: LibraryOption[] = (data?.items ?? []).map((entry) => ({
    id: entry.id,
    label: `${entry.quote[language] || entry.quote.en} — ${entry.authorName}`,
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
  pages,
  academyId,
}: {
  readonly value: Partial<WebsiteCta> | undefined;
  readonly onChange: (next: Partial<WebsiteCta> | undefined) => void;
  readonly labelKey: string;
  readonly pages: readonly WebsitePage[];
  readonly academyId: string;
}): JSX.Element {
  const { t } = useTranslation();
  const linkType = inferLinkType(value);
  const urlValue = value?.url ?? '';
  const urlError = urlValue && !isSafeExternalUrl(urlValue);

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
      <LocalizedTextField
        id={`cta-label-${labelKey}`}
        labelKey="website:fields.ctaLabelPlaceholder"
        value={value?.label as Partial<LocalizedText> | undefined}
        onChange={(label) => onChange({ ...value, label })}
        required
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
  value,
  onChange,
  academyId,
  sectionType,
}: {
  readonly descriptor: SectionFieldDescriptor;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
  readonly academyId: string;
  /** Which section this field belongs to — decides the image recommendation. */
  readonly sectionType: SectionType;
}): JSX.Element {
  const { t } = useTranslation();
  const id = `section-field-${descriptor.key}`;

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
      />
    );
  }

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
          />
        </div>
      );
    case 'boolean':
      return (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!value}
            onCheckedChange={(checked) => onChange(checked === true)}
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
            min={1}
            max={MAX_SECTION_ITEMS}
            value={(value as number) ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      );
    case 'select':
      return (
        <div className="space-y-1.5">
          <Label>{t(descriptor.labelKey)}</Label>
          <Select value={(value as string) ?? ''} onValueChange={onChange}>
            <SelectTrigger>
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
}: SectionConfigFormProps<TType>): JSX.Element {
  const { t } = useTranslation();
  const schema = SECTION_FIELD_SCHEMAS[type];
  const [draft, setDraft] = useState<DraftValue>(
    initialConfig as unknown as DraftValue
  );
  const [error, setError] = useState<string>();
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
    for (const field of schema.repeatable.itemFields) {
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
      setError('website:editor.invalidConfig');
      return;
    }
    setError(undefined);
    onSave(result.data as SectionConfigMap[TType]);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-5">
        {schema.fields.map((field) =>
          field.kind === 'cta' ? (
            <CtaFieldEditor
              key={field.key}
              labelKey={field.labelKey}
              pages={pages}
              academyId={academyId}
              value={draft[field.key] as Partial<WebsiteCta> | undefined}
              onChange={(value) => setField(field.key, value)}
            />
          ) : (
            <ScalarField
              key={field.key}
              descriptor={field}
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
                disabled={items.length >= MAX_SECTION_ITEMS}
              >
                <Plus className="size-3.5" aria-hidden />
                {t('website:editor.addItem')}
              </Button>
            </div>
            {items.map((item, index) => (
              <div
                key={(item.id as string) ?? index}
                className="space-y-3 rounded-md border border-border p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t(schema.repeatable!.itemLabelKey)} {index + 1}
                  </p>
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
                {schema.repeatable!.itemFields.map((field) => (
                  <ScalarField
                    key={field.key}
                    descriptor={field}
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

        {error ? <p className="text-sm text-destructive">{t(error)}</p> : null}

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
