/**
 * Application root.
 *
 * Deliberately minimal: it composes the provider stack with the router and
 * nothing else. Every concern lives in a dedicated layer, so this file is not
 * expected to change as modules are added in later prompts.
 */
import { BrowserRouter } from 'react-router-dom';
import { AppProviders } from '@app/providers';
import { AppRouter } from '@app/routes';
import {
  CookieConsentBanner,
  CookieConsentProvider,
  CookiePreferencesDialog,
} from '@features/legal';

export default function App(): JSX.Element {
  return (
    <AppProviders>
      <BrowserRouter>
        {/*
          Consent sits INSIDE the router, not in `AppProviders`, because the
          preferences dialog links to the Privacy Policy — someone deciding
          what to consent to must be able to read what they are consenting
          to. A `<Link>` outside a router throws.

          The banner and dialog are mounted once here rather than per layout
          so the choice is offered on every surface, including the tenant and
          academy public sites, which do not use `PublicLayout`.
        */}
        <CookieConsentProvider>
          <AppRouter />
          <CookieConsentBanner />
          <CookiePreferencesDialog />
        </CookieConsentProvider>
      </BrowserRouter>
    </AppProviders>
  );
}
