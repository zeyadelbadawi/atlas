/**
 * CMS phase 3d — the logos section's shared body: what every theme draws
 * (`logos`), with the theme supplying only its classes.
 *
 * A calm, centred grid that wraps on phones: every tile is the same box,
 * so logos of any shape read at an equal height and nothing shifts while
 * they load. No marquee or auto-scroll (motion a visitor cannot pause is
 * an accessibility failure). A linked logo opens in a new tab and says so
 * to screen readers; its accessible name is the logo's alt text.
 */
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';
import {
  ThemeImage,
  hasRenderableImage,
} from '@/features/website/theme-assets';
import type { WebsiteLinkRenderer } from '@/features/website/renderer/website-link-renderer.types';
import type { ResolvedLogo } from './section-bodies.logic';

export interface LogoGridClasses {
  readonly list?: string;
  /** The equal-size box every logo sits in (background, border, focus ring). */
  readonly tile?: string;
  readonly image?: string;
}

export function LogoGrid({
  logos,
  linkRenderer,
  classes = {},
}: {
  readonly logos: readonly ResolvedLogo[];
  /** Present only on the public site; previews draw logos unlinked. */
  readonly linkRenderer?: WebsiteLinkRenderer;
  readonly classes?: LogoGridClasses;
}): JSX.Element {
  const { t } = useTranslation();
  const tileClass = cn(
    'flex h-24 w-full items-center justify-center p-4 sm:h-28 sm:p-5',
    classes.tile
  );
  return (
    <ul
      role="list"
      data-logo-grid=""
      className={cn(
        'flex flex-wrap justify-center gap-3 sm:gap-4',
        classes.list
      )}
    >
      {logos.map((logo) => {
        const image = (
          <ThemeImage
            value={logo.image}
            alt={logo.alt}
            sizes="(min-width: 640px) 176px, 45vw"
            loading="lazy"
            className={cn(
              'max-h-full w-auto max-w-full object-contain',
              classes.image
            )}
          />
        );
        return (
          <li
            key={logo.id}
            // Two to a row on phones; a fixed width from tablets up, so a
            // short last row stays centred instead of stretching.
            className="flex w-[calc(50%-0.375rem)] sm:w-44"
          >
            {logo.href && linkRenderer ? (
              linkRenderer({
                href: logo.href,
                external: true,
                className: tileClass,
                children: (
                  <>
                    {image}
                    <span className="sr-only">
                      {' '}
                      {t('website:renderer.opensInNewTab')}
                    </span>
                  </>
                ),
              })
            ) : (
              <div className={tileClass}>{image}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
