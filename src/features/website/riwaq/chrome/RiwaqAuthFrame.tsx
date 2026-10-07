/**
 * Riwaq auth frame (plan §4): the form on porcelain beside a photograph
 * window with the academy's crest on its corner (from 1024px; phones get
 * the form alone). The form itself is the shared auth page, unchanged.
 */
import type { ThemeAuthFrameProps } from '@/features/website/theme-packs/theme-pack.types';
import { useWebsiteIdentity } from '@/features/website/renderer/WebsiteIdentityContext';
import { RiwaqCrest, RiwaqWindow } from '../riwaq-parts';
import '../riwaq-pages.css';

const AUTH_SIDE = 'theme-asset:riwaq/auth-side';

export function RiwaqAuthFrame({ children }: ThemeAuthFrameProps): JSX.Element {
  const { name } = useWebsiteIdentity();
  return (
    <div data-riwaq-auth-frame="" className="rw-container rwc-auth">
      <div aria-hidden className="rwc-auth-side">
        <RiwaqWindow
          value={AUTH_SIDE}
          alt=""
          sizes="(min-width: 1024px) 36vw, 1px"
          className="aspect-[4/5] w-full"
        />
        {name ? <RiwaqCrest name={name} className="rwc-auth-crest" /> : null}
      </div>
      <div className="rwc-auth-form">{children}</div>
    </div>
  );
}
