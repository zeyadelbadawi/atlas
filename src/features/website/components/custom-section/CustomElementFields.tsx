/**
 * The fields of one open element in the custom section editor (CMS phase
 * 3c), per kind. Each reuses the editor piece its ready-made section uses:
 * the bilingual text field, the section buttons list (`SectionButtonsEditor`,
 * 1–3 buttons with every destination), the image field with the media
 * library, the YouTube link field, the curated icons.
 *
 * Every field sits in a `data-field-path` box: the editor shows a field's
 * problem once the author has left it (or after a refused Apply), never
 * while a new element is still being filled in.
 */
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  CustomChecklistElement,
  CustomElement,
  CustomImageRatio,
  LocalizedText,
  SectionButtonSlot,
  WebsiteCta,
  WebsitePage,
} from '@types';
import {
  CUSTOM_IMAGE_RATIOS,
  FEATURE_ICON_OPTIONS,
  MAX_CUSTOM_CHECKLIST_ITEM_LENGTH,
  MAX_CUSTOM_CHECKLIST_ITEMS,
  MAX_CUSTOM_HEADING_LENGTH,
  MAX_CUSTOM_ICON_TEXT_LENGTH,
  MAX_CUSTOM_ICON_TEXT_TITLE_LENGTH,
  MAX_CUSTOM_TEXT_LENGTH,
  MAX_CUSTOM_VIDEO_TITLE_LENGTH,
  MAX_SHORT_TEXT,
  MIN_CUSTOM_CHECKLIST_ITEMS,
} from '@/features/website/constants/website.constants';
import { EMPTY_LOCALIZED_TEXT } from '@/features/website/utils/localized-text.utils';
import { resolveFeatureIcon } from '@/features/website/utils/feature-icons';
import { LocalizedTextField } from '../LocalizedTextField';
import { WebsiteImageField } from '../WebsiteImageField';
import { YouTubeVideoField } from '../YouTubeVideoField';
import {
  SectionButtonsEditor,
  localizedErrors,
  type FieldErrorLookup,
} from '../SectionButtonsEditor';
import { CustomChoiceGroup } from './CustomChoiceGroup';

const RATIO_PICTURES: Record<CustomImageRatio, string> = {
  landscape: 'h-4 w-5',
  wide: 'h-3.5 w-6',
  square: 'h-4 w-4',
  portrait: 'h-5 w-4',
};

export function CustomElementFields({
  element,
  base,
  fieldId,
  onChange,
  errorFor,
  pages,
  academyId,
}: {
  readonly element: CustomElement;
  /** The element's path in the config, e.g. `columns.0.elements.2`. */
  readonly base: string;
  /** A DOM id prefix unique to this element. */
  readonly fieldId: string;
  readonly onChange: (next: CustomElement) => void;
  /** Already gated: a message only once the field may show it. */
  readonly errorFor: FieldErrorLookup;
  readonly pages: readonly WebsitePage[];
  readonly academyId: string;
}): JSX.Element {
  const { t } = useTranslation();
  const patch = (next: Partial<CustomElement>) =>
    onChange({ ...element, ...next } as CustomElement);
  const text = (
    key: string,
    labelKey: string,
    value: Partial<LocalizedText> | undefined,
    max: number,
    options: {
      readonly required?: boolean;
      readonly multiline?: boolean;
      readonly hintKey?: string;
    } = {}
  ) => (
    <div className="space-y-1" data-field-path={`${base}.${key}`}>
      <LocalizedTextField
        id={`${fieldId}-${key}`}
        labelKey={labelKey}
        value={value}
        onChange={(next) => patch({ [key]: next } as Partial<CustomElement>)}
        required={options.required}
        multiline={options.multiline}
        maxLength={max}
        errors={localizedErrors(errorFor, `${base}.${key}`, labelKey, max)}
      />
      {options.hintKey ? (
        <p className="text-xs text-muted-foreground">{t(options.hintKey)}</p>
      ) : null}
    </div>
  );

  switch (element.kind) {
    case 'heading':
      return (
        <>
          {text(
            'text',
            'website:sectionEditors.custom.fields.headingText',
            element.text,
            MAX_CUSTOM_HEADING_LENGTH,
            { required: true }
          )}
          <CustomChoiceGroup
            legendKey="website:sectionEditors.custom.fields.level"
            hintKey="website:sectionEditors.custom.fields.levelHint"
            value={element.level}
            columns={2}
            choices={[
              {
                value: 'h2',
                labelKey: 'website:sectionEditors.custom.levels.h2',
              },
              {
                value: 'h3',
                labelKey: 'website:sectionEditors.custom.levels.h3',
              },
            ]}
            onChange={(level) => patch({ level })}
          />
        </>
      );
    case 'text':
      return text(
        'text',
        'website:sectionEditors.custom.fields.text',
        element.text,
        MAX_CUSTOM_TEXT_LENGTH,
        {
          required: true,
          multiline: true,
          hintKey: 'website:sectionEditors.custom.fields.textHint',
        }
      );
    case 'button':
      return (
        <div data-field-path={base}>
          <SectionButtonsEditor
            labelKey="website:sectionEditors.custom.fields.buttons"
            minButtons={1}
            value={element}
            onChange={(
              slots: Record<SectionButtonSlot, WebsiteCta | undefined>
            ) =>
              onChange({
                ...element,
                ...slots,
                // The row always keeps its first button (`minButtons`).
                cta: slots.cta ?? element.cta,
              })
            }
            errorFor={(path, labelKey, max) =>
              errorFor(`${base}.${path}`, labelKey, max)
            }
            pages={pages}
            academyId={academyId}
          />
        </div>
      );
    case 'image':
      return (
        <>
          <div data-field-path={`${base}.image`} className="space-y-1">
            <WebsiteImageField
              id={`${fieldId}-image`}
              labelKey="website:sectionEditors.custom.fields.image"
              value={element.image}
              onChange={(image) => patch({ image: image ?? '' })}
              academyId={academyId}
              purpose="sectionImage"
            />
            {errorFor(
              `${base}.image`,
              'website:sectionEditors.custom.fields.image'
            ) ? (
              <p className="text-xs text-destructive" role="alert">
                {errorFor(
                  `${base}.image`,
                  'website:sectionEditors.custom.fields.image'
                )}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('website:sectionEditors.custom.fields.imageHint')}
              </p>
            )}
          </div>
          {text(
            'imageAlt',
            'website:sectionEditors.custom.fields.imageAlt',
            element.imageAlt,
            MAX_SHORT_TEXT,
            { hintKey: 'website:sectionEditors.custom.fields.imageAltHint' }
          )}
          <CustomChoiceGroup
            legendKey="website:sectionEditors.custom.fields.ratio"
            value={element.ratio ?? 'landscape'}
            columns={2}
            choices={CUSTOM_IMAGE_RATIOS.map((ratio) => ({
              value: ratio,
              labelKey: `website:sectionEditors.custom.imageRatios.${ratio}`,
              picture: (
                <span
                  className={`${RATIO_PICTURES[ratio]} rounded-[2px] border-2 border-current`}
                />
              ),
            }))}
            onChange={(ratio) => patch({ ratio })}
          />
        </>
      );
    case 'video':
      return (
        <>
          <div data-field-path={`${base}.videoId`}>
            <YouTubeVideoField
              id={`${fieldId}-video`}
              labelKey="website:fields.videoLink"
              value={element.videoId}
              onChange={(videoId) => patch({ videoId })}
              schemaError={errorFor(
                `${base}.videoId`,
                'website:fields.videoLink'
              )}
            />
          </div>
          {text(
            'title',
            'website:sectionEditors.custom.fields.videoTitle',
            element.title,
            MAX_CUSTOM_VIDEO_TITLE_LENGTH,
            { hintKey: 'website:sectionEditors.custom.fields.videoTitleHint' }
          )}
          <div data-field-path={`${base}.poster`}>
            <WebsiteImageField
              id={`${fieldId}-poster`}
              labelKey="website:fields.videoPoster"
              value={element.poster}
              onChange={(poster) => {
                if (poster) patch({ poster });
                else {
                  const rest = { ...element } as Record<string, unknown>;
                  delete rest.poster;
                  onChange(rest as unknown as CustomElement);
                }
              }}
              academyId={academyId}
              purpose="videoPoster"
            />
          </div>
        </>
      );
    case 'checklist':
      return (
        <ChecklistFields
          element={element}
          base={base}
          fieldId={fieldId}
          onChange={onChange}
          errorFor={errorFor}
        />
      );
    case 'iconText':
      return (
        <>
          <div className="space-y-1.5" data-field-path={`${base}.icon`}>
            <Label htmlFor={`${fieldId}-icon`}>
              {t('website:sectionEditors.custom.fields.icon')}
            </Label>
            <Select
              value={element.icon}
              onValueChange={(icon) => patch({ icon })}
            >
              <SelectTrigger id={`${fieldId}-icon`} className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEATURE_ICON_OPTIONS.map((icon) => {
                  const Icon = resolveFeatureIcon(icon);
                  return (
                    <SelectItem key={icon} value={icon}>
                      <span className="flex items-center gap-2">
                        <Icon className="size-4" aria-hidden />
                        {t(`website:icons.${icon}`)}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          {text(
            'title',
            'website:sectionEditors.custom.fields.iconTitle',
            element.title,
            MAX_CUSTOM_ICON_TEXT_TITLE_LENGTH,
            { required: true }
          )}
          {text(
            'text',
            'website:sectionEditors.custom.fields.iconText',
            element.text,
            MAX_CUSTOM_ICON_TEXT_LENGTH,
            { multiline: true }
          )}
        </>
      );
    case 'spacer':
      return (
        <CustomChoiceGroup
          legendKey="website:sectionEditors.custom.fields.size"
          hintKey="website:sectionEditors.custom.fields.spacerHint"
          value={element.size}
          choices={(['small', 'medium', 'large'] as const).map((size) => ({
            value: size,
            labelKey: `website:sectionEditors.custom.sizes.${size}`,
          }))}
          onChange={(size) => patch({ size })}
        />
      );
    case 'divider':
    default:
      return (
        <p className="text-sm text-muted-foreground">
          {t('website:sectionEditors.custom.fields.dividerHint')}
        </p>
      );
  }
}

/** A checklist's ✓ items: 1–10, each in both languages. */
function ChecklistFields({
  element,
  base,
  fieldId,
  onChange,
  errorFor,
}: {
  readonly element: CustomChecklistElement;
  readonly base: string;
  readonly fieldId: string;
  readonly onChange: (next: CustomElement) => void;
  readonly errorFor: FieldErrorLookup;
}): JSX.Element {
  const { t } = useTranslation();
  const items = element.items;
  const setItems = (next: CustomChecklistElement['items']) =>
    onChange({ ...element, items: next });
  const full = items.length >= MAX_CUSTOM_CHECKLIST_ITEMS;
  const labelKey = 'website:sectionEditors.custom.fields.item';

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-foreground">
        {t('website:sectionEditors.custom.fields.items')}
        <span className="ms-2 text-xs font-normal tabular-nums text-muted-foreground">
          {t('website:sectionEditors.custom.count', {
            count: items.length,
            max: MAX_CUSTOM_CHECKLIST_ITEMS,
          })}
        </span>
      </legend>
      <ol className="space-y-3">
        {items.map((item, index) => {
          const number = index + 1;
          const path = `${base}.items.${index}.text`;
          return (
            <li
              key={item.id}
              className="flex items-start gap-1 border-b border-border pb-3 last:border-b-0 last:pb-0"
            >
              <div className="min-w-0 flex-1" data-field-path={path}>
                <LocalizedTextField
                  id={`${fieldId}-item-${index}`}
                  labelKey="website:sectionEditors.custom.fields.itemNumber"
                  labelValues={{ number }}
                  value={item.text}
                  onChange={(next) =>
                    setItems(
                      items.map((candidate, position) =>
                        position === index
                          ? { ...candidate, text: next }
                          : candidate
                      )
                    )
                  }
                  required
                  maxLength={MAX_CUSTOM_CHECKLIST_ITEM_LENGTH}
                  errors={localizedErrors(
                    errorFor,
                    path,
                    labelKey,
                    MAX_CUSTOM_CHECKLIST_ITEM_LENGTH
                  )}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={items.length <= MIN_CUSTOM_CHECKLIST_ITEMS}
                onClick={() =>
                  setItems(items.filter((_, position) => position !== index))
                }
                aria-label={t('website:sectionEditors.custom.removeItem', {
                  number,
                })}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </li>
          );
        })}
      </ol>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11 w-full border-dashed"
        disabled={full}
        onClick={() =>
          setItems([
            ...items,
            { id: crypto.randomUUID(), text: EMPTY_LOCALIZED_TEXT },
          ])
        }
      >
        <Plus className="size-4" aria-hidden />
        {full
          ? t('website:sectionEditors.custom.itemsFull', {
              max: MAX_CUSTOM_CHECKLIST_ITEMS,
            })
          : t('website:sectionEditors.custom.addItem')}
      </Button>
    </fieldset>
  );
}
