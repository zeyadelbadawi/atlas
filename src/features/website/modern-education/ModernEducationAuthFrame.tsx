/**
 * Theme 1 auth-page frame (plan §C.7): the sign-in/up form beside the
 * `auth-side` photograph on desktop. Tablets and phones show the form
 * alone — the form comes first (§E.2). Until the photograph is released
 * the panel is the ink band with the brand glow, so the layout never shows
 * an empty box.
 */
import { ThemeImage } from '../theme-assets';
import type { ThemeAuthFrameProps } from '../theme-packs/theme-pack.types';

const AUTH_SIDE = 'theme-asset:modern-education/auth-side';

export function ModernEducationAuthFrame({
  children,
}: ThemeAuthFrameProps): JSX.Element {
  return (
    <div className="mx-auto grid w-full max-w-[var(--website-container-width)] items-stretch gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-10">
      <div className="min-w-0">{children}</div>
      <div
        aria-hidden
        className="relative hidden overflow-hidden rounded-[var(--t1-radius-card)] bg-[var(--website-ink)] lg:block"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 50% at 80% 20%, var(--website-ink-glow), transparent 70%), radial-gradient(40% 40% at 15% 85%, var(--website-ink-glow-detail), transparent 70%)',
          }}
        />
        <ThemeImage
          value={AUTH_SIDE}
          alt=""
          sizes="(min-width: 1024px) 45vw, 1px"
          className="relative size-full object-cover"
        />
      </div>
    </div>
  );
}
