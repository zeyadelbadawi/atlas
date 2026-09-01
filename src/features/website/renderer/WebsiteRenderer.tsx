/**
 * Website Renderer.
 *
 * The single composition root: Theme + Brand → Header → page content
 * (sections, or the Course Details template) → Footer. Every consumer —
 * the Theme gallery's mini-previews, the Page Editor's live preview, the
 * in-dashboard Preview surface — renders through this ONE component, so
 * "what the client sees while editing" and "what the renderer actually
 * produces" can never drift apart (see `Reports/ARCHITECTURE.md`,
 * Prompt 9, "One Renderer, Every Surface").
 */
import { WebsiteChrome } from './WebsiteChrome';
import { SectionRenderer } from '../sections';
import { CourseDetailsTemplate } from './CourseDetailsTemplate';
import type { WebsiteConfiguration, WebsitePage } from '@types';
import type { WebsiteLinkRenderer } from './website-link-renderer.types';

export interface WebsiteRendererProps {
  readonly academyId: string;
  readonly academyName: string;
  readonly academyLogo?: string;
  readonly configuration: Pick<WebsiteConfiguration, 'themeKey' | 'brand' | 'navigation' | 'header' | 'footer'>;
  readonly pages: readonly WebsitePage[];
  readonly page: WebsitePage;
  /** Only meaningful when previewing `coreType: 'courseDetails'` — which real course to demonstrate the template with. */
  readonly previewCourseId?: string;
  readonly onNavigate: (pageId: string) => void;
  /** See `website-link-renderer.types.ts` — absent in every dashboard preview context, supplied only by the public runtime. */
  readonly linkRenderer?: WebsiteLinkRenderer;
  readonly className?: string;
}

export function WebsiteRenderer({
  academyId,
  academyName,
  academyLogo,
  configuration,
  pages,
  page,
  previewCourseId,
  onNavigate,
  linkRenderer,
  className,
}: WebsiteRendererProps): JSX.Element {
  return (
    <WebsiteChrome
      academyName={academyName}
      academyLogo={academyLogo}
      configuration={configuration}
      pages={pages}
      activePageId={page.id}
      onNavigate={onNavigate}
      linkRenderer={linkRenderer}
      className={className}
    >
      {page.coreType === 'courseDetails' ? (
        previewCourseId ? (
          <CourseDetailsTemplate academyId={academyId} courseId={previewCourseId} />
        ) : null
      ) : (
        page.sections.map((instance) => (
          <SectionRenderer
            key={instance.id}
            instance={instance}
            academyId={academyId}
            pages={pages}
            linkRenderer={linkRenderer}
          />
        ))
      )}
    </WebsiteChrome>
  );
}
