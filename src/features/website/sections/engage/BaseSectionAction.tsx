/**
 * A section button in the theme-neutral base renderers (the retired themes):
 * a real link on the public site, an inert button in previews, and nothing
 * on the public site when it goes nowhere yet (a WhatsApp number not typed).
 * An Owner's chosen look (`cta.style`) wins over the position's.
 */
import { Button } from '@/components/ui/button';
import type { WebsiteCta, WebsiteCtaStyle, WebsitePage } from '@types';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import {
  isExternalHref,
  resolveWebsiteCtaHref,
} from '@/features/website/utils/link-resolution.utils';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import type { WebsiteLinkRenderer } from '@/features/website/renderer/website-link-renderer.types';

const VARIANTS: Record<WebsiteCtaStyle, 'default' | 'outline' | 'link'> = {
  primary: 'default',
  secondary: 'outline',
  link: 'link',
};

export function BaseSectionAction({
  cta,
  pages,
  linkRenderer,
  look = 'primary',
}: {
  readonly cta: WebsiteCta | undefined;
  readonly pages: readonly WebsitePage[];
  readonly linkRenderer?: WebsiteLinkRenderer;
  /** The look for the button's position. */
  readonly look?: WebsiteCtaStyle;
}): JSX.Element | null {
  const { locale } = usePublicWebsiteLocale();
  if (!cta) return null;
  const label = resolveLocalizedText(cta.label, locale);
  if (!label) return null;
  const variant = VARIANTS[cta.style ?? look];
  const style =
    variant === 'default'
      ? { backgroundColor: 'var(--website-primary-solid)', color: '#fff' }
      : undefined;
  if (!linkRenderer) {
    return (
      <Button type="button" size="lg" variant={variant} style={style}>
        {label}
      </Button>
    );
  }
  const href = resolveWebsiteCtaHref(cta, pages, locale);
  if (!href) return null;
  return (
    <Button asChild size="lg" variant={variant} style={style}>
      {linkRenderer({ href, external: isExternalHref(href), children: label })}
    </Button>
  );
}
