/**
 * Loads the public website's route tree (its own chunk) and remembers it.
 *
 * `main.tsx` and the server renderer call `preloadPublicWebsiteRouter()`
 * before rendering, so `AppRouter` renders the tree directly, without
 * `lazy()` and without a Suspense boundary. That matters for a
 * server-rendered page: `hydrateRoot` always leaves a Suspense boundary's
 * content for a later, lower-priority pass, and the providers above it
 * (identity, consent, localization) update their state as soon as the
 * shell commits — React then discards the boundary's server HTML and
 * renders it again in the browser (React error #421).
 */
import type { ComponentType } from 'react';
import type { PublicWebsiteRouterProps } from '@features/public-website';

type PublicWebsiteRouterComponent = ComponentType<PublicWebsiteRouterProps>;

let loaded: PublicWebsiteRouterComponent | undefined;

/** Starts (or joins) the chunk's download. */
export function preloadPublicWebsiteRouter(): Promise<PublicWebsiteRouterComponent> {
  return import('@features/public-website/PublicWebsiteRouter').then(
    (module) => {
      loaded = module.default;
      return module.default;
    }
  );
}

/** The route tree if its chunk has already arrived. */
export function loadedPublicWebsiteRouter():
  PublicWebsiteRouterComponent | undefined {
  return loaded;
}
