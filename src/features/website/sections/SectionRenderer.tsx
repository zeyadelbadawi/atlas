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
import { DEFAULT_RESPONSIVE_VISIBILITY } from '@types';
import { sectionVisibilityClass } from './section-visibility.utils';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';
import { resolveSectionRenderer } from '../theme-packs/theme-pack.registry';
import { useThemePack } from '../theme-packs/ThemePackContext';
import {
  PREVIEW_SECTION_ATTRIBUTE,
  PREVIEW_SELECTED_ATTRIBUTE,
  useIsWebsitePreview,
  usePreviewSelection,
} from '../renderer/WebsitePreviewContext';
import type { SectionRenderProps } from '../theme-packs/theme-pack.types';
import { SectionDesignContext, resolveSectionDesign } from './section-design';
import './section-design.css';

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
  const isPreview = useIsWebsitePreview();
  const selectedId = usePreviewSelection();
  if (!instance.enabled) return null;

  // Keyed by `instance.type`, so the renderer and `instance.config` always
  // belong to the same section type; the union just can't express that.
  const Renderer = resolveSectionRenderer(pack, instance.type) as
    ComponentType<SectionRenderProps<SectionInstance['type']>> | undefined;
  // A type this build doesn't know (e.g. newer data on an older client)
  // renders nothing rather than failing the page.
  if (!Renderer) return null;

  const visibility = instance.visibility ?? DEFAULT_RESPONSIVE_VISIBILITY;
  // Hidden at every size: nothing to render at all.
  if (!visibility.mobile && !visibility.tablet && !visibility.desktop)
    return null;

  const rendered = (
    <SectionDesignContext.Provider
      value={resolveSectionDesign(instance.design, pack.key, instance.type)}
    >
      <Renderer
        config={instance.config as never}
        academyId={academyId}
        pages={pages}
        linkRenderer={linkRenderer}
        sectionId={instance.id}
      />
    </SectionDesignContext.Provider>
  );
  const visibilityClass = sectionVisibilityClass(visibility);
  // Wrapped only when something is hidden; `display: contents` keeps the
  // section's own box in its parent's layout.
  const placed = visibilityClass ? (
    <div className={visibilityClass} data-section-visibility="">
      {rendered}
    </div>
  ) : (
    rendered
  );
  // In the dashboard's device preview only: a box-less anchor naming the
  // section, so the editor can find it in the frame (`WebsitePreviewContext`).
  return isPreview ? (
    <div
      className="contents"
      {...{
        [PREVIEW_SECTION_ATTRIBUTE]: instance.id,
        [PREVIEW_SELECTED_ATTRIBUTE]:
          selectedId === instance.id ? '' : undefined,
      }}
    >
      {placed}
    </div>
  ) : (
    placed
  );
}
