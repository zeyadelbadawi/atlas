/**
 * Full-viewport cinematic homepage hero — a deliberate, documented override of
 * the marketing design system's default restraint, scoped to the hero band
 * only. See `design-system/atlas-marketing/MASTER.md` §12 for the rationale
 * and the non-negotiables this component must keep (reduced-motion fallback,
 * muted/decorative video, real DOM copy, guaranteed contrast).
 *
 * The scrim is vertical only (dark at the bottom, clear at the top) rather
 * than a horizontal or corner gradient — that keeps contrast identical in
 * both LTR and RTL without a mirrored variant, and lets copy sit
 * bottom-anchored regardless of where the video's own brightest point is.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AUTH_ROUTES,
  DASHBOARD_ROUTES,
  PUBLIC_ROUTES,
} from '@app/routes/route-paths';
import { useAuth } from '@hooks';
import { RISE_VARIANTS } from '@motion';
import heroPoster from './assets/hero-poster.webp';
import heroVideo from './assets/hero-video.mp4';

export function CinematicHero(): JSX.Element {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const startHref = isAuthenticated
    ? DASHBOARD_ROUTES.root
    : AUTH_ROUTES.register;

  return (
    <section className="relative min-h-[100svh] w-full overflow-hidden bg-[#05120f]">
      {shouldReduceMotion ? (
        <img
          src={heroPoster}
          alt=""
          className="absolute inset-0 -z-20 size-full object-cover"
          aria-hidden
        />
      ) : (
        <video
          className="absolute inset-0 -z-20 size-full object-cover"
          src={heroVideo}
          poster={heroPoster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
        />
      )}

      <span
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/35 to-black/10"
        aria-hidden
      />

      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto w-full max-w-marketing px-5 pb-16 pt-32 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={RISE_VARIANTS}
            className="flex flex-col items-start gap-6"
          >
            <span className="inline-flex items-center rounded-pill border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-white/90 backdrop-blur-sm rtl:tracking-normal">
              {t('home:hero.eyebrow')}
            </span>

            <h1 className="max-w-[22ch] text-balance font-display text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-6xl lg:text-7xl rtl:leading-[1.5] rtl:tracking-normal">
              {t('home:hero.title')}
            </h1>

            <p className="max-w-[52ch] text-base leading-relaxed text-white/80 sm:text-lg">
              {t('home:hero.description')}
            </p>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link to={startHref}>
                  {t('home:hero.primaryAction')}
                  <ArrowRight
                    className="size-4 rtl:-scale-x-100"
                    strokeWidth={2}
                    aria-hidden
                  />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto"
              >
                <Link to={PUBLIC_ROUTES.pricing}>
                  {t('home:hero.secondaryAction')}
                </Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="mt-14 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-white/60 rtl:tracking-normal"
          >
            <span>{t('home:hero.scrollHint')}</span>
            <motion.span
              animate={shouldReduceMotion ? undefined : { y: [0, 6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown className="size-4" strokeWidth={1.75} aria-hidden />
            </motion.span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
