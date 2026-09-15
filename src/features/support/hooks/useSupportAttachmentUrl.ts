/**
 * P53 — turns an authenticated attachment path into something `<img>` can
 * actually render.
 *
 * THE PROBLEM THIS SOLVES. A ticket attachment is private, so its route
 * requires the session's bearer token. A browser fetching `<img
 * src="/api/v1/support-cases/attachments/…">` sends no Authorization
 * header and gets a 401 — a broken image in the customer's conversation.
 * So the bytes are fetched through `apiClient` (which attaches the token
 * and, on a 401, refreshes and retries via the shared interceptor) and
 * handed to the DOM as an object URL.
 *
 * THE OBJECT URL IS REVOKED ON UNMOUNT. An un-revoked `blob:` URL pins its
 * Blob in memory for the lifetime of the document; a long support thread
 * with several screenshots, revisited across a session, would leak all of
 * them. The cleanup revokes the URL this effect created, and the
 * `cancelled` flag stops a late response from setting state on an unmounted
 * component or stranding a URL nothing will revoke.
 *
 * ONE HOOK FOR BOTH SIDES. The requester's page and the Platform Owner's
 * page render the same component against the same route; which rows exist
 * is the backend's RLS decision, never a branch here.
 */
import { useEffect, useState } from 'react';
import { mySupportService } from '../services/SupportService';

export type SupportAttachmentUrlState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly objectUrl: string }
  | { readonly status: 'failed' };

export function useSupportAttachmentUrl(
  attachmentUrl: string
): SupportAttachmentUrlState {
  const [state, setState] = useState<SupportAttachmentUrlState>({
    status: 'loading',
  });

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | undefined;

    setState({ status: 'loading' });

    mySupportService
      .getAttachmentBlob(attachmentUrl)
      .then((blob) => {
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setState({ status: 'ready', objectUrl: createdUrl });
      })
      .catch(() => {
        if (cancelled) return;
        // Deliberately one state for every failure. A 404 (the row is not
        // visible to this caller) and a network error are both "this image
        // cannot be shown"; distinguishing them in the UI would tell a
        // caller whether an id they cannot read nonetheless exists.
        setState({ status: 'failed' });
      });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [attachmentUrl]);

  return state;
}
