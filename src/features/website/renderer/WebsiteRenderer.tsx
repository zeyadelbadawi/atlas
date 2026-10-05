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
import { useMemo } from 'react';
import { WebsiteChrome } from './WebsiteChrome';
import type { WebsiteHeaderAuthState } from './WebsiteHeader';
import { SectionRenderer } from '../sections';
import { CourseDetailsTemplate } from './CourseDetailsTemplate';
import { useThemePack } from '../theme-packs/ThemePackContext';
import { PageHeadingProvider } from './PageHeadingContext';
import { adoptThemeAssets } from '../theme-assets/adopt-theme-assets';
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
        <PageSections
          page={page}
          themeKey={configuration.themeKey}
          navigation={configuration.navigation}
          academyId={academyId}
          academyName={academyName}
          pages={pages}
          linkRenderer={linkRenderer}
        />
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
 * The page's sections, with its one `<h1>`: a page that opens with a hero
 * gives it to that hero; otherwise the theme's intro carries it on inner
 * pages, and on Home (which gets no intro) the first hero further down
 * does — or, with none at all, a visually hidden heading naming the
 * Academy. Every other hero on the page uses `<h2>`.
 */
function PageSections({
  page: storedPage,
  themeKey,
  navigation,
  academyId,
  academyName,
  pages,
  linkRenderer,
}: {
  readonly page: WebsitePage;
  readonly themeKey: string;
  readonly navigation: ThemePageIntroProps['navigation'];
  readonly academyId: string;
  readonly academyName: string;
  readonly pages: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
}): JSX.Element {
  // A starter photograph of another theme is drawn as this theme's
  // photograph for the same slot (`adopt-theme-assets.ts`); the stored
  // content is unchanged.
  const page = useMemo(
    () => adoptThemeAssets(storedPage, themeKey),
    [storedPage, themeKey]
  );
  const PageIntro = useThemePack().pages?.PageIntro;
  const enabled = page.sections.filter((instance) => instance.enabled);
  const first = enabled[0];
  const opensWithHero = !!first && PAGE_OPENING_TYPES.has(first.type);
  const introCarriesH1 =
    !!PageIntro && !opensWithHero && page.coreType !== 'home';
  const h1Owner = opensWithHero
    ? first
    : introCarriesH1
      ? undefined
      : enabled.find((instance) => PAGE_OPENING_TYPES.has(instance.type));

  return (
    <>
      <PageIntroSlot
        page={page}
        navigation={navigation}
        academyName={academyName}
        hasH1Owner={!!h1Owner}
      />
      {page.sections.map((instance) => (
        <PageHeadingProvider
          key={instance.id}
          value={instance.id === h1Owner?.id ? 'h1' : 'h2'}
        >
          <SectionRenderer
            instance={instance}
            academyId={academyId}
            pages={pages}
            linkRenderer={linkRenderer}
          />
        </PageHeadingProvider>
      ))}
    </>
  );
}

/**
 * A theme may draw a hero above a page that opens without one (Theme 1
 * §C.0, for pages created before page heroes existed). Nothing is written
 * to the page; a theme without an intro renders the page as it always did.
 */
function PageIntroSlot({
  page,
  navigation,
  academyName,
  hasH1Owner,
}: ThemePageIntroProps & {
  readonly academyName: string;
  readonly hasH1Owner: boolean;
}) {
  const PageIntro = useThemePack().pages?.PageIntro;
  const first = page.sections.find((instance) => instance.enabled);
  const opensWithHero = !!first && PAGE_OPENING_TYPES.has(first.type);
  if (PageIntro) {
    if (opensWithHero) return null;
    if (page.coreType === 'home') {
      // Home gets no visible intro; without any hero it still needs its
      // one top-level heading, for assistive tech only.
      return hasH1Owner ? null : <h1 className="sr-only">{academyName}</h1>;
    }
    return <PageIntro page={page} navigation={navigation} />;
  }
  // Without an intro, a page that doesn't open with a hero has no <h1>.
  // Name it for assistive tech only, so the page looks exactly as before.
  if (opensWithHero || !page.title) return null;
  return <h1 className="sr-only">{page.title}</h1>;
}
