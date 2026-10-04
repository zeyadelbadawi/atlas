/**
 * Atelier chrome (Reports/THEME_2_ATELIER_PLAN.md §5a "Chrome"): the
 * header, the colophon footer and the auth-page frame, for the pack's
 * `chrome`.
 */
import type { ThemeChrome } from '@/features/website/theme-packs/theme-pack.types';
import { AtelierHeader } from './AtelierHeader';
import { AtelierFooter } from './AtelierFooter';
import { AtelierAuthFrame } from './AtelierAuthFrame';

export { AtelierHeader, AtelierFooter, AtelierAuthFrame };

export const ATELIER_CHROME: ThemeChrome = {
  Header: AtelierHeader,
  Footer: AtelierFooter,
  AuthFrame: AtelierAuthFrame,
};
