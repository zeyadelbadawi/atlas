import { Link2 } from 'lucide-react';
import type { SocialPlatform } from '@types';
import { SOCIAL_ICON_PATHS } from './social-icon-paths';

/**
 * A platform's mark (or a generic link mark for an unidentified legacy
 * link), decorative: the link around it carries the accessible name.
 */
export function SocialIcon({
  platform,
  className,
}: {
  readonly platform: SocialPlatform | undefined;
  readonly className?: string;
}): JSX.Element {
  if (!platform) {
    return <Link2 className={className} strokeWidth={1.75} aria-hidden />;
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
      data-social-icon={platform}
    >
      <path d={SOCIAL_ICON_PATHS[platform]} />
    </svg>
  );
}
