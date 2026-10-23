/**
 * CMS phase 3d (batch D) — what the timeline, video reviews, downloads and
 * certificates sections show, resolved from their config for one locale:
 * the data half of the shared bodies (`TimelineList`, `VideoReviewGrid`,
 * `DownloadList`, `CertificateGrid`), kept apart from the components so each
 * theme's renderer can decide whether there is anything to draw before it
 * draws its frame.
 */
import {
  hasRenderableImage,
  resolveImageUrl,
} from '@/features/website/theme-assets';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import {
  isDownloadLinkOrEmpty,
  isMediaLibraryLink,
  isYouTubeVideoId,
} from '@/features/website/utils/section-media-values.utils';
import { FEATURE_ICON_OPTIONS } from '@/features/website/constants/website.constants';
import type {
  CertificatesSectionConfig,
  DownloadsSectionConfig,
  PublicWebsiteLocale,
  TimelineSectionConfig,
  VideoTestimonialsSectionConfig,
} from '@types';

/* ------------------------------------------------------------------ */
/* Timeline                                                             */
/* ------------------------------------------------------------------ */

export interface ResolvedMilestone {
  readonly id: string;
  readonly title: string;
  readonly period: string;
  readonly description: string;
  /** A curated icon name, or `undefined` (the theme shows the number). */
  readonly icon?: string;
}

/** The milestones a visitor sees, in the Owner's order (one without a title is left out). */
export function resolveTimeline(
  config: TimelineSectionConfig,
  locale: PublicWebsiteLocale
): ResolvedMilestone[] {
  return (config.items ?? [])
    .map((item) => ({
      id: item.id,
      title: resolveLocalizedText(item.title, locale),
      period: resolveLocalizedText(item.period, locale),
      description: resolveLocalizedText(item.description, locale),
      icon:
        item.icon && FEATURE_ICON_OPTIONS.includes(item.icon)
          ? item.icon
          : undefined,
    }))
    .filter((item) => item.title);
}

/* ------------------------------------------------------------------ */
/* Video reviews                                                        */
/* ------------------------------------------------------------------ */

export interface ResolvedVideoReview {
  readonly id: string;
  /** Empty only in previews (a starter review without its video yet). */
  readonly videoId: string;
  readonly name: string;
  readonly role: string;
  readonly quote: string;
  readonly poster?: string;
  readonly sample: boolean;
}

/**
 * The reviews a visitor sees. The public site leaves out samples (the API
 * strips them too) and any review without a video; a preview keeps both, so
 * the Owner sees the starter cards they still have to replace.
 */
export function resolveVideoReviews(
  config: VideoTestimonialsSectionConfig,
  locale: PublicWebsiteLocale,
  isPublic: boolean
): ResolvedVideoReview[] {
  return (config.items ?? [])
    .filter((item) => !(isPublic && item.sample))
    .map((item) => ({
      id: item.id,
      videoId: isYouTubeVideoId(item.videoId) ? item.videoId : '',
      name: item.name?.trim() ?? '',
      role: resolveLocalizedText(item.role, locale),
      quote: resolveLocalizedText(item.quote, locale),
      poster: hasRenderableImage(item.poster) ? item.poster : undefined,
      sample: item.sample === true,
    }))
    .filter((item) => item.name && (item.videoId || !isPublic));
}

/* ------------------------------------------------------------------ */
/* Downloads                                                            */
/* ------------------------------------------------------------------ */

/** The file kinds a download's icon and spoken type distinguish. */
export type DownloadKind =
  'pdf' | 'document' | 'sheet' | 'slides' | 'image' | 'archive' | 'file';

const KIND_BY_EXTENSION: Readonly<Record<string, DownloadKind>> = {
  pdf: 'pdf',
  doc: 'document',
  docx: 'document',
  odt: 'document',
  rtf: 'document',
  txt: 'document',
  xls: 'sheet',
  xlsx: 'sheet',
  csv: 'sheet',
  ods: 'sheet',
  ppt: 'slides',
  pptx: 'slides',
  odp: 'slides',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  webp: 'image',
  gif: 'image',
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
};

/** The extension at the end of a link's path ("notes.pdf?dl=1" → "pdf"), lower-case, or ''. */
function extensionOf(href: string): string {
  const path = href.split(/[?#]/)[0] ?? '';
  const match = /\.([a-z0-9]{1,5})$/i.exec(path);
  return match ? match[1].toLowerCase() : '';
}

export interface ResolvedDownload {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** Empty only in previews (a link not added yet). */
  readonly href: string;
  /** A file from this site's own media library: downloadable in place. */
  readonly sameOrigin: boolean;
  readonly kind: DownloadKind;
  /** What the visitor reads and hears as the type ("PDF"); '' when unknown. */
  readonly typeLabel: string;
  readonly size: string;
}

/**
 * The downloads a visitor sees, in the Owner's order. A link that is not a
 * media-library file or a safe http(s) address is never drawn as one; the
 * public site leaves out an item without a link, a preview keeps it.
 */
export function resolveDownloads(
  config: DownloadsSectionConfig,
  locale: PublicWebsiteLocale,
  isPublic: boolean
): ResolvedDownload[] {
  return (config.items ?? [])
    .map((item) => {
      const raw = item.url?.trim() ?? '';
      const href = raw && isDownloadLinkOrEmpty(raw) ? raw : '';
      const extension = extensionOf(href);
      const typed = item.fileType?.trim() ?? '';
      return {
        id: item.id,
        title: resolveLocalizedText(item.title, locale),
        description: resolveLocalizedText(item.description, locale),
        href,
        sameOrigin: isMediaLibraryLink(href),
        kind:
          KIND_BY_EXTENSION[typed.toLowerCase()] ??
          KIND_BY_EXTENSION[extension] ??
          'file',
        typeLabel: typed || (extension ? extension.toUpperCase() : ''),
        size: item.fileSize?.trim() ?? '',
      };
    })
    .filter((item) => item.title && (item.href || !isPublic));
}

/* ------------------------------------------------------------------ */
/* Certificates                                                         */
/* ------------------------------------------------------------------ */

export interface ResolvedCertificate {
  readonly id: string;
  readonly image: string;
  /** The image at full size, for a plain new-tab link; absent when it has no address of its own (a legacy inline upload). */
  readonly fullSizeHref?: string;
  readonly title: string;
  readonly issuer: string;
  /** The year in the visitor's digits ("2025", "٢٠٢٥"). */
  readonly year: string;
  /** The year as typed, for `<time dateTime>`. */
  readonly yearValue: string;
}

const yearFormatters = new Map<PublicWebsiteLocale, Intl.NumberFormat>();

function formatYear(value: string, locale: PublicWebsiteLocale): string {
  let formatter = yearFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      useGrouping: false,
    });
    yearFormatters.set(locale, formatter);
  }
  return formatter.format(Number(value));
}

/** The certificates a visitor sees (an entry without an image or a title is left out). */
export function resolveCertificates(
  config: CertificatesSectionConfig,
  locale: PublicWebsiteLocale
): ResolvedCertificate[] {
  return (config.items ?? [])
    .filter((item) => hasRenderableImage(item.image))
    .map((item) => {
      const url = resolveImageUrl(item.image);
      const yearValue = /^\d{4}$/.test(item.year ?? '') ? item.year! : '';
      return {
        id: item.id,
        image: item.image,
        fullSizeHref: url && !url.startsWith('data:') ? url : undefined,
        title: resolveLocalizedText(item.title, locale),
        issuer: resolveLocalizedText(item.issuer, locale),
        year: yearValue ? formatYear(yearValue, locale) : '',
        yearValue,
      };
    })
    .filter((item) => item.title);
}
