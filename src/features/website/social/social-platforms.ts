/**
 * Social platforms: the one shared catalogue, platform → icon mapping and
 * legacy normalisation. Every theme footer and the CMS read from here;
 * only the presentation (colour, size, chip) belongs to a theme.
 *
 * Legacy links (saved before the platform picker) carry a free-text label
 * and a URL but no `platform`. They are never rewritten or dropped: the
 * platform is inferred when shown — from the label (any case, common
 * spellings, Arabic names), then from the URL's host — and a link neither
 * identifies still renders, with a generic link icon and its own label as
 * the accessible name. Saving it from the CMS with a platform chosen makes
 * it structured.
 */
import {
  SOCIAL_PLATFORMS,
  type SocialPlatform,
  type WebsiteFooterLink,
} from '@types';

export { SOCIAL_PLATFORMS };
export type { SocialPlatform };

/** The platforms' own names — brand names, the same in every language. */
export const SOCIAL_PLATFORM_NAMES: Readonly<Record<SocialPlatform, string>> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  snapchat: 'Snapchat',
  threads: 'Threads',
  discord: 'Discord',
  github: 'GitHub',
};

/** An example address for the CMS's URL field. */
export const SOCIAL_URL_EXAMPLES: Readonly<Record<SocialPlatform, string>> = {
  facebook: 'https://facebook.com/youracademy',
  instagram: 'https://instagram.com/youracademy',
  x: 'https://x.com/youracademy',
  tiktok: 'https://tiktok.com/@youracademy',
  linkedin: 'https://linkedin.com/company/youracademy',
  youtube: 'https://youtube.com/@youracademy',
  whatsapp: 'https://wa.me/201000000000',
  telegram: 'https://t.me/youracademy',
  snapchat: 'https://snapchat.com/add/youracademy',
  threads: 'https://threads.net/@youracademy',
  discord: 'https://discord.gg/youracademy',
  github: 'https://github.com/youracademy',
};

export function isSocialPlatform(value: unknown): value is SocialPlatform {
  return (
    typeof value === 'string' &&
    (SOCIAL_PLATFORMS as readonly string[]).includes(value)
  );
}

/** Labels people typed before the picker existed, normalised (lower case, no spaces/punctuation). */
const LABEL_ALIASES: Readonly<Record<string, SocialPlatform>> = {
  facebook: 'facebook',
  fb: 'facebook',
  فيسبوك: 'facebook',
  فيس: 'facebook',
  instagram: 'instagram',
  insta: 'instagram',
  ig: 'instagram',
  انستغرام: 'instagram',
  انستجرام: 'instagram',
  إنستغرام: 'instagram',
  إنستجرام: 'instagram',
  انستقرام: 'instagram',
  x: 'x',
  twitter: 'x',
  xtwitter: 'x',
  twitterx: 'x',
  تويتر: 'x',
  اكس: 'x',
  إكس: 'x',
  tiktok: 'tiktok',
  تيكتوك: 'tiktok',
  linkedin: 'linkedin',
  لينكدإن: 'linkedin',
  لينكدان: 'linkedin',
  لينكدين: 'linkedin',
  youtube: 'youtube',
  يوتيوب: 'youtube',
  whatsapp: 'whatsapp',
  واتساب: 'whatsapp',
  واتسآب: 'whatsapp',
  واتس: 'whatsapp',
  telegram: 'telegram',
  تيليجرام: 'telegram',
  تلغرام: 'telegram',
  تليجرام: 'telegram',
  تيليغرام: 'telegram',
  snapchat: 'snapchat',
  snap: 'snapchat',
  سنابشات: 'snapchat',
  سناب: 'snapchat',
  threads: 'threads',
  ثريدز: 'threads',
  discord: 'discord',
  ديسكورد: 'discord',
  github: 'github',
  جيتهب: 'github',
};

/** Hosts (and their subdomains) that identify a platform. */
const HOSTS: ReadonlyArray<readonly [string, SocialPlatform]> = [
  ['facebook.com', 'facebook'],
  ['fb.com', 'facebook'],
  ['fb.me', 'facebook'],
  ['instagram.com', 'instagram'],
  ['instagr.am', 'instagram'],
  ['x.com', 'x'],
  ['twitter.com', 'x'],
  ['tiktok.com', 'tiktok'],
  ['linkedin.com', 'linkedin'],
  ['lnkd.in', 'linkedin'],
  ['youtube.com', 'youtube'],
  ['youtu.be', 'youtube'],
  ['wa.me', 'whatsapp'],
  ['whatsapp.com', 'whatsapp'],
  ['t.me', 'telegram'],
  ['telegram.me', 'telegram'],
  ['telegram.org', 'telegram'],
  ['snapchat.com', 'snapchat'],
  ['threads.net', 'threads'],
  ['threads.com', 'threads'],
  ['discord.gg', 'discord'],
  ['discord.com', 'discord'],
  ['github.com', 'github'],
];

function normaliseLabel(label: string): string {
  return (
    label
      .toLowerCase()
      // Arabic diacritics and the tatweel never change which platform it is.
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[\s\-_.()/|،,·]+/g, '')
  );
}

export function platformFromLabel(
  label: string | undefined
): SocialPlatform | undefined {
  if (!label) return undefined;
  const key = normaliseLabel(label);
  // Own keys only: a free-text label such as "constructor" must not reach
  // an inherited Object.prototype member.
  return Object.prototype.hasOwnProperty.call(LABEL_ALIASES, key)
    ? LABEL_ALIASES[key]
    : undefined;
}

export function platformFromUrl(
  url: string | undefined
): SocialPlatform | undefined {
  if (!url) return undefined;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return undefined;
  }
  return HOSTS.find(
    ([domain]) => host === domain || host.endsWith(`.${domain}`)
  )?.[1];
}

/** The link's platform: as saved, else inferred from its label, else from its URL. */
export function resolveSocialPlatform(
  link: Pick<WebsiteFooterLink, 'platform' | 'label' | 'url'>
): SocialPlatform | undefined {
  if (isSocialPlatform(link.platform)) return link.platform;
  return (
    platformFromLabel(link.label?.en) ??
    platformFromLabel(link.label?.ar) ??
    platformFromUrl(link.url)
  );
}

/** A social address must be a web page (http/https). */
export function isValidSocialUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
