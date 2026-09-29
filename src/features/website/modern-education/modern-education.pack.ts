/**
 * Theme 1 — Modern Education.
 *
 * Phase 4: its own brand mapping (§F.5 — the canvas stays neutral and the
 * brand fills only the defined slots), its visual system
 * (`modern-education.css`) and its chrome (header, footer, auth frame).
 * Section renderers arrive in Phases 5–6.
 */
import type { ThemePack } from '../theme-packs/theme-pack.types';
import './modern-education.css';
import { mapModernEducationBrandPalette } from './modern-education.brand-mapping';
import { ModernEducationHeader } from './ModernEducationHeader';
import { ModernEducationFooter } from './ModernEducationFooter';
import { ModernEducationAuthFrame } from './ModernEducationAuthFrame';

export const MODERN_EDUCATION_PACK: ThemePack = {
  key: 'modern-education',
  renderers: {},
  chrome: {
    Header: ModernEducationHeader,
    Footer: ModernEducationFooter,
    AuthFrame: ModernEducationAuthFrame,
  },
  mapBrandPalette: mapModernEducationBrandPalette,
};
