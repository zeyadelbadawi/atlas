/**
 * Branding chosen in the setup form, waiting for its Academy (Theme 1 plan
 * §F.4.3 "Setup flow"): the provisioning request is created with no new
 * fields; the logo file and palette stay in the page, keyed by the
 * request, until the status surface can save them. In memory only — if
 * the tab closes first the Academy simply keeps the theme's default
 * palette, and the Brand tab offers the Brand Studio later.
 *
 * Each step's completion is recorded here too, so a re-render or a second
 * status surface for the same request never repeats a finished save.
 */
import type { toPaletteInput } from './useBrandStudio';

export interface PendingBranding {
  readonly logoFile?: File;
  readonly palette?: ReturnType<typeof toPaletteInput>;
  logoSaved?: boolean;
  paletteSaved?: boolean;
}

const pending = new Map<string, PendingBranding>();

export const pendingBrandingStore = {
  set(requestId: string, value: PendingBranding): void {
    pending.set(requestId, { ...value });
  },
  get(requestId: string): PendingBranding | undefined {
    return pending.get(requestId);
  },
  clear(requestId: string): void {
    pending.delete(requestId);
  },
};
