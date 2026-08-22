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
import { SECTION_FIELD_SCHEMAS } from '../sections/section-fields.registry';
import { getSectionConfigSchema } from '../schemas/website-section.schemas';
import { MAX_SECTION_ITEMS } from '../constants/website.constants';
import type { SectionFieldDescriptor } from '../sections/section-field.types';
import type { SectionConfigMap, SectionType, WebsitePage } from '@types';

type DraftValue = Record<string, unknown>;

export interface SectionConfigFormProps<TType extends SectionType> {
  readonly type: TType;
  readonly initialConfig: SectionConfigMap[TType];
  readonly pages: readonly WebsitePage[];
  readonly onSave: (config: SectionConfigMap[TType]) => void;
  readonly onCancel: () => void;
  readonly isSaving: boolean;
}

function CtaFieldEditor({
  value,
  onChange,
  labelKey,
  pages,
}: {
  readonly value: { label?: string; pageId?: string } | undefined;
  readonly onChange: (next: { label: string; pageId?: string } | undefined) => void;
  readonly labelKey: string;
  readonly pages: readonly WebsitePage[];
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <p className="text-sm font-medium text-foreground">{t(labelKey)}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          placeholder={t('website:fields.ctaLabelPlaceholder')}
          value={value?.label ?? ''}
          onChange={(event) => onChange({ label: event.target.value, pageId: value?.pageId })}
        />
        <Select
          value={value?.pageId}
          onValueChange={(pageId) => onChange({ label: value?.label ?? '', pageId })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('website:fields.ctaTargetPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {pages.map((page) => (
              <SelectItem key={page.id} value={page.id}>
                {page.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ScalarField({
  descriptor,
  value,
  onChange,
}: {
  readonly descriptor: SectionFieldDescriptor;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const id = `section-field-${descriptor.key}`;

  switch (descriptor.kind) {
    case 'longText':
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{t(descriptor.labelKey)}</Label>
          <Textarea id={id} rows={3} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case 'boolean':
      return (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={!!value} onCheckedChange={(checked) => onChange(checked === true)} />
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
        />
      );
    case 'text':
    default:
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{t(descriptor.labelKey)}</Label>
          <Input id={id} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
  }
}

export function SectionConfigForm<TType extends SectionType>({
  type,
  initialConfig,
  pages,
  onSave,
  onCancel,
  isSaving,
}: SectionConfigFormProps<TType>): JSX.Element {
  const { t } = useTranslation();
  const schema = SECTION_FIELD_SCHEMAS[type];
  const [draft, setDraft] = useState<DraftValue>(initialConfig as unknown as DraftValue);
  const [error, setError] = useState<string>();

  const setField = (key: string, value: unknown) => setDraft((prev) => ({ ...prev, [key]: value }));

  const items = (schema.repeatable ? (draft[schema.repeatable.key] as DraftValue[] | undefined) : undefined) ?? [];

  const addItem = () => {
    if (!schema.repeatable) return;
    const blank: DraftValue = { id: crypto.randomUUID() };
    for (const field of schema.repeatable.itemFields) {
      blank[field.key] = field.kind === 'boolean' ? false : '';
    }
    setField(schema.repeatable.key, [...items, blank]);
  };

  const updateItem = (index: number, key: string, value: unknown) => {
    if (!schema.repeatable) return;
    const next = items.map((item, i) => (i === index ? { ...item, [key]: value } : item));
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
    <div className="space-y-5">
      {schema.fields.map((field) =>
        field.kind === 'cta' ? (
          <CtaFieldEditor
            key={field.key}
            labelKey={field.labelKey}
            pages={pages}
            value={draft[field.key] as { label?: string; pageId?: string } | undefined}
            onChange={(value) => setField(field.key, value)}
          />
        ) : (
          <ScalarField
            key={field.key}
            descriptor={field}
            value={draft[field.key]}
            onChange={(value) => setField(field.key, value)}
          />
        )
      )}

      {schema.repeatable ? (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">{t(schema.repeatable.labelKey)}</p>
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
            <div key={(item.id as string) ?? index} className="space-y-3 rounded-md border border-border p-3">
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
                />
              ))}
            </div>
          ))}
        </div>
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
  );
}
