/**
 * Atelier auth-page frame (Reports/THEME_2_ATELIER_PLAN.md §5a "Chrome"):
 * the sign-in/up form on a paper column beside the tall arch of the
 * `auth-side` photograph on desktop. Tablets and phones show the form
 * alone, first. The photograph is decorative; until it is released the
 * neutral placeholder holds its place, so the layout never shifts.
 */
import type { ThemeAuthFrameProps } from '@/features/website/theme-packs/theme-pack.types';
import { AtelierMedia } from '../atelier-parts';
import '../atelier-pages.css';

const AUTH_SIDE = 'theme-asset:atelier/auth-side';

export function AtelierAuthFrame({
  children,
}: ThemeAuthFrameProps): JSX.Element {
  return (
    <div
      data-env="paper"
      data-atelier-auth-frame=""
      className="at-container grid items-center gap-12 py-6 lg:grid-cols-12 lg:gap-10 lg:py-14"
    >
      <div className="min-w-0 lg:col-span-6">{children}</div>
      <div aria-hidden className="hidden lg:col-span-5 lg:col-start-8 lg:block">
        <AtelierMedia
          value={AUTH_SIDE}
          alt=""
          shape="arch"
          sizes="(min-width: 1024px) 38vw, 1px"
          className="aspect-[4/5] w-full"
        />
      </div>
    </div>
  );
}
