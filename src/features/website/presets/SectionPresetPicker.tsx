/**
 * The second step of adding a section that has presets: its looks, each
 * with a real miniature drawn by the active theme, plus the section's
 * default content, then "Add". Shared by the visual editor's section
 * library and the page editor's "Add section".
 *
 * The looks are a native radio group (arrow keys move between them, the
 * focused card shows a ring); "Add" adds the chosen one exactly as
 * previewed. Each look is built once while the step is open, so the
 * section that arrives is the one the author saw.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@utils';
import type { SectionType } from '@types';
import { SECTION_METADATA } from '../sections/section-metadata.registry';
import {
  presetId,
  presetLabelKeys,
  presetsFor,
  sectionFromStart,
} from './section-presets.registry';
import type { SectionStart } from './section-presets.types';
import { PresetMiniPreview } from './PresetPreview';
import {
  presetContextOf,
  type PresetPreviewSource,
} from './preset-preview-source';

/** The radio value of the section's own default content. */
export const DEFAULT_LOOK = 'default';

export interface SectionPresetPickerProps {
  readonly type: SectionType;
  readonly source: PresetPreviewSource;
  /** Adds the section: a preset's start, or `undefined` for the default content. */
  readonly onAdd: (start: SectionStart | undefined) => void;
  /** Back to the list of sections (the library); absent in a dialog of its own. */
  readonly onBack?: () => void;
  /** Where the step's heading id goes, for the dialog's `aria-labelledby`. */
  readonly headingId: string;
}

export function SectionPresetPicker({
  type,
  source,
  onAdd,
  onBack,
  headingId,
}: SectionPresetPickerProps): JSX.Element {
  const { t } = useTranslation();
  const { icon: Icon, labelKey } = SECTION_METADATA[type];
  // Built once per opening (the picker is keyed by its type): a theme or
  // page change mid-pick keeps the looks the author is comparing.
  const [context] = useState(() => presetContextOf(source));
  const looks = useMemo(
    () =>
      presetsFor(type).map((preset) => {
        const start = preset.build(context);
        return {
          id: presetId(preset),
          labels: presetLabelKeys(preset),
          start,
          preview: [
            sectionFromStart(type, start, `preset-${presetId(preset)}`),
          ],
        };
      }),
    [type, context]
  );
  const [chosen, setChosen] = useState<string>(looks[0]?.id ?? DEFAULT_LOOK);

  // The step replaces the list in the same dialog: move focus to its
  // heading so keyboard and screen-reader users land in it.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const add = () => onAdd(looks.find((look) => look.id === chosen)?.start);
  const groupName = `section-look-${type}`;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      data-testid="section-preset-picker"
    >
      <div className="space-y-1 px-6 pt-6 text-start">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ms-2 mb-1 h-11 gap-1.5 px-2 text-muted-foreground"
            onClick={onBack}
          >
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
            {t('website:presetPicker.back')}
          </Button>
        ) : null}
        <h2
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight focus:outline-none"
        >
          <Icon className="size-5 text-primary" aria-hidden />
          {t('website:presetPicker.title', { section: t(labelKey) })}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('website:presetPicker.subtitle')}
        </p>
      </div>

      {/* The scroller is a div: a fieldset does not shrink in a flex column. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <fieldset>
          <legend className="sr-only">{t('website:presetPicker.looks')}</legend>
          <ul className="grid gap-4 sm:grid-cols-2">
            {looks.map((look) => (
              <li key={look.id}>
                <LookCard
                  name={groupName}
                  value={look.id}
                  checked={chosen === look.id}
                  onChoose={setChosen}
                  onConfirm={add}
                  title={t(look.labels.name)}
                  description={t(look.labels.description)}
                >
                  <PresetMiniPreview source={source} sections={look.preview} />
                </LookCard>
              </li>
            ))}
            <li>
              <LookCard
                name={groupName}
                value={DEFAULT_LOOK}
                checked={chosen === DEFAULT_LOOK}
                onChoose={setChosen}
                onConfirm={add}
                title={t('website:presetPicker.blankName')}
                description={t('website:presetPicker.blankDescription')}
              >
                <div
                  className="flex w-full items-center justify-center rounded-md bg-muted ring-1 ring-border"
                  style={{ aspectRatio: '1280 / 800' }}
                  aria-hidden
                >
                  <Icon className="size-10 text-muted-foreground" />
                </div>
              </LookCard>
            </li>
          </ul>
        </fieldset>
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t('website:presetPicker.placeholderHint')}
        </p>
        <Button
          type="button"
          className="h-11 shrink-0"
          onClick={add}
          data-testid="preset-add"
        >
          {t('website:presetPicker.add')}
          <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

/** One look: a radio card with its miniature, name and description. */
function LookCard({
  name,
  value,
  checked,
  onChoose,
  onConfirm,
  title,
  description,
  children,
}: {
  readonly name: string;
  readonly value: string;
  readonly checked: boolean;
  readonly onChoose: (value: string) => void;
  readonly onConfirm: () => void;
  readonly title: string;
  readonly description: string;
  readonly children: React.ReactNode;
}): JSX.Element {
  const id = `${name}-${value}`.replace(/[^A-Za-z0-9_-]/g, '-');
  return (
    <label
      htmlFor={id}
      className="block cursor-pointer"
      // A second click on the chosen look adds it, like a double-click.
      onDoubleClick={onConfirm}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChoose(value)}
        className="peer sr-only"
        data-preset={value}
        aria-labelledby={`${id}-name`}
        aria-describedby={`${id}-description`}
      />
      <span
        className={cn(
          'flex h-full flex-col gap-3 rounded-lg border-2 bg-card p-3 transition-colors motion-reduce:transition-none',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
          checked ? 'border-primary' : 'border-border hover:border-primary/50'
        )}
      >
        {children}
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0 space-y-0.5">
            <span
              id={`${id}-name`}
              className="block text-sm font-medium text-foreground"
            >
              {title}
            </span>
            <span
              id={`${id}-description`}
              className="block text-xs leading-relaxed text-muted-foreground"
            >
              {description}
            </span>
          </span>
          {/* The radio announces the choice; this mark is for the eye. */}
          {checked ? (
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
              aria-hidden
            >
              <Check className="size-4" />
            </span>
          ) : null}
        </span>
      </span>
    </label>
  );
}
