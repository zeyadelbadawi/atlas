/**
 * Page hero illustrations (owner request, 21 Oct 2026): one 3D illustration
 * per marketing page in the brand navy and gold, generated with Magnific,
 * background removed so it sits on the hero ground in light and dark mode.
 *
 * Decorative: the heading beside it carries the meaning, so the image has an
 * empty `alt` and is hidden from assistive tech; it holds no text, so it needs
 * no Arabic version and does not mirror in RTL. Explicit dimensions keep the
 * layout from shifting; three WebP widths keep it light (≤ 70 KB at 1080w).
 *
 * Files: public/marketing-assets/heroes/v1/<name>-<width>w.webp. The folder is
 * versioned so a redrawn set gets a new path instead of a stale cache.
 */
import { cn } from '@/shared/utils/class-name.utils';

export type HeroArtName =
  | 'features'
  | 'pricing'
  | 'security'
  | 'about'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'not-found'
  // M1b product pages.
  | 'academy-website'
  | 'payments'
  | 'content-protection'
  | 'teams-and-academies'
  | 'quizzes-and-certificates'
  // B3 — the resources hub and the multi-academy solution page.
  | 'resources'
  | 'multi-academy';

const ROOT = '/marketing-assets/heroes/v1';
export const HERO_ART_WIDTHS = [480, 768, 1080] as const;

export function HeroArt({
  name,
  className,
  sizes = '(min-width: 1024px) 40vw, (min-width: 640px) 60vw, 90vw',
  hiddenOnPhones = false,
}: {
  name: HeroArtName;
  className?: string;
  sizes?: string;
  /**
   * The page hides the art on small screens (`display: none`). Lazy loading
   * then keeps phones from downloading an image they never show.
   */
  hiddenOnPhones?: boolean;
}) {
  const base = `${ROOT}/${name}`;
  return (
    <img
      src={`${base}-1080w.webp`}
      srcSet={HERO_ART_WIDTHS.map((w) => `${base}-${w}w.webp ${w}w`).join(', ')}
      sizes={sizes}
      width={1080}
      height={810}
      alt=""
      aria-hidden="true"
      loading={hiddenOnPhones ? 'lazy' : 'eager'}
      decoding="async"
      draggable={false}
      data-hero-art={name}
      className={cn('mk-rise mk-rise-delay block h-auto w-full select-none', className)}
    />
  );
}
