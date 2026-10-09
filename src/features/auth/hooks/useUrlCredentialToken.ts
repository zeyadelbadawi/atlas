/**
 * ATO review F12 — reads a credential (a password-reset or setup token)
 * from the page URL ONCE, then removes it from the address bar.
 *
 * Left in place, `?token=` stays in the browser history and session
 * restore of a shared or untrusted machine long after the reset is done.
 * The value is kept in component state, so the page keeps working after
 * the URL is cleaned; every other query parameter (`setup=1`, …) stays.
 * `history.replaceState` changes the address without a navigation or a
 * new history entry, so the router does not re-render the page.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useUrlCredentialToken(param = 'token'): string | null {
  const [searchParams] = useSearchParams();
  const [token] = useState<string | null>(() => searchParams.get(param));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has(param)) return;
    url.searchParams.delete(param);
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`
    );
  }, [param]);

  return token;
}
