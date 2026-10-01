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
import type { WebsiteHeaderAuthState } from './WebsiteHeader';
import { SectionRenderer } from '../sections';
import { CourseDetailsTemplate } from './CourseDetailsTemplate';
import { useThemePack } from '../theme-packs/ThemePackContext';
import type {
  ThemeCourseDetailsProps,
  ThemePageIntroProps,
} from '../theme-packs/theme-pack.types';
import type { PublicWebsiteLocale } from '../constants/locale.constants';
import type { WebsiteConfiguration, WebsitePage } from '@types';
import type { WebsiteLinkRenderer } from './website-link-renderer.types';

export interface WebsiteRendererProps {
  readonly academyId: string;
  readonly academyName: string;
  readonly academyLogo?: string;
  readonly configuration: Pick<
    WebsiteConfiguration,
    'themeKey' | 'brand' | 'navigation' | 'header' | 'footer'
  >;
  readonly pages: readonly WebsitePage[];
  readonly page: WebsitePage;
  /** Only meaningful when previewing `coreType: 'courseDetails'` — which real course to demonstrate the template with. */
  readonly previewCourseId?: string;
  readonly onNavigate: (pageId: string) => void;
  /** See `website-link-renderer.types.ts` — absent in every dashboard preview context, supplied only by the public runtime. */
  readonly linkRenderer?: WebsiteLinkRenderer;
  readonly className?: string;
  /** Which side of every `LocalizedText` field to show. Defaults to English — the real public runtime derives this from the `/ar/...` URL prefix; the in-dashboard Page Editor preview passes whichever language tab the admin is currently viewing (see `SectionConfigForm`). Threaded straight through to `WebsiteChrome`, which is the one place that actually mounts `PublicWebsiteLocaleProvider` — see that component's own doc comment ("One Renderer, Every Surface" applies to Sign In/Sign Up too, so the provider lives at the shell they share, not duplicated here). */
  readonly locale?: PublicWebsiteLocale;
  /** See `WebsiteChromeProps.onLocaleChange` — forwarded verbatim. */
  readonly onLocaleChange?: (locale: PublicWebsiteLocale) => void;
  /** See `WebsiteChromeProps.authState` — forwarded verbatim. */
  readonly authState?: WebsiteHeaderAuthState;
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
  locale,
  onLocaleChange,
  authState,
}: WebsiteRendererProps): JSX.Element {
  return (
    <WebsiteChrome
      academyId={academyId}
      academyName={academyName}
      academyLogo={academyLogo}
      configuration={configuration}
      pages={pages}
      activePageId={page.id}
      onNavigate={onNavigate}
      linkRenderer={linkRenderer}
      className={className}
      locale={locale}
      onLocaleChange={onLocaleChange}
      authState={authState}
    >
      {page.coreType === 'courseDetails' ? (
        previewCourseId ? (
          <CourseDetailsSlot
            academyId={academyId}
            courseId={previewCourseId}
            locale={locale}
            pages={pages}
            linkRenderer={linkRenderer}
          />
        ) : null
      ) : (
        <>
          <PageIntroSlot page={page} navigation={configuration.navigation} />
          {page.sections.map((instance) => (
            <SectionRenderer
              key={instance.id}
              instance={instance}
              academyId={academyId}
              pages={pages}
              linkRenderer={linkRenderer}
            />
          ))}
        </>
      )}
    </WebsiteChrome>
  );
}

/** The theme's Course Details page when it has one, else the shared template. */
function CourseDetailsSlot(props: ThemeCourseDetailsProps): JSX.Element {
  const Theme = useThemePack().pages?.CourseDetails;
  if (Theme) return <Theme {...props} />;
  return (
    <CourseDetailsTemplate
      academyId={props.academyId}
      courseId={props.courseId}
      locale={props.locale}
    />
  );
}

/** Heroes that open a page; a page starting with one needs no intro. */
const PAGE_OPENING_TYPES = new Set(['hero', 'pageHeader']);

/**
 * A theme may draw a hero above a page that opens without one (Theme 1
 * §C.0, for pages created before page heroes existed). Nothing is written
 * to the page; a theme without an intro renders the page as it always did.
 */
function PageIntroSlot({ page, navigation }: ThemePageIntroProps) {
  const PageIntro = useThemePack().pages?.PageIntro;
  const first = page.sections.find((instance) => instance.enabled);
  const opensWithHero = !!first && PAGE_OPENING_TYPES.has(first.type);
  if (PageIntro) {
    if (page.coreType === 'home' || opensWithHero) return null;
    return <PageIntro page={page} navigation={navigation} />;
  }
  // Without an intro, a page that doesn't open with a hero has no <h1>.
  // Name it for assistive tech only, so the page looks exactly as before.
  if (opensWithHero || !page.title) return null;
  return <h1 className="sr-only">{page.title}</h1>;
}
