/**
 * YouTube URL helpers.
 *
 * The lesson content model stays exactly as it was — `contentType: 'video'`
 * + a single opaque `contentUrl: string` (no schema change, no new
 * `videoSource`/`videoProvider` field: confirmed neither exists anywhere
 * in the backend or frontend before this addition). A YouTube video is
 * simply a `contentUrl` whose host and path this file recognizes; the CMS
 * lesson editor and the student lesson player both call `parseYouTubeVideoId`
 * to decide, at render/validation time, whether a given URL needs the
 * `<iframe>` embed path instead of a native `<video>` element — inferred
 * from the URL string itself, never a persisted flag.
 */

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
]);
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^(www|m)\./, '');
}

/** Whether a URL's host is a recognized YouTube domain, regardless of whether a valid video id could be extracted from it — used to give a friendly "that doesn't look like a valid YouTube link" error rather than a generic invalid-URL one. */
export function isYouTubeHost(rawUrl: string): boolean {
  try {
    return YOUTUBE_HOSTS.has(normalizeHost(new URL(rawUrl).hostname));
  } catch {
    return false;
  }
}

/**
 * Extracts the 11-character video id from any of YouTube's real URL
 * shapes: `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/embed/ID`,
 * `youtube.com/shorts/ID`, `youtube.com/live/ID` — with or without
 * `www.`/`m.`, with or without extra query params (playlist position,
 * timestamp, etc.). Returns `null` for anything else, including a
 * YouTube-hosted URL with no resolvable video id (e.g. a bare channel
 * link) — callers distinguish "not YouTube at all" from "YouTube, but not
 * a valid link" via `isYouTubeHost` when they need to.
 */
export function parseYouTubeVideoId(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = normalizeHost(url.hostname);
  if (!YOUTUBE_HOSTS.has(host)) return null;

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return id && VIDEO_ID_PATTERN.test(id) ? id : null;
  }

  const vParam = url.searchParams.get('v');
  if (vParam && VIDEO_ID_PATTERN.test(vParam)) return vParam;

  const pathMatch = /^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/.exec(
    url.pathname
  );
  return pathMatch ? pathMatch[1] : null;
}

/** True for any `contentUrl` this player/CMS should treat as an embedded YouTube video rather than a native `<video src>`. */
export function isYouTubeUrl(rawUrl: string): boolean {
  return parseYouTubeVideoId(rawUrl) !== null;
}

/**
 * The privacy-enhanced (`youtube-nocookie.com`) embed URL for a parsed
 * video id — avoids setting YouTube cookies until the visitor actually
 * presses play, and never exposes the original watch URL or channel
 * details beyond what the player itself shows.
 */
export function buildYouTubeEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({ rel: '0', modestbranding: '1' });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
