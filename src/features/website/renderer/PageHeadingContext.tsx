/**
 * Which heading level a page-opening section (a hero or page header) uses.
 *
 * A page has one `<h1>`. `WebsiteRenderer` marks the one opening section
 * that owns it; every other opener on the same page uses `<h2>` (same
 * look, correct outline). Outside a page — a single section previewed on
 * its own — the default keeps `<h1>`, as before.
 */
import { createContext, useContext } from 'react';

/**
 * The sections that open a page with its main title (a hero, a page
 * header): the renderer gives the page's one `<h1>` to one of them. Shared
 * with the editor's pre-publish check, which warns when a page has more
 * than one (only one can be the page's main heading).
 */
export const PAGE_OPENING_TYPES: ReadonlySet<string> = new Set([
  'hero',
  'pageHeader',
]);

const PageHeadingContext = createContext<'h1' | 'h2'>('h1');

export const PageHeadingProvider = PageHeadingContext.Provider;

/** The heading level this page-opening section should render. */
export function usePageOpeningHeading(): 'h1' | 'h2' {
  return useContext(PageHeadingContext);
}
