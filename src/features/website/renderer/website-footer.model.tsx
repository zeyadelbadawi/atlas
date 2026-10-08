/**
 * The Academy website footer's content, shared by every theme footer.
 *
 * Each theme draws its own footer, but what a footer says is the same
 * everywhere: who the Academy is (logo, name, description), the Owner's
 * own link groups, where to learn (the catalogue, My Learn, certificates
 * or a new account), where to get help (FAQs, Contact), the top
 * categories, the Academy's contact details and its social links. This
 * resolves all of it once, from the Academy's real data only:
 *
 * - nothing is invented — a group, a link or a contact line with no data
 *   behind it is left out, never shown as a placeholder;
 * - on the public site only links that resolve are kept (a hidden or
 *   deleted page drops out), and in dashboard previews every Owner link
 *   shows, as before;
 * - a destination the Owner already links to is not repeated by the
 *   derived Learning/Help groups;
 * - only public Academy destinations: My Learn and certificates are the
 *   learner's own area on this site (a visitor is asked to sign in), never
 *   a management dashboard.
 */
import { useTranslation } from 'react-i18next';
import { LEARNER_ROUTES } from '@app/routes/route-paths';
import {
  useAcademyIdentity,
  useCurrentYear,
  usePublicCourseCategories,
} from '@hooks';
import { usePublicWebsiteLocale } from './PublicWebsiteLocaleContext';
import { myLearnHref } from './WebsiteAccountMenu';
import {
  isExternalHref,
  resolvePagePath,
  resolveWebsiteCtaHref,
} from '../utils/link-resolution.utils';
import { resolveCatalogHref } from '../utils/catalog-url.utils';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import { MIN_COURSE_CATEGORIES } from '../constants/website.constants';
import {
  SOCIAL_PLATFORM_NAMES,
  resolveSocialPlatform,
  type SocialPlatform,
} from '../social/social-platforms';
import { SocialIcon } from '../social/SocialIcon';
import type { ThemeFooterProps } from '../theme-packs/theme-pack.types';
import type {
  AcademyAddress,
  WebsiteCorePageType,
  WebsiteFooterLink,
  WebsitePage,
} from '@types';

const TOP_CATEGORIES = 5;

export interface FooterLinkModel {
  readonly key: string;
  readonly label: string;
  /** The real path or URL — on the public site only. */
  readonly href?: string;
  /** The page a preview navigates to (no `href` in previews). */
  readonly pageId?: string;
  /** Tenant-written text (a category name) keeps its own direction. */
  readonly autoDir?: boolean;
}

/** A social link: drawn as its platform's icon, named by the platform. */
export interface FooterSocialLinkModel extends FooterLinkModel {
  /** Absent for a legacy link that names no known platform (generic icon). */
  readonly platform?: SocialPlatform;
  /** The accessible name: the platform's name, else the link's own label. */
  readonly name: string;
}

export type FooterGroupKind = 'owner' | 'learning' | 'categories' | 'help';

export interface FooterGroupModel {
  readonly key: string;
  readonly kind: FooterGroupKind;
  readonly title: string;
  readonly links: readonly FooterLinkModel[];
}

export interface FooterContactModel {
  readonly email?: string;
  readonly phone?: string;
  readonly address?: string;
}

export interface WebsiteFooterModel {
  readonly name: string;
  readonly logo?: string;
  /** The Academy's own words about itself, in the visitor's language where written. */
  readonly description?: string;
  /** Where the name/logo leads (Home), when Home is a visible page. */
  readonly home?: {
    readonly href?: string;
    readonly pageId?: string;
    readonly label: string;
  };
  /** Link groups in display order: the Owner's, Learning, categories, Help. */
  readonly groups: readonly FooterGroupModel[];
  readonly contact?: FooterContactModel;
  readonly social: readonly FooterSocialLinkModel[];
  readonly copyright: string;
}

export function formatAcademyAddress(
  address: AcademyAddress | undefined
): string {
  if (!address) return '';
  return [
    address.street,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(', ');
}

function findPage(
  pages: readonly WebsitePage[],
  coreType: WebsiteCorePageType
): WebsitePage | undefined {
  // `pages` is what the site shows: the public runtime receives visible
  // pages only, and a preview shows the Owner's whole site.
  return pages.find((page) => page.coreType === coreType);
}

/** Theme-specific group titles (Riwaq calls categories "Departments"). */
export type FooterGroupTitles = Partial<Record<FooterGroupKind, string>>;

export function useWebsiteFooterModel(
  props: ThemeFooterProps,
  titles: FooterGroupTitles = {}
): WebsiteFooterModel {
  const {
    academyId,
    academyName,
    academyLogo,
    siteDescription,
    footer,
    pages,
    linkRenderer,
    authState,
  } = props;
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const { data: identity } = useAcademyIdentity(academyId);
  const { data: categoryData } = usePublicCourseCategories(academyId);
  const currentYear = useCurrentYear();
  const isPublic = !!linkRenderer;

  const toLinkModel = (link: WebsiteFooterLink): FooterLinkModel | null => {
    const href = resolveWebsiteCtaHref(link, pages);
    // On the public site a link whose target resolves to nothing (a hidden
    // or deleted page) is left out rather than shown as a dead control.
    if (isPublic && !href) return null;
    return {
      key: link.id,
      label: resolveLocalizedText(link.label, locale),
      href: isPublic ? href : undefined,
      pageId: link.pageId,
    };
  };
  const toLinkModels = (links: readonly WebsiteFooterLink[]) =>
    links
      .map(toLinkModel)
      .filter((link): link is FooterLinkModel => link !== null);

  const ownerGroups: FooterGroupModel[] = footer.groups
    .map((group) => ({
      key: `owner-${group.id}`,
      kind: 'owner' as const,
      title: resolveLocalizedText(group.title, locale),
      links: toLinkModels(group.links),
    }))
    .filter((group) => group.links.length > 0);

  // What the Owner already links to (in any group or the social row), so
  // the derived groups never repeat it.
  const linkedTargets = new Set(
    [...footer.groups.flatMap((group) => group.links), ...footer.socialLinks]
      .map((link) => resolveWebsiteCtaHref(link, pages))
      .filter((href): href is string => !!href)
  );

  const pageLink = (
    coreType: WebsiteCorePageType,
    label: string
  ): FooterLinkModel | null => {
    const page = findPage(pages, coreType);
    const path = page ? resolvePagePath(page) : undefined;
    if (!page || !path || linkedTargets.has(path)) return null;
    return {
      key: `page-${coreType}`,
      label,
      href: isPublic ? path : undefined,
      pageId: page.id,
    };
  };
  /** A learner destination that exists on every Academy site. */
  const routeLink = (key: string, label: string, href: string) => ({
    key,
    label,
    href: isPublic ? href : undefined,
  });

  const learningLinks = [
    pageLink('courses', t('website:chrome.browseCourses')),
    routeLink('my-learn', t('website:chrome.myLearn'), myLearnHref(authState)),
    // Signed in: their certificates. Signed out: the way in.
    authState
      ? routeLink(
          'certificates',
          t('website:chrome.certificates'),
          LEARNER_ROUTES.certificates
        )
      : linkedTargets.has('/sign-up')
        ? null
        : routeLink(
            'create-account',
            t('website:chrome.createAccount'),
            '/sign-up'
          ),
  ].filter((link): link is FooterLinkModel => link !== null);

  const helpLinks = [
    pageLink('faqs', t('website:chrome.faqs')),
    pageLink('contact', t('website:chrome.contactUs')),
  ].filter((link): link is FooterLinkModel => link !== null);

  const categories =
    (categoryData?.length ?? 0) >= MIN_COURSE_CATEGORIES
      ? categoryData!.slice(0, TOP_CATEGORIES)
      : [];
  const categoryLinks: FooterLinkModel[] = categories.map((category) => ({
    key: `category-${category.id}`,
    label: category.name,
    href: isPublic
      ? resolveCatalogHref(pages, { category: category.id })
      : undefined,
    autoDir: true,
  }));

  const derivedGroups: FooterGroupModel[] = [
    {
      key: 'learning',
      kind: 'learning',
      title: titles.learning ?? t('website:chrome.learning'),
      links: learningLinks,
    },
    {
      key: 'categories',
      kind: 'categories',
      title: titles.categories ?? t('website:chrome.topCategories'),
      links: categoryLinks,
    },
    {
      key: 'help',
      kind: 'help',
      title: titles.help ?? t('website:chrome.help'),
      links: helpLinks,
    },
  ];
  const groups = [...ownerGroups, ...derivedGroups].filter(
    (group) => group.links.length > 0
  );

  const address = formatAcademyAddress(identity?.address);
  const contact: FooterContactModel | undefined =
    identity?.contactEmail || identity?.contactPhone || address
      ? {
          email: identity?.contactEmail || undefined,
          phone: identity?.contactPhone || undefined,
          address: address || undefined,
        }
      : undefined;

  const homePage = findPage(pages, 'home');
  const home = homePage
    ? {
        href: isPublic ? resolvePagePath(homePage) : undefined,
        pageId: homePage.id,
        label: t('website:chrome.homeLink', { name: academyName }),
      }
    : undefined;

  const description =
    resolveLocalizedText(siteDescription, locale).trim() ||
    identity?.description?.trim() ||
    undefined;

  return {
    name: academyName,
    logo: academyLogo,
    description,
    home,
    groups,
    contact,
    social: footer.socialLinks.flatMap((link) => {
      const model = toLinkModel(link);
      if (!model) return [];
      const platform = resolveSocialPlatform(link);
      return [
        {
          ...model,
          platform,
          name: platform ? SOCIAL_PLATFORM_NAMES[platform] : model.label,
        },
      ];
    }),
    copyright:
      resolveLocalizedText(footer.copyrightText, locale) ||
      `© ${currentYear} ${academyName}`,
  };
}

/**
 * Renders one footer link: a real link on the public site, a page-switching
 * button in previews, plain text where there is nowhere to go.
 */
export function renderFooterLink(
  link: FooterLinkModel,
  className: string,
  {
    linkRenderer,
    onNavigate,
  }: Pick<ThemeFooterProps, 'linkRenderer' | 'onNavigate'>
): JSX.Element {
  const label = link.autoDir ? (
    <span dir="auto">{link.label}</span>
  ) : (
    link.label
  );
  if (!link.href && !link.pageId) {
    // Nowhere to go here (a preview, or a category with no catalogue):
    // shown as text, not as a control that does nothing.
    return <span className={className}>{label}</span>;
  }
  if (link.href && linkRenderer) {
    return linkRenderer({
      href: link.href,
      external: isExternalHref(link.href),
      className,
      children: label,
    });
  }
  return (
    <button
      type="button"
      className={className}
      onClick={link.pageId ? () => onNavigate(link.pageId!) : undefined}
    >
      {label}
    </button>
  );
}

/**
 * A social link as an icon-only control named by its platform (an
 * unidentified legacy link keeps its label as the name). The theme sizes
 * and colours it; the mark is `currentColor`.
 */
export function renderFooterSocialLink(
  link: FooterSocialLinkModel,
  className: string,
  iconClassName: string,
  { linkRenderer }: Pick<ThemeFooterProps, 'linkRenderer'>
): JSX.Element {
  const icon = (
    <SocialIcon platform={link.platform} className={iconClassName} />
  );
  if (link.href && linkRenderer) {
    return linkRenderer({
      href: link.href,
      external: isExternalHref(link.href),
      className,
      ariaLabel: link.name,
      children: icon,
    });
  }
  // Previews: the icon as it will look, not a link.
  return (
    <span className={className} role="img" aria-label={link.name}>
      {icon}
    </span>
  );
}

/**
 * The Academy's name as a link to its Home (as in the header), only while
 * Home is a visible page; plain text otherwise.
 */
export function renderFooterHomeLink(
  model: WebsiteFooterModel,
  children: React.ReactNode,
  className: string | undefined,
  {
    linkRenderer,
    onNavigate,
  }: Pick<ThemeFooterProps, 'linkRenderer' | 'onNavigate'>
): JSX.Element {
  const { home } = model;
  if (home?.href && linkRenderer) {
    return linkRenderer({
      href: home.href,
      external: false,
      className,
      ariaLabel: home.label,
      children,
    });
  }
  if (home && !linkRenderer) {
    return (
      <button
        type="button"
        className={className}
        aria-label={home.label}
        onClick={() => onNavigate(home.pageId!)}
      >
        {children}
      </button>
    );
  }
  return <>{children}</>;
}

/** An email address that wraps only after its "@", never mid-word. */
export function FooterEmail({
  email,
}: {
  readonly email: string;
}): JSX.Element {
  const [local, ...domain] = email.split('@');
  return (
    <>
      {local}@<wbr />
      {domain.join('@')}
    </>
  );
}

/** `tel:` keeps only digits and a leading "+". */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
