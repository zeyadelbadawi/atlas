/**
 * Brand Studio (Theme 1 plan §F.4.5): logo → proposed palette → live
 * preview → regenerate / adjust / accept / reset. Theme-agnostic: it edits
 * the palette; whichever theme renders the preview maps it its own way.
 *
 * State lives in `useBrandStudio`, owned by the caller (the setup form
 * keeps it until the Academy exists; the Brand tab saves it), so this
 * component is presentation and interaction only.
 *
 * Accessibility: every control has a visible label; swatches carry their
 * contrast result as text (not colour); the analysis state is announced
 * through a polite live region; the preview cross-fade is disabled under
 * reduced motion (`brand-studio.css`).
 */
import { useId, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  ImageUp,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@utils';
import {
  BRAND_SEED_NAMES,
  contrastRatio,
  reportedRatio,
  type BrandPalette,
  type BrandRoleName,
  type BrandSeedName,
  type HslTriplet,
} from '../brand-engine';
import { hexToTriplet, tripletToHex } from './color-input.utils';
import type { BrandStudioState } from './useBrandStudio';
import './brand-studio.css';

const ROLE_GROUPS: readonly {
  readonly key: 'brand' | 'surfaces' | 'text' | 'feedback';
  readonly roles: readonly BrandRoleName[];
}[] = [
  {
    key: 'brand',
    roles: ['primary', 'secondary', 'accent', 'cta', 'link', 'focus'],
  },
  {
    key: 'surfaces',
    roles: ['background', 'surface', 'surfaceMuted', 'border'],
  },
  { key: 'text', roles: ['foreground', 'foregroundMuted'] },
  { key: 'feedback', roles: ['success', 'warning', 'error'] },
];

/** Roles an Owner may override under "Advanced" (seeds are edited above). */
const OVERRIDABLE_ROLES: readonly BrandRoleName[] = [
  'cta',
  'link',
  'focus',
  'foreground',
  'foregroundMuted',
  'surface',
  'surfaceMuted',
  'border',
];

type SwatchState = 'pass' | 'adjusted' | 'decorative';

/** What the swatch badge says, and the ratio a screen reader hears. */
function swatchStatus(
  palette: BrandPalette,
  role: BrandRoleName
): { state: SwatchState; ratio: number } {
  const { roles } = palette;
  const ratio =
    role === 'cta'
      ? contrastRatio(roles.ctaForeground, roles.cta)
      : contrastRatio(roles[role], roles.background);
  const decorative =
    (BRAND_SEED_NAMES as readonly string[]).includes(role) &&
    palette.usage[role as BrandSeedName] === 'decorativeOnly';
  if (decorative) return { state: 'decorative', ratio: reportedRatio(ratio) };
  const adjusted = palette.report.adjustments.some(
    (adjustment) =>
      adjustment.target === role && adjustment.reason === 'contrast'
  );
  return { state: adjusted ? 'adjusted' : 'pass', ratio: reportedRatio(ratio) };
}

function ColorField({
  id,
  label,
  value,
  onChange,
  onClear,
  clearLabel,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: HslTriplet | undefined;
  readonly onChange: (value: HslTriplet) => void;
  readonly onClear?: () => void;
  readonly clearLabel?: string;
}): JSX.Element {
  const hex = value ? tripletToHex(value) : '#000000';
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`${id}-hex`}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={hex}
          onChange={(event) => {
            const triplet = hexToTriplet(event.target.value);
            if (triplet) onChange(triplet);
          }}
          className="size-10 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-1"
        />
        <Input
          id={`${id}-hex`}
          key={hex}
          defaultValue={value ? hex : ''}
          dir="ltr"
          data-ltr-content
          spellCheck={false}
          className="w-28 font-mono uppercase"
          onBlur={(event) => {
            const triplet = hexToTriplet(event.target.value);
            if (triplet) onChange(triplet);
          }}
        />
        {onClear ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            {clearLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export interface BrandStudioProps {
  readonly studio: BrandStudioState;
  /** Renders the live preview for the current palette (a theme's own renderer). */
  readonly renderPreview: (palette: BrandPalette) => ReactNode;
  /** Called with the picked file, so the caller can upload/keep it. */
  readonly onLogoPicked?: (file: File) => void;
  /** Where the logo currently is, for the picker's thumbnail. */
  readonly logoPreviewUrl?: string;
  /**
   * The "Accept palette" step. The onboarding wizard keeps it (the Owner
   * approves the suggestion); the Visual Identity page does not — its one
   * "Save Visual Identity" is the approval.
   */
  readonly showAccept?: boolean;
  readonly className?: string;
}

export function BrandStudio({
  studio,
  renderPreview,
  onLogoPicked,
  logoPreviewUrl,
  showAccept = true,
  className,
}: BrandStudioProps): JSX.Element {
  const { t } = useTranslation();
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const { draft, palette, validation, analysis, actions, variant } = studio;

  const issuesByRole = new Map<string, (typeof validation.issues)[number]>();
  for (const issue of validation.issues) {
    const role = issue.path.split('.')[1];
    if (role && !issuesByRole.has(role)) issuesByRole.set(role, issue);
  }

  const analysisMessage =
    analysis.kind === 'analyzing'
      ? analysis.slow
        ? t('website:brandStudio.analyzing')
        : ''
      : analysis.kind === 'error'
        ? t(`website:brandStudio.errors.${analysis.error}`)
        : analysis.kind === 'done'
          ? t(
              showAccept
                ? 'website:brandStudio.proposed'
                : 'website:brandStudio.proposedSave'
            )
          : '';

  return (
    <div
      className={cn(
        // `minmax(0,1fr)` below xl too: an implicit `auto` column grows to
        // its widest unbreakable child and pushes the studio past a narrow
        // container (the provisioning form's 390 px layout).
        'grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]',
        className
      )}
    >
      <div className="space-y-8">
        {/* 1 · Logo */}
        <section aria-labelledby={`${id}-logo`} className="space-y-3">
          <h3
            id={`${id}-logo`}
            className="text-sm font-semibold text-foreground"
          >
            {t('website:brandStudio.logoTitle')}
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted">
              {logoPreviewUrl ? (
                <img
                  src={logoPreviewUrl}
                  alt=""
                  className="size-full object-contain p-1"
                />
              ) : (
                <ImageUp className="size-5 text-muted-foreground" aria-hidden />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInput.current?.click()}
                disabled={analysis.kind === 'analyzing'}
              >
                {analysis.kind === 'analyzing' && analysis.slow ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <ImageUp className="size-4" aria-hidden />
                )}
                {logoPreviewUrl
                  ? t('website:brandStudio.replaceLogo')
                  : t('website:brandStudio.chooseLogo')}
              </Button>
              {analysis.kind === 'error' &&
              analysis.error === 'analysisFailed' ? (
                <Button type="button" variant="ghost" onClick={actions.retry}>
                  <RefreshCw className="size-4" aria-hidden />
                  {t('website:brandStudio.retry')}
                </Button>
              ) : null}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                // Upload/keep the logo only after it passes validation.
                void actions.analyzeFile(file, () => onLogoPicked?.(file));
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t('website:brandStudio.logoHelp')}
          </p>
          <p
            role="status"
            aria-live="polite"
            className={cn(
              'text-sm',
              analysis.kind === 'error'
                ? 'text-destructive'
                : 'text-muted-foreground'
            )}
          >
            {analysisMessage}
          </p>
          {analysis.kind === 'error' ? (
            <p className="text-sm text-muted-foreground">
              {t('website:brandStudio.manualHint')}
            </p>
          ) : null}
          {analysis.kind === 'done' && analysis.flags.includes('monochrome') ? (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">
              {t('website:brandStudio.monochromeHint')}
            </p>
          ) : null}
        </section>

        {/* 2 · Seeds */}
        <section aria-labelledby={`${id}-seeds`} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3
              id={`${id}-seeds`}
              className="text-sm font-semibold text-foreground"
            >
              {t('website:brandStudio.brandColours')}
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto min-h-9 whitespace-normal text-start"
              onClick={actions.regenerate}
            >
              <Sparkles className="size-4" aria-hidden />
              {t('website:brandStudio.regenerate')}
              <span className="text-muted-foreground">
                · {t(`website:brandStudio.variants.${variant}`)}
              </span>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            {BRAND_SEED_NAMES.map((name) => (
              <ColorField
                key={name}
                id={`${id}-seed-${name}`}
                label={t(`website:brandStudio.seeds.${name}`)}
                // A logo often seeds only the primary; the others are
                // derived — show those rather than an empty black field.
                value={
                  draft.seeds[name] ??
                  palette.seeds[name] ??
                  palette.roles[name]
                }
                onChange={(value) => actions.setSeed(name, value)}
              />
            ))}
          </div>
        </section>

        {/* 3 · Proposed palette */}
        <section aria-labelledby={`${id}-palette`} className="space-y-4">
          <h3
            id={`${id}-palette`}
            className="text-sm font-semibold text-foreground"
          >
            {t('website:brandStudio.paletteTitle')}
          </h3>
          {ROLE_GROUPS.map((group) => (
            <div key={group.key} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t(`website:brandStudio.groups.${group.key}`)}
              </p>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {group.roles.map((role) => {
                  const status = swatchStatus(palette, role);
                  return (
                    <li
                      key={role}
                      className="flex items-center gap-2 rounded-md border border-border p-2"
                    >
                      <span
                        aria-hidden
                        className="size-8 shrink-0 rounded border border-black/10"
                        style={{
                          backgroundColor: `hsl(${palette.roles[role]})`,
                        }}
                      />
                      {/* Labels wrap instead of truncating: at 390 px two
                          columns leave ~90 px, and "Secondary text" /
                          "عُدِّل ليصبح مقروءًا" must stay readable whole. */}
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-xs font-medium leading-snug text-foreground">
                          {t(`website:brandStudio.roles.${role}`)}
                        </span>
                        <span
                          className={cn(
                            'block break-words text-[11px] leading-snug',
                            status.state === 'decorative'
                              ? 'text-warning'
                              : 'text-muted-foreground'
                          )}
                        >
                          {t(`website:brandStudio.badge.${status.state}`)}
                          <span className="sr-only">
                            {' '}
                            {t('website:brandStudio.ratio', {
                              ratio: status.ratio,
                            })}
                          </span>
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>

        {/* 4 · Advanced */}
        <details className="group rounded-md border border-border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">
            {t('website:brandStudio.advanced')}
          </summary>
          <div className="space-y-4 border-t border-border p-4">
            <p className="text-xs text-muted-foreground">
              {t('website:brandStudio.advancedHelp')}
            </p>
            {OVERRIDABLE_ROLES.map((role) => {
              const issue = issuesByRole.get(role);
              return (
                <div key={role} className="space-y-1.5">
                  <ColorField
                    id={`${id}-role-${role}`}
                    label={t(`website:brandStudio.roles.${role}`)}
                    value={draft.overrides[role] ?? palette.roles[role]}
                    onChange={(value) => actions.setOverride(role, value)}
                    onClear={
                      draft.overrides[role]
                        ? () => actions.setOverride(role, undefined)
                        : undefined
                    }
                    clearLabel={t('website:brandStudio.useDerived')}
                  />
                  {issue ? (
                    <div
                      role="alert"
                      className="flex flex-wrap items-center gap-2 text-sm text-destructive"
                    >
                      <span>
                        {t(issue.messageKey, {
                          ratio: issue.pair?.ratio,
                          required: issue.pair?.required,
                        })}
                      </span>
                      {issue.suggestion ? (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto min-h-6 p-0"
                          onClick={() => actions.applySuggestion(role)}
                        >
                          {t('website:brandStudio.useSuggestion')}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </details>

        {/* 5 · Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {showAccept ? (
            <Button
              type="button"
              onClick={actions.accept}
              disabled={!validation.valid || draft.status === 'confirmed'}
            >
              <CheckCircle2 className="size-4" aria-hidden />
              {draft.status === 'confirmed'
                ? t('website:brandStudio.accepted')
                : t('website:brandStudio.accept')}
            </Button>
          ) : null}
          {studio.hasLogoSuggestion ? (
            <Button
              type="button"
              variant="outline"
              onClick={actions.resetToLogo}
            >
              <RotateCcw className="size-4" aria-hidden />
              {t('website:brandStudio.resetToLogo')}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            onClick={actions.resetToThemeDefault}
          >
            {t('website:brandStudio.resetToTheme')}
          </Button>
        </div>
        {!validation.valid ? (
          <p className="text-sm text-destructive">
            {showAccept
              ? t('website:brandStudio.cannotAccept')
              : t('website:brandStudio.cannotSave')}
          </p>
        ) : null}
      </div>

      {/* Live preview */}
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-semibold text-foreground">
          {t('website:brandStudio.preview')}
        </p>
        <div className="brand-studio-preview overflow-hidden rounded-lg border border-border">
          {renderPreview(palette)}
        </div>
      </div>
    </div>
  );
}
