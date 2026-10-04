/**
 * W2 — the one thing from the setup form that cannot travel with the
 * provisioning request: the logo FILE. Media assets belong to an Academy,
 * and the Academy only exists once the request's `academy` step has run.
 *
 * Everything else (the palette, the fact that a logo is coming) is on the
 * request itself, server-side, and survives a refresh. The file waits here,
 * in memory, for the second or so until `academyId` appears; then
 * `usePendingLogoUpload` uploads it to the new Academy's media library and
 * attaches it to the request by media-asset id. If the page is closed first,
 * the server still knows a logo was wanted (`requestedBrand.logo ===
 * 'awaiting_upload'`) and the status page says so honestly, with a link to
 * add it in Brand settings — nothing pretends it was saved.
 *
 * A tiny external store (`useSyncExternalStore`), so every surface showing
 * the same request (the onboarding progress panel and its "ready" panel,
 * a second mount) sees one upload — never two concurrent uploads of the
 * same file (the old per-hook-instance guard allowed exactly that).
 */
export type PendingLogoState = 'waiting' | 'uploading' | 'failed';

interface Entry {
  readonly file: File;
  state: PendingLogoState;
}

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
let version = 0;

function emit(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

export const pendingLogoStore = {
  set(requestId: string, file: File): void {
    entries.set(requestId, { file, state: 'waiting' });
    emit();
  },
  get(
    requestId: string
  ): { readonly file: File; readonly state: PendingLogoState } | undefined {
    return entries.get(requestId);
  },
  /** Moves an entry to `state`; returns `false` if there is none. */
  transition(requestId: string, state: PendingLogoState): boolean {
    const entry = entries.get(requestId);
    if (!entry) return false;
    entry.state = state;
    emit();
    return true;
  },
  clear(requestId: string): void {
    if (entries.delete(requestId)) emit();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Changes whenever any entry changes — the `useSyncExternalStore` snapshot. */
  version(): number {
    return version;
  },
};
