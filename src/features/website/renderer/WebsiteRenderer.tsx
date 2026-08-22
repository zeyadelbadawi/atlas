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
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { WebsiteThemeScope } from './WebsiteThemeScope';
import { WebsiteHeader } from './WebsiteHeader';
import { WebsiteFooter } from './WebsiteFooter';
import { SectionRenderer } from '../sections';
import { CourseDetailsTemplate } from './CourseDetailsTemplate';
import type {
  WebsiteBrandConfig,
  WebsiteConfiguration,
  WebsitePage,
} from '@types';

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
  className,
}: WebsiteRendererProps): JSX.Element {
  const theme = getWebsiteTheme(configuration.themeKey);
  const brand: Pick<WebsiteBrandConfig, 'primaryColor' | 'secondaryColor' | 'accentColor'> =
    configuration.brand;

  return (
    <WebsiteThemeScope theme={theme} brand={brand} className={className}>
      <div className="min-h-full bg-background text-foreground">
        <WebsiteHeader
          logo={academyLogo}
          academyName={academyName}
          navigation={configuration.navigation}
          pages={pages}
          header={configuration.header}
          activePageId={page.id}
          onNavigate={onNavigate}
        />

        <main>
          {page.coreType === 'courseDetails' ? (
            previewCourseId ? (
              <CourseDetailsTemplate academyId={academyId} courseId={previewCourseId} />
            ) : null
          ) : (
            page.sections.map((instance) => (
              <SectionRenderer key={instance.id} instance={instance} academyId={academyId} />
            ))
          )}
        </main>

        <WebsiteFooter
          academyName={academyName}
          footer={configuration.footer}
          onNavigate={onNavigate}
        />
      </div>
    </WebsiteThemeScope>
  );
}
