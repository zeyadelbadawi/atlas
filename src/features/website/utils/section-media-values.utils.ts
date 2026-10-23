/**
 * CMS phase 3d (batch A) — the two section values that are not plain text:
 * a `video` section's YouTube video id and a `countdown` section's deadline
 * (batch D adds a `downloads` item's link).
 *
 * Mirrors the backend's `section-media-values.util.ts` exactly; the shared
 * parity cases (`schemas/__parity__`) prove both accept and refuse the same
 * values. Deliberately not `@/shared/utils/youtube.utils` (the lessons'
 * parser): that one reads a `v` parameter on any path and an id followed by
 * more characters, which the API refuses here.
 */
import {
  COUNTDOWN_DEADLINE_PATTERN,
  MEDIA_ASSET_PATH_PATTERN,
  YOUTUBE_VIDEO_ID_PATTERN,
} from '../constants/website.constants';
import { isSafeExternalUrl } from './url-safety.utils';

/** The hosts a YouTube link may use (after `www.` / `m.` / `music.`). */
const YOUTUBE_HOSTS: ReadonlySet<string> = new Set([
  'youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
]);
/** `/embed/ID`, `/shorts/ID`, `/live/ID`, `/v/ID`, then nothing or a separator. */
const PATH_ID_PATTERN =
  /^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})(?:[/?#]|$)/;

/**
 * The 11-character video id of a YouTube link in any common form
 * (`watch?v=`, `youtu.be/`, `shorts/`, `embed/`, `live/`, with or without
 * `https://`, `www.` or `m.`), or of a bare id; `null` for anything else.
 */
export function toYouTubeVideoId(raw: string): string | null {
  const text = raw.trim();
  if (YOUTUBE_VIDEO_ID_PATTERN.test(text)) return text;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(text)
    ? text
    : `https://${text}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase().replace(/^(?:www|m|music)\./, '');
  if (!YOUTUBE_HOSTS.has(host)) return null;
  if (host === 'youtu.be') {
    const first = url.pathname.split('/').filter(Boolean)[0] ?? '';
    return YOUTUBE_VIDEO_ID_PATTERN.test(first) ? first : null;
  }
  if (url.pathname === '/watch') {
    const id = url.searchParams.get('v') ?? '';
    return YOUTUBE_VIDEO_ID_PATTERN.test(id) ? id : null;
  }
  return PATH_ID_PATTERN.exec(url.pathname)?.[1] ?? null;
}

/** What a `videoId` field holds once parsed: a pasted link becomes its id; anything else is checked as typed. */
export function normalizeYouTubeVideoInput(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return toYouTubeVideoId(value) ?? value.trim();
}

/** Empty (no video chosen yet) or an 11-character id. */
export function isYouTubeVideoIdOrEmpty(value: string): boolean {
  return value === '' || YOUTUBE_VIDEO_ID_PATTERN.test(value);
}

/** Whether a stored value is a usable video id (the public site draws the section only then). */
export function isYouTubeVideoId(value: string | undefined): value is string {
  return !!value && YOUTUBE_VIDEO_ID_PATTERN.test(value);
}

/** YouTube's own poster for a video (480×360), used when no poster was uploaded. */
export function youTubePosterUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * The privacy-enhanced player for a video, started at once — built only
 * after the visitor pressed play, and only from a vetted id.
 */
export function youTubeAutoplayEmbedUrl(videoId: string): string | undefined {
  if (!YOUTUBE_VIDEO_ID_PATTERN.test(videoId)) return undefined;
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
}

/**
 * An ISO 8601 date and time with its offset that names a real moment: the
 * calendar date exists (no 30 February), the time is a real time, and the
 * offset is one the world uses (at most ±14:00).
 */
export function isCountdownDeadline(value: string): boolean {
  const match = COUNTDOWN_DEADLINE_PATTERN.exec(value);
  if (!match) return false;
  const [
    ,
    year,
    month,
    day,
    hour,
    minute,
    second,
    ,
    offsetHours,
    offsetMinutes,
  ] = match;
  const y = Number(year);
  const mo = Number(month);
  const d = Number(day);
  if (mo < 1 || mo > 12 || d < 1) return false;
  if (d > new Date(Date.UTC(y, mo, 0)).getUTCDate()) return false;
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second ?? 0) > 59) {
    return false;
  }
  if (offsetHours !== undefined) {
    if (Number(offsetMinutes) > 59) return false;
    if (Number(offsetHours) * 60 + Number(offsetMinutes) > 14 * 60) {
      return false;
    }
  }
  return !Number.isNaN(Date.parse(value));
}

/** Empty (no deadline chosen yet) or a valid deadline. */
export function isCountdownDeadlineOrEmpty(value: string): boolean {
  return value === '' || isCountdownDeadline(value);
}

/** A media-library file (`/api/v1/public/media/…`, served from this site's own origin). */
export function isMediaLibraryLink(value: string): boolean {
  return MEDIA_ASSET_PATH_PATTERN.test(value);
}

/**
 * CMS phase 3d (batch D) — a `downloads` item's link: a media-library file
 * (PDFs included) or an http(s) address `isSafeExternalUrl` allows (e.g.
 * Google Drive). Not `mailto:`/`tel:`: those are not downloads. Empty is a
 * link not added yet (it saves; the public site leaves the item out).
 */
export function isDownloadLinkOrEmpty(value: string): boolean {
  if (value === '') return true;
  if (isMediaLibraryLink(value)) return true;
  if (!isSafeExternalUrl(value)) return false;
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}
