/**
 * Manara auth-page frame (Reports/THEME_3_MANARA_PLAN.md §3.11): from
 * 1024px the sign-in/up form sits on the day ground beside a night panel
 * — the beam and the `auth-side` photograph in a slanted frame. Phones and
 * tablets show the form alone, first; the panel is `display: none` there
 * and its image asks for a 1px candidate, so nothing downloads. The
 * photograph is decorative; until it is released the neutral placeholder
 * holds its place, so the layout never shifts.
 *
 * The frame contract carries only the page body (`children`), so the
 * academy's name is not available here; the panel is the beam and the
 * photograph.
 */
import type { ThemeAuthFrameProps } from '@/features/website/theme-packs/theme-pack.types';
import { ManaraBeam, ManaraMedia } from '../manara-parts';
import '../manara-pages.css';

const AUTH_SIDE = 'theme-asset:manara/auth-side';

export function ManaraAuthFrame({
  children,
}: ThemeAuthFrameProps): JSX.Element {
  return (
    <div data-manara-auth-frame="" className="mnp-auth">
      <div
        aria-hidden
        className="mnp-auth-side hidden lg:flex"
        data-env="night"
      >
        <ManaraBeam position="start" />
        <ManaraMedia
          value={AUTH_SIDE}
          alt=""
          shape="slant"
          sizes="(min-width: 1024px) 38vw, 1px"
          className="aspect-[4/5] w-full"
        />
      </div>
      <div className="mnp-auth-form">{children}</div>
    </div>
  );
}
