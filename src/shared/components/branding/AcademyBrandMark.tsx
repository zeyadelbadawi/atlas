/**
 * Academy Brand Mark — Phase 6.
 *
 * A presentational sibling to `AtlasLogo`, sized/shaped identically, that
 * renders the ACTIVE Academy's own logo + name instead of the Atlas mark.
 * Deliberately takes `logoUrl`/`name` as plain props rather than fetching
 * them itself — `shared/components` never depends on a `@features/*` data
 * hook (this codebase's established layering); callers
 * (`DashboardSidebar`, `LearningLayout`) resolve identity via
 * `useAcademyIdentity` and pass the result down.
 *
 * Falls back to the plain `AtlasLogo` whenever no real Academy logo/name
 * is available yet (no active Academy, still loading, or the Academy has
 * never set a logo) — there is no "half-branded" in-between state.
 */
import { cn } from '@utils';
import { AtlasLogo, type LogoSize } from './AtlasLogo';

const MARK_SIZE_CLASS = {
  sm: 'size-7',
  md: 'size-8',
  lg: 'size-10',
} as const;

const WORDMARK_SIZE_CLASS = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
} as const;

export interface AcademyBrandMarkProps {
  readonly name?: string;
  readonly logoUrl?: string;
  readonly size?: LogoSize;
  /** Hides the wordmark, leaving only the logo. Used by the collapsed sidebar. */
  readonly markOnly?: boolean;
  readonly className?: string;
}

export function AcademyBrandMark({
  name,
  logoUrl,
  size = 'md',
  markOnly = false,
  className,
}: AcademyBrandMarkProps): JSX.Element {
  if (!logoUrl || !name) {
    return <AtlasLogo size={size} markOnly={markOnly} className={className} />;
  }

  return (
    <span
      className={cn('flex min-w-0 items-center gap-2.5 text-foreground', className)}
      aria-label={name}
    >
      <img
        src={logoUrl}
        alt=""
        className={cn('shrink-0 rounded-md object-contain', MARK_SIZE_CLASS[size])}
      />
      {markOnly ? null : (
        <span
          className={cn(
            'truncate font-display font-semibold tracking-tight',
            WORDMARK_SIZE_CLASS[size],
          )}
        >
          {name}
        </span>
      )}
    </span>
  );
}
