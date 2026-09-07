/**
 * Website Brand Bridge.
 *
 * A CSS-variable "brand bridge" — aliases the resolved website-theme
 * accent color onto Atlas's own generic shadcn tokens (`--primary`/
 * `--primary-foreground`/`--primary-hover`/`--ring`) so existing,
 * unmodified Button/Card/Dialog components pick up the Academy's real
 * brand color with zero per-component changes. Never touches
 * `--background`/`--foreground`/`--border`/`--muted`, which
 * `WebsiteChrome` itself already sets to the same neutral tokens the
 * rest of the app uses — only the ACCENT tokens need bridging.
 *
 * Originally written inline inside `PublicWebsiteLearningRoute` (the
 * Student Learning surface); extracted here once the exact same gap
 * reproduced live on `PublicWebsiteSignInPage`/`PublicWebsiteSignUpPage`
 * — their `SignInForm`/`RegistrationForm` are ordinary dashboard
 * components (built long before any Academy website existed) that read
 * these same generic tokens, so their submit buttons rendered in
 * Atlas's own default accent color instead of the Academy's, even
 * though the surrounding `WebsiteChrome` was already correctly branded.
 * Any public-website page that renders pre-existing, non-website-aware
 * components should wrap them in this bridge.
 */
import { useWebsiteDesignSystem } from './WebsiteDesignSystemContext';

/** Darkens (light mode) or lightens (dark mode) an `"H S% L%"` triplet by a fixed amount for a `:hover` shade — approximates, rather than exactly reproduces, `--primary-hover`'s own light/dark-specific offset (see `index.css`); a minor, disclosed visual approximation, not a functional gap. */
function shiftLightness(hslTriplet: string, deltaPercent: number): string {
  const match = /^(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/.exec(hslTriplet.trim());
  if (!match) return hslTriplet;
  const [, h, s, l] = match;
  const nextLightness = Math.min(100, Math.max(0, Number(l) + deltaPercent));
  return `${h} ${s}% ${nextLightness}%`;
}

export function WebsiteBrandBridge({
  children,
}: {
  readonly children: React.ReactNode;
}): JSX.Element {
  const design = useWebsiteDesignSystem();
  const isDark = document.documentElement.classList.contains('dark');
  const style = {
    '--primary': design.primary,
    '--primary-foreground': '0 0% 100%',
    '--primary-hover': shiftLightness(design.primary, isDark ? 6 : -6),
    '--ring': design.primary,
  } as React.CSSProperties;

  return (
    <div className="contents" style={style}>
      {children}
    </div>
  );
}
