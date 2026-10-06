/**
 * Manara's chrome (Reports/THEME_3_MANARA_PLAN.md §3.11): the brand-block
 * header, the night footer and the auth frame, for the pack's `chrome`.
 */
import type { ThemeChrome } from '@/features/website/theme-packs/theme-pack.types';
import { ManaraHeader } from './ManaraHeader';
import { ManaraFooter } from './ManaraFooter';
import { ManaraAuthFrame } from './ManaraAuthFrame';

export { ManaraHeader, ManaraFooter, ManaraAuthFrame };

export const MANARA_CHROME: ThemeChrome = {
  Header: ManaraHeader,
  Footer: ManaraFooter,
  AuthFrame: ManaraAuthFrame,
};
