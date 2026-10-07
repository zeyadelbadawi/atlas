/**
 * The Academy's identity (name, logo) for anything inside the website
 * chrome — sections, auth frames — that wants to set it in its design
 * (Riwaq's crest, Theme 4 plan §4) without each section re-fetching it.
 *
 * `WebsiteChrome` provides it; it adds no markup. Outside the chrome (a
 * single section previewed on its own) the name is empty and a design
 * that needs it simply leaves that element out.
 */
import { createContext, useContext } from 'react';

export interface WebsiteIdentity {
  readonly name: string;
  readonly logo?: string;
}

const EMPTY_IDENTITY: WebsiteIdentity = { name: '' };

const WebsiteIdentityContext = createContext<WebsiteIdentity>(EMPTY_IDENTITY);

export const WebsiteIdentityProvider = WebsiteIdentityContext.Provider;

export function useWebsiteIdentity(): WebsiteIdentity {
  return useContext(WebsiteIdentityContext);
}
