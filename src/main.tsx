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
import './index.css';
import { loadRuntimeConfig } from './lib/config.ts';
import { preloadLanguages } from '@localization';
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

  try {
    // Only the language(s) this page shows are downloaded (P-2); load them
    // before mounting so nothing renders untranslated.
    await preloadLanguages(languagesForFirstRender(window.location.pathname));
  } catch {
    // A failed chunk load must not block startup; the provider retries
    // when it applies the language.
  }

  const rootElement = document.getElementById(ROOT_ELEMENT_ID);
  if (!rootElement) return;

  createRoot(rootElement).render(<App />);
}

void initializeApp();
