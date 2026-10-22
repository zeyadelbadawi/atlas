/**
 * The visual editor's "Design" tab for the selected section (CMS phase 3):
 * its background, spacing (with a phone override), alignment, width and,
 * for two-column sections, the order on phones.
 *
 * Every control is a short list of named choices drawn by the theme (see
 * `sections/section-design.tsx`) — no colour pickers, no numbers. The
 * first choice of each is the theme's own ("Automatic"), and is what an
 * untouched section has. A theme offers only what it can draw well: a
 * background it has no ground for, or one this section does not read
 * correctly on, is not offered.
 *
 * The phone spacing follows the desktop one until it is changed; then the
 * control says so and offers to follow the desktop again (as Framer does
 * for breakpoint overrides).
 */
import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownUp,
  RotateCcw,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@utils';
import type {
  SectionBackground,
  SectionDesign,
  SectionSpacing,
  SectionType,
  WebsiteThemeKey,
} from '@types';
import { designControlsFor } from '../sections/section-design';

const AUTO = 'auto';
const SPACINGS: readonly SectionSpacing[] = ['compact', 'default', 'spacious'];

/** A design with no empty keys, or `undefined` when nothing is chosen. */
export function tidyDesign(design: SectionDesign): SectionDesign | undefined {
  const entries = Object.entries(design).filter(
    ([, value]) => value !== undefined && value !== false
  );
  return entries.length > 0
    ? (Object.fromEntries(entries) as SectionDesign)
    : undefined;
}

function Choice({
  icon,
  label,
  hint,
  value,
  options,
  onChange,
  testId,
}: {
  readonly icon?: ReactNode;
  readonly label: string;
  readonly hint?: ReactNode;
  readonly value: string;
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
    readonly icon?: ReactNode;
  }[];
  readonly onChange: (value: string) => void;
  readonly testId: string;
}): JSX.Element {
  const id = useId();
  return (
    <div className="space-y-2" data-testid={testId}>
      <p
        id={id}
        className="flex items-center gap-1.5 text-sm font-medium text-foreground"
      >
        {icon}
        {label}
      </p>
      <ToggleGroup
        type="single"
        aria-labelledby={id}
        value={value}
        // Clicking the chosen item would clear a single toggle group; a
        // choice always has a value, so that click changes nothing.
        onValueChange={(next) => next && onChange(next)}
        className={cn(
          'grid gap-2',
          options.length > 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-3'
        )}
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            data-value={option.value}
            className="flex h-auto min-h-11 items-center justify-center gap-1.5 border border-border px-2 py-2 text-xs data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground"
          >
            {option.icon}
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {hint ? (
        <div className="text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}

/** A small drawing of each ground, beside its name. */
function GroundSwatch({
  ground,
}: {
  readonly ground: SectionBackground | typeof AUTO;
}): JSX.Element {
  // Neutral stand-ins: the theme decides the real colours. Each keeps a
  // 3:1 edge against the panel so a light swatch still reads as a shape.
  const fill: Record<SectionBackground | typeof AUTO, string> = {
    auto: 'bg-[linear-gradient(135deg,#fff_50%,#cbd5e1_50%)]',
    light: 'bg-white',
    soft: 'bg-slate-200',
    brand: 'bg-primary',
    dark: 'bg-slate-900',
  };
  return (
    <span
      aria-hidden
      className={cn(
        'size-4 shrink-0 rounded-full border border-slate-500',
        fill[ground]
      )}
    />
  );
}

export function SectionDesignPanel({
  themeKey,
  type,
  design,
  onChange,
  disabled,
}: {
  readonly themeKey: WebsiteThemeKey;
  readonly type: SectionType;
  readonly design: SectionDesign | undefined;
  readonly onChange: (design: SectionDesign | undefined) => void;
  readonly disabled?: boolean;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const controls = designControlsFor(themeKey, type);
  const current = design ?? {};
  const set = (patch: Partial<SectionDesign>) =>
    onChange(tidyDesign({ ...current, ...patch }));
  const rtl = i18n.dir(i18n.language) === 'rtl';
  const StartIcon = rtl ? AlignRight : AlignLeft;

  const nothingToChoose =
    controls.backgrounds.length === 0 &&
    !controls.spacing &&
    !controls.align &&
    !controls.width &&
    !controls.reverseOnMobile;

  const spacingOptions = SPACINGS.map((value) => ({
    value,
    label: t(`website:visualEditor.design.spacings.${value}`),
  }));
  const mobileDiffers = current.spacingMobile !== undefined;

  return (
    <fieldset
      className="min-w-0 space-y-6"
      disabled={disabled}
      data-testid="section-design"
    >
      <legend className="sr-only">
        {t('website:visualEditor.design.title')}
      </legend>
      <p className="text-xs text-muted-foreground">
        {t('website:visualEditor.design.hint')}
      </p>

      {nothingToChoose ? (
        <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
          {t('website:visualEditor.design.none')}
        </p>
      ) : null}

      {controls.backgrounds.length > 0 ? (
        <Choice
          testId="design-background"
          label={t('website:visualEditor.design.background')}
          value={
            current.background &&
            controls.backgrounds.includes(current.background)
              ? current.background
              : AUTO
          }
          options={[AUTO, ...controls.backgrounds].map((value) => ({
            value,
            label: t(`website:visualEditor.design.backgrounds.${value}`),
            icon: <GroundSwatch ground={value as SectionBackground} />,
          }))}
          onChange={(value) =>
            set({
              background:
                value === AUTO ? undefined : (value as SectionBackground),
            })
          }
          hint={t('website:visualEditor.design.backgroundHint')}
        />
      ) : null}

      {controls.spacing ? (
        <div className="space-y-4">
          <Choice
            testId="design-spacing"
            label={t('website:visualEditor.design.spacing')}
            value={current.spacing ?? 'default'}
            options={spacingOptions}
            onChange={(value) =>
              set({
                spacing:
                  value === 'default' ? undefined : (value as SectionSpacing),
              })
            }
          />
          <div className="space-y-2 rounded-md border border-border p-3">
            <Choice
              testId="design-spacing-mobile"
              icon={<Smartphone className="size-4" aria-hidden />}
              label={t('website:visualEditor.design.spacingMobile')}
              value={current.spacingMobile ?? current.spacing ?? 'default'}
              options={spacingOptions}
              onChange={(value) =>
                set({ spacingMobile: value as SectionSpacing })
              }
              hint={
                mobileDiffers ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-medium text-primary">
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full bg-primary"
                      />
                      {t('website:visualEditor.design.mobileDiffers')}
                    </span>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto min-h-11 p-0 text-xs"
                      onClick={() => set({ spacingMobile: undefined })}
                    >
                      <RotateCcw className="size-3.5" aria-hidden />
                      {t('website:visualEditor.design.followDesktop')}
                    </Button>
                  </span>
                ) : (
                  t('website:visualEditor.design.mobileFollows')
                )
              }
            />
          </div>
        </div>
      ) : null}

      {controls.align ? (
        <Choice
          testId="design-align"
          label={t('website:visualEditor.design.align')}
          value={current.align ?? 'start'}
          options={[
            {
              value: 'start',
              label: t('website:visualEditor.design.aligns.start'),
              icon: <StartIcon className="size-4" aria-hidden />,
            },
            {
              value: 'center',
              label: t('website:visualEditor.design.aligns.center'),
              icon: <AlignCenter className="size-4" aria-hidden />,
            },
          ]}
          onChange={(value) =>
            set({ align: value === 'center' ? 'center' : undefined })
          }
        />
      ) : null}

      {controls.width ? (
        <Choice
          testId="design-width"
          label={t('website:visualEditor.design.width')}
          value={current.width ?? 'default'}
          options={[
            {
              value: 'default',
              label: t('website:visualEditor.design.widths.default'),
            },
            {
              value: 'wide',
              label: t('website:visualEditor.design.widths.wide'),
            },
          ]}
          onChange={(value) =>
            set({ width: value === 'wide' ? 'wide' : undefined })
          }
        />
      ) : null}

      {controls.reverseOnMobile ? (
        <label className="flex min-h-11 items-start justify-between gap-3 rounded-md border border-border p-3">
          <span className="space-y-1">
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <ArrowDownUp className="size-4" aria-hidden />
              {t('website:visualEditor.design.reverseOnMobile')}
            </span>
            <span className="block text-xs text-muted-foreground">
              {t('website:visualEditor.design.reverseOnMobileHint')}
            </span>
          </span>
          <Switch
            checked={!!current.reverseOnMobile}
            onCheckedChange={(checked) =>
              set({ reverseOnMobile: checked || undefined })
            }
            data-testid="design-reverse"
          />
        </label>
      ) : null}

      {design ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          onClick={() => onChange(undefined)}
          data-testid="design-reset"
        >
          <RotateCcw className="size-4" aria-hidden />
          {t('website:visualEditor.design.reset')}
        </Button>
      ) : null}
    </fieldset>
  );
}
