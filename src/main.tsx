/**
 * Application entry point.
 *
 * Responsible for one thing only: loading runtime configuration and mounting the
 * React tree. Console logging is deliberately absent — the Atlas Constitution
 * forbids console statements in production code, and configuration failures are
 * handled by falling back to compiled defaults rather than by logging.
 */
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
// The theme stylesheets must come before `index.css` (Tailwind): their
// rules lose to utilities of equal specificity by coming first, as they did
// when the whole app was one bundle. Their modules are lazy now, so without
// these imports Vite would ship them in a chunk stylesheet that loads after
// `index.css` and overrides the utilities (Reports/LCP_ROOT_CAUSE.md §8).
import './features/website/modern-education/modern-education.css';
import './features/website/brand-studio/brand-studio.css';
import './index.css';
import { loadRuntimeConfig } from './lib/config.ts';
import { completeLoadedLanguages, preloadLanguages } from '@localization';
import { ENV } from '@config';
import { startPublicWebsitePrefetch } from '@services';
import { getCurrentPublicWebsiteContext, publicWebsiteLookupKey } from '@utils';
import { languagesForFirstRender } from './app/providers/localization/initial-language';

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
  if (websiteContext.mode === 'academy-website') {
    void import('@features/public-website/PublicWebsiteRouter').catch(
      () => undefined
    );
    startPublicWebsitePrefetch(publicWebsiteLookupKey(websiteContext));
  }

  try {
    // Only the language(s) this page shows are downloaded (P-2); load them
    // before mounting so nothing renders untranslated.
    await preloadLanguages(
      languagesForFirstRender(window.location.pathname),
      // An Academy website renders with its core namespaces; the rest
      // follows after the first render (Reports/LCP_ROOT_CAUSE.md, fix D).
      websiteContext.mode === 'academy-website' ? 'core' : 'full'
    );
  } catch {
    // A failed chunk load must not block startup; the provider retries
    // when it applies the language.
  }

  const rootElement = document.getElementById(ROOT_ELEMENT_ID);
  if (!rootElement) return;

  createRoot(rootElement).render(<App />);

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
