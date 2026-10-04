/**
 * Application entry point.
 *
 * Responsible for one thing only: loading runtime configuration and mounting the
 * React tree. Console logging is deliberately absent — the Atlas Constitution
 * forbids console statements in production code, and configuration failures are
 * handled by falling back to compiled defaults rather than by logging.
 */
import { startTransition } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import type { DehydratedState } from '@tanstack/react-query';
import App from './App.tsx';
// The theme stylesheets must come before `index.css` (Tailwind): their
// rules lose to utilities of equal specificity by coming first, as they did
// when the whole app was one bundle. Their modules are lazy now, so without
// these imports Vite would ship them in a chunk stylesheet that loads after
// `index.css` and overrides the utilities (Reports/LCP_ROOT_CAUSE.md §8).
import './features/website/modern-education/modern-education.css';
// Atelier (Theme 2): in the entry stylesheet too, so a server-rendered
// Atelier page is styled at first paint instead of when its chunk arrives.
import './features/website/atelier/atelier.css';
import './features/website/atelier/atelier-sections.css';
import './features/website/atelier/atelier-pages.css';
import './features/website/atelier/atelier-cinematic.css';
import './features/website/brand-studio/brand-studio.css';
import './index.css';
import { loadRuntimeConfig } from './lib/config.ts';
import { completeLoadedLanguages, preloadLanguages } from '@localization';
import { ENV } from '@config';
import { startPublicWebsitePrefetch } from '@services';
import { getCurrentPublicWebsiteContext, publicWebsiteLookupKey } from '@utils';
import { languagesForFirstRender } from './app/providers/localization/initial-language';
import {
  SSR_PAYLOAD_ELEMENT_ID,
  SSR_PAYLOAD_VERSION,
  type SsrPayload,
} from './ssr/ssr-document';
import { publicWebsiteLocaleForPath } from './ssr/ssr-paths';
import { preloadPublicWebsiteRouter } from './app/routes/public-website-router-loader';

/** Id of the mount node declared in `index.html`. */
const ROOT_ELEMENT_ID = 'root';

/**
 * True for prerendered blog pages.
 *
 * Those pages are served as self-contained static HTML for crawlers, so React
 * must not mount over them and replace the indexable markup.
 */
function isPrerenderedStaticPage(): boolean {
  return (
    document
      .querySelector('meta[name="prerender-static-page"]')
      ?.getAttribute('content') === 'blog'
  );
}

/**
 * The data a server-rendered public page was rendered with
 * (Reports/SSR_ARCHITECTURE_ANALYSIS.md §5), or null for every other page
 * — which then mounts exactly as before.
 */
function readSsrPayload(): SsrPayload | null {
  const element = document.getElementById(SSR_PAYLOAD_ELEMENT_ID);
  if (!element?.textContent) return null;
  try {
    const payload = JSON.parse(element.textContent) as SsrPayload;
    return payload.v === SSR_PAYLOAD_VERSION ? payload : null;
  } catch {
    return null;
  }
}

async function initializeApp(): Promise<void> {
  if (isPrerenderedStaticPage()) return;

  try {
    await loadRuntimeConfig();
  } catch {
    // A missing or malformed runtime config must never block startup: the
    // configuration layer already falls back to its compiled defaults.
  }

  // On an Academy website, start its code and its data now, in parallel
  // with the translations, instead of one after another once the app has
  // rendered (Reports/LCP_ROOT_CAUSE.md, fix B). The route's own lazy()
  // import and data hooks pick these up.
  const websiteContext = getCurrentPublicWebsiteContext(
    ENV.platformBaseDomain,
    ENV.isDevelopment
  );
  const isAcademyWebsite = websiteContext.mode === 'academy-website';
  // A server-rendered page brings its data; only then is it hydrated.
  const ssr = isAcademyWebsite ? readSsrPayload() : null;
  // An Academy website renders in its URL locale from the first render
  // (server and browser alike); the dashboard keeps the preference.
  const urlLocale = publicWebsiteLocaleForPath(window.location.pathname);

  const routerChunk = isAcademyWebsite
    ? preloadPublicWebsiteRouter().catch(() => undefined)
    : undefined;
  if (isAcademyWebsite && !ssr) {
    startPublicWebsitePrefetch(publicWebsiteLookupKey(websiteContext));
  }

  try {
    // Only the language(s) this page shows are downloaded (P-2); load them
    // before mounting so nothing renders untranslated.
    await preloadLanguages(
      isAcademyWebsite
        ? [urlLocale]
        : languagesForFirstRender(window.location.pathname),
      // An Academy website renders with its core namespaces; the rest
      // follows after the first render (Reports/LCP_ROOT_CAUSE.md, fix D).
      isAcademyWebsite ? 'core' : 'full'
    );
  } catch {
    // A failed chunk load must not block startup; the provider retries
    // when it applies the language.
  }

  const rootElement = document.getElementById(ROOT_ELEMENT_ID);
  if (!rootElement) return;

  if (ssr && rootElement.hasChildNodes()) {
    // The route's code first, so hydration does not wait on it.
    await routerChunk;
    // In a transition, hydration is time-sliced: React 18 otherwise
    // hydrates the whole page in one blocking task. The page is already
    // painted from the server, so nothing waits on it visually.
    startTransition(() => {
      hydrateRoot(
        rootElement,
        <App
          initialLanguage={ssr.locale}
          dehydratedState={ssr.queries as DehydratedState}
          hydrationSnapshot={{
            renderYear: ssr.renderYear,
            consentDecided: ssr.consentDecided,
          }}
        />,
        {
          // React recovers from a mismatch by rendering that part again in
          // the browser. Still correct for the visitor, but a defect: mark
          // it where the SSR tests look, and keep React's own reporting.
          onRecoverableError(error) {
            rootElement.dataset.hydrationRecovered = 'true';
            if (typeof window.reportError === 'function')
              window.reportError(error);
          },
        }
      );
    });
  } else {
    createRoot(rootElement).render(
      <App initialLanguage={isAcademyWebsite ? urlLocale : undefined} />
    );
  }

  // Real-user monitoring (P6): off unless the build sets a sample rate.
  // When on, a small module loads after the first render, and only sampled
  // visits download the measuring library.
  if (ENV.rumSampleRate > 0) {
    const surface = websiteContext.mode;
    void import('./lib/rum/rum').then(({ startRum }) =>
      startRum({
        sampleRate: ENV.rumSampleRate,
        apiBaseUrl: ENV.apiBaseUrl,
        surface,
      })
    );
  }

  if (websiteContext.mode === 'academy-website') {
    // The rest of the translations, once the page has painted.
    const completeTranslations = () => void completeLoadedLanguages();
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(completeTranslations, { timeout: 2000 });
    } else {
      setTimeout(completeTranslations, 1);
    }
  }
}

void initializeApp();
