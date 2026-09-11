/**
 * Recommended image sizes, derived from what the renderer ACTUALLY draws.
 *
 * WHY NOT ONE UNIVERSAL SIZE. A single "1920×1080 for everything" hint is
 * wrong in both directions at once: it makes someone upload a 2 MB photo
 * for a 64 px round avatar, and it under-specifies a full-bleed hero on a
 * large display. Every entry below is traced to the component that renders
 * it and to the largest container width a theme can select
 * (`WEBSITE_CONTAINER_WIDTH_VALUES.wide` = 90rem = 1440 CSS px).
 *
 * THE ×2 RULE. CSS pixels are not device pixels. Every recommendation is
 * roughly twice its largest CSS rendering so it stays sharp on retina
 * laptops, high-DPI phones and the projector/large-display cases where
 * these sites get shown in a classroom. Going beyond ×2 costs page weight
 * for no visible gain.
 *
 * TRANSPARENCY. Only logos and favicons need it, and that is the only
 * reason those entries call for PNG/SVG over JPEG — photographic content
 * should stay JPEG or WebP, which are dramatically smaller at the same
 * perceived quality.
 */

/** The semantic role of an image, not the field it happens to live in. */
export type WebsiteImagePurpose =
  | 'hero'
  | 'heroSide'
  | 'sectionImage'
  | 'gallery'
  | 'avatar'
  | 'cardThumbnail'
  | 'ogImage'
  | 'logo'
  | 'darkLogo'
  | 'favicon';

export interface WebsiteImageRecommendation {
  readonly width: number;
  readonly height: number;
  /** Human-readable ratio, e.g. `16:9`. */
  readonly ratio: string;
  /** Preferred file formats, most preferred first. */
  readonly formats: readonly string[];
  /** Whether transparency is expected to matter for this role. */
  readonly transparency: boolean;
  /**
   * Why these numbers — kept in code rather than a translation file
   * because it documents the derivation for whoever changes the
   * component next, not for the end user.
   */
  readonly derivation: string;
}

export const WEBSITE_IMAGE_RECOMMENDATIONS: Record<
  WebsseImagePurposeAlias,
  WebsiteImageRecommendation
> = {
  hero: {
    width: 2560,
    height: 1280,
    ratio: '2:1',
    formats: ['JPG', 'WebP'],
    transparency: false,
    derivation:
      'HeroSection background band: full-bleed, up to 28rem (448px) tall, ' +
      'across a container up to 1440 CSS px wide. 1280x640 CSS, doubled.',
  },
  heroSide: {
    width: 1200,
    height: 900,
    ratio: '4:3',
    formats: ['JPG', 'WebP'],
    transparency: false,
    derivation:
      'HeroSection split layout renders aspect-[4/3] in a half-width column ' +
      '(~600 CSS px at the widest container), doubled.',
  },
  sectionImage: {
    width: 1200,
    height: 900,
    ratio: '4:3',
    formats: ['JPG', 'WebP'],
    transparency: false,
    derivation:
      'AboutSection and similar body sections render at roughly half the ' +
      'container width, doubled.',
  },
  gallery: {
    width: 800,
    height: 800,
    ratio: '1:1',
    formats: ['JPG', 'WebP'],
    transparency: false,
    derivation:
      'GallerySection renders aspect-square cells in an auto-fit grid with a ' +
      '8rem (128px) minimum; cells reach ~400 CSS px on wide screens, doubled.',
  },
  avatar: {
    width: 256,
    height: 256,
    ratio: '1:1',
    formats: ['JPG', 'PNG'],
    transparency: false,
    derivation:
      'InstructorsSection and TestimonialsSection render size-16 (64px) round ' +
      'avatars. 256 is 4x, which keeps faces crisp when cropped to a circle.',
  },
  cardThumbnail: {
    width: 800,
    height: 450,
    ratio: '16:9',
    formats: ['JPG', 'WebP'],
    transparency: false,
    derivation:
      'FeaturedCoursesSection renders aspect-video card images at ~400 CSS px ' +
      'wide in a multi-column grid, doubled.',
  },
  ogImage: {
    width: 1200,
    height: 630,
    ratio: '1.91:1',
    formats: ['JPG', 'PNG'],
    transparency: false,
    derivation:
      'Not a rendering size: 1200x630 is the size social platforms and ' +
      'messaging previews expect for og:image. Deviating produces cropped or ' +
      'letterboxed link previews.',
  },
  logo: {
    width: 400,
    height: 96,
    ratio: 'up to ~4:1',
    formats: ['SVG', 'PNG'],
    transparency: true,
    derivation:
      'WebsiteHeader renders the logo at h-8 (32px) with automatic width. ' +
      '96px tall is 3x for high-DPI; SVG avoids the question entirely.',
  },
  darkLogo: {
    width: 400,
    height: 96,
    ratio: 'up to ~4:1',
    formats: ['SVG', 'PNG'],
    transparency: true,
    derivation:
      'Same rendering as the primary logo; supplied separately so it stays ' +
      'legible on dark backgrounds.',
  },
  favicon: {
    width: 512,
    height: 512,
    ratio: '1:1',
    formats: ['PNG', 'SVG'],
    transparency: true,
    derivation:
      'Browsers downscale one source to 16/32/48px tab icons and up to 512px ' +
      'for installed-app icons; 512 is the largest commonly consumed size.',
  },
};

/** Alias kept local so the record above is exhaustively keyed. */
type WebsseImagePurposeAlias = WebsiteImagePurpose;

/**
 * Maps a section field's `key` to its purpose.
 *
 * Section fields are generic (`image`, `avatar`), so the section type is
 * what disambiguates: `hero.image` is a full-bleed band, `about.image` is
 * a body illustration, and they want very different files.
 */
export function resolveSectionImagePurpose(
  sectionType: string,
  fieldKey: string
): WebsiteImagePurpose {
  if (fieldKey === 'avatar') return 'avatar';
  if (sectionType === 'hero') return 'hero';
  if (sectionType === 'gallery') return 'gallery';
  if (sectionType === 'featuredCourses') return 'cardThumbnail';
  return 'sectionImage';
}
