/**
 * Whether the website is being drawn inside the dashboard's device preview
 * (`PreviewViewport`) rather than for a visitor.
 *
 * Set ONLY by the preview frame, so the public site — and the dashboard's
 * other small renderings (theme gallery cards, Brand Studio) — never see
 * it. What it switches on is exactly what a preview needs and a visitor
 * must not get:
 *
 * - every section is wrapped in a box-less anchor carrying its id
 *   (`SectionRenderer`), so the editor can find a section in the frame
 *   (scroll to it, later select it); the themes' "two sections in a row"
 *   spacing rules have a matching form for it, so spacing is unchanged;
 * - the website's own words (buttons, filters, footer labels) are
 *   translated into the PREVIEWED language, not the admin's dashboard
 *   language (`PublicWebsiteLocaleProvider`).
 */
import { createContext, useContext } from 'react';

const WebsitePreviewContext = createContext(false);

export const WebsitePreviewProvider = WebsitePreviewContext.Provider;

export function useIsWebsitePreview(): boolean {
  return useContext(WebsitePreviewContext);
}

/** The attribute on each section's anchor in a preview: `[data-preview-section="<id>"]`. */
export const PREVIEW_SECTION_ATTRIBUTE = 'data-preview-section';
