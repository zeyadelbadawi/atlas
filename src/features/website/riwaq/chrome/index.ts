/**
 * Riwaq's chrome (Reports/THEME_4_RIWAQ_PLAN.md §4): the masthead with its
 * bottom-sheet menu, the deep footer and the auth frame.
 */
import type { ThemeChrome } from '@/features/website/theme-packs/theme-pack.types';
import { RiwaqHeader } from './RiwaqHeader';
import { RiwaqFooter } from './RiwaqFooter';
import { RiwaqAuthFrame } from './RiwaqAuthFrame';

export { RiwaqHeader, RiwaqFooter, RiwaqAuthFrame };

export const RIWAQ_CHROME: ThemeChrome = {
  Header: RiwaqHeader,
  Footer: RiwaqFooter,
  AuthFrame: RiwaqAuthFrame,
};
