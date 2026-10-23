/**
 * Small builders the presets and page templates share, so every preset
 * writes bilingual copy, placeholders, item ids, photographs and page links
 * the same way.
 */
import type { LocalizedText, WebsiteCta } from '@types';
import { findThemeAsset } from '../theme-assets/theme-asset.registry';
import type {
  PresetBuildContext,
  PresetPageTarget,
} from './section-presets.types';

/** Bilingual copy: English, and Modern Standard Arabic. */
export const lt = (en: string, ar: string): LocalizedText => ({ en, ar });

/**
 * A placeholder for a fact only the Academy knows (a course's name, a
 * price, a biography): bracketed in both languages so it reads as "replace
 * me" in the editor, the preview and — if it is ever published unedited —
 * on the site, rather than passing for a real claim.
 */
export const ph = (en: string, ar: string): LocalizedText => ({
  en: `[${en}]`,
  ar: `[${ar}]`,
});

/** A fresh id for a list item, like an item added in the editor. */
export const newItemId = (): string => crypto.randomUUID();

/** The theme whose photograph slots the presets name (Theme 1's keys). */
const REFERENCE_THEME = 'modern-education';

/**
 * A starter photograph for a slot (`home-hero`, `home-cta`, `about-story`,
 * `home-benefit`…): the active theme's own when it has one released for
 * that slot, otherwise Theme 1's — which every theme with photographs then
 * draws as its own photograph for the same slot, under its own key where
 * it differs (`adopt-theme-assets.ts`), exactly as for a starter site.
 */
export function themePhoto(context: PresetBuildContext, key: string): string {
  const own = findThemeAsset(context.themeKey, key);
  return own?.entry.status === 'released'
    ? `theme-asset:${context.themeKey}/${key}`
    : `theme-asset:${REFERENCE_THEME}/${key}`;
}

/**
 * A button to one of the Academy's core pages. Without that page (an
 * unusual site, or a preview without pages) the button keeps its label and
 * no target, which the editor shows as a button still to link.
 */
export function pageButton(
  context: PresetBuildContext,
  target: PresetPageTarget,
  label: LocalizedText
): WebsiteCta {
  const page = context.pages.find((candidate) => candidate.coreType === target);
  return page ? { label, pageId: page.id } : { label };
}

/** The Academy's own sign-up page — every site has one. */
export const signUpButton = (label: LocalizedText): WebsiteCta => ({
  label,
  authAction: 'signUp',
});

/**
 * A WhatsApp button whose number the Owner still has to type: the public
 * site leaves it out until then (the CMS phase 3 button rule), so a preset
 * never publishes a dead or invented number.
 */
export const whatsappButton = (label: LocalizedText): WebsiteCta => ({
  label,
  whatsapp: '',
  whatsappMessage: lt(
    'Hello, I would like to ask about your courses.',
    'مرحبًا، أودّ الاستفسار عن دوراتكم.'
  ),
});

/** A call button whose number is still to be typed (left out publicly until then). */
export const callButton = (label: LocalizedText): WebsiteCta => ({
  label,
  phone: '',
});
