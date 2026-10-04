/**
 * The setup form's theme picker (Theme 2 plan §5, WS-O).
 *
 * A single-choice radio group — a theme can be changed, never cleared —
 * where every option shows the theme as the site it builds: a scaled,
 * non-interactive render of a sample Home through the REAL website renderer
 * (`SetupThemePreview`), in the colours chosen under "Logo & colours" (or
 * the theme's own defaults until the Owner picks some).
 *
 * Keyboard follows the WAI-ARIA radio-group pattern: one tab stop (the
 * selected option), arrow keys move AND select (horizontal arrows follow
 * the reading direction), Home/End jump to the ends. The previews are a
 * picture, not content: `aria-hidden` and `inert`, and only rendered once
 * the group is near the viewport, after the form's first paint.
 */
import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { cn } from '@utils';
import {
  isPublicWebsiteLocale,
  SetupThemePreview,
  type SetupBrandingChoice,
} from '@features/website';
import type { WebsiteThemeDefinition, WebsiteThemeKey } from '@types';

/** Preview geometry: the page canvas is 1280 px wide (BrandPreviewFrame). */
const PREVIEW_CANVAS_WIDTH = 1280;
const PREVIEW_SCALE = 0.32;
const PREVIEW_HEIGHT = 360;

export interface SetupThemePickerProps {
  readonly themes: readonly WebsiteThemeDefinition[];
  /** The selected theme key (`selectedThemeKey`). */
  readonly value: string | undefined;
  readonly onChange: (key: WebsiteThemeKey) => void;
  /** The radio group's accessible name. */
  readonly label: string;
  readonly academyName: string;
  /** The latest "Logo & colours" choice, or `null` while untouched. */
  readonly branding: SetupBrandingChoice | null;
}

/** `true` once the element is within 200 px of the viewport (or IO is unavailable); never reverts. */
function useNearViewport<TElement extends Element>(): [
  React.RefObject<TElement>,
  boolean,
] {
  const ref = useRef<TElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, near];
}

/** An object URL for the picked logo file, revoked when it changes. */
function useObjectUrl(file: File | undefined): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!file) {
      setUrl(undefined);
      return undefined;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

export function SetupThemePicker({
  themes,
  value,
  onChange,
  label,
  academyName,
  branding,
}: SetupThemePickerProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const [groupRef, nearViewport] = useNearViewport<HTMLDivElement>();
  const radios = useRef<Array<HTMLButtonElement | null>>([]);
  // Dragging a colour control re-renders both previews; keep the controls
  // themselves responsive by letting the previews lag behind.
  const palette = useDeferredValue(branding?.palette);
  const logoUrl = useObjectUrl(branding?.logoFile);
  const language = i18n.resolvedLanguage ?? i18n.language;
  const locale = isPublicWebsiteLocale(language) ? language : undefined;
  const previewName = academyName.trim() || t('website:brandStudio.sampleName');
  const selectedIndex = themes.findIndex((theme) => theme.key === value);

  const choose = (index: number) => {
    const theme = themes[index];
    if (!theme) return;
    if (theme.key !== value) onChange(theme.key);
    radios.current[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const isRtl = i18n.dir(language) === 'rtl';
    const from = Math.max(selectedIndex, 0);
    const steps: Record<string, number> = {
      ArrowDown: from + 1,
      ArrowUp: from - 1,
      ArrowRight: isRtl ? from - 1 : from + 1,
      ArrowLeft: isRtl ? from + 1 : from - 1,
      Home: 0,
      End: themes.length - 1,
    };
    const target = steps[event.key];
    if (target === undefined) return;
    event.preventDefault();
    choose((target + themes.length) % themes.length);
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="grid gap-4 sm:grid-cols-2"
    >
      {themes.map((theme, index) => {
        const isSelected = index === selectedIndex;
        const isTabStop = isSelected || (selectedIndex < 0 && index === 0);
        return (
          // The whole card selects (the preview is a large, obvious target);
          // the radio inside is the one keyboard and assistive-tech control,
          // and its own click reaches this handler too.
          <div
            key={theme.key}
            data-theme-option={theme.key}
            onClick={() => choose(index)}
            className={cn(
              'flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-card transition-colors motion-reduce:transition-none',
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background',
              isSelected
                ? 'border-primary ring-1 ring-primary'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div
              data-testid="setup-theme-preview"
              className="border-b border-border"
              aria-hidden
              {...{ inert: '' }}
            >
              {nearViewport ? (
                <SetupThemePreview
                  themeKey={theme.key}
                  academyName={previewName}
                  palette={palette}
                  academyLogo={logoUrl}
                  locale={locale}
                  scale={PREVIEW_SCALE}
                  height={PREVIEW_HEIGHT}
                />
              ) : (
                <div
                  className="w-full bg-muted"
                  style={{
                    aspectRatio: `${PREVIEW_CANVAS_WIDTH * PREVIEW_SCALE} / ${PREVIEW_HEIGHT}`,
                    maxHeight: PREVIEW_HEIGHT,
                  }}
                />
              )}
            </div>
            <button
              ref={(element) => {
                radios.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isTabStop ? 0 : -1}
              className="flex min-h-11 items-start justify-between gap-3 p-4 text-start focus-visible:outline-none"
            >
              <span>
                <span className="block text-sm font-medium text-foreground">
                  {t(theme.nameKey)}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t(theme.descriptionKey)}
                </span>
              </span>
              {isSelected ? (
                <Check
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  strokeWidth={2}
                  aria-hidden
                />
              ) : null}
            </button>
          </div>
        );
      })}
    </div>
  );
}
