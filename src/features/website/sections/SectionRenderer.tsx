/**
 * Section Renderer — the dispatcher.
 *
 * The ONE place a `SectionInstance` is turned into UI. Every page/preview
 * renders sections through this component; nothing else chooses a section
 * component by `SectionInstance.type`.
 *
 * Theme 1 plan §F.1: the renderer comes from the active theme pack —
 * `pack.renderers[type] ?? BASE_RENDERERS[type]` — so a theme redesigns
 * only the section types it wants and every other type still renders.
 * Adding a section type means adding its config type and a base renderer
 * (`theme-packs/base-renderers.tsx`).
 */
import type { ComponentType } from 'react';
import type { SectionInstance, WebsitePage } from '@types';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';
import { resolveSectionRenderer } from '../theme-packs/theme-pack.registry';
import { useThemePack } from '../theme-packs/ThemePackContext';
import type { SectionRenderProps } from '../theme-packs/theme-pack.types';

export interface SectionRendererProps {
  readonly instance: SectionInstance;
  readonly academyId: string;
  readonly pages: readonly WebsitePage[];
  /**
   * Supplied ONLY by contexts that can safely navigate for real (the
   * public runtime). Left undefined everywhere else (Theme gallery
   * preview, Page Editor live preview, `WebsitePreviewPage`) so a CTA
   * button stays an inert label there, exactly as before Prompt 11 — see
   * `WebsiteRenderer`'s doc comment.
   */
  readonly linkRenderer?: WebsiteLinkRenderer;
}

export function SectionRenderer({
  instance,
  academyId,
  pages,
  linkRenderer,
}: SectionRendererProps): JSX.Element | null {
  const pack = useThemePack();
  if (!instance.enabled) return null;

  // Keyed by `instance.type`, so the renderer and `instance.config` always
  // belong to the same section type; the union just can't express that.
  const Renderer = resolveSectionRenderer(pack, instance.type) as
    ComponentType<SectionRenderProps<SectionInstance['type']>> | undefined;
  // A type this build doesn't know (e.g. newer data on an older client)
  // renders nothing rather than failing the page.
  if (!Renderer) return null;

  return (
    <Renderer
      config={instance.config as never}
      academyId={academyId}
      pages={pages}
      linkRenderer={linkRenderer}
    />
  );
}
