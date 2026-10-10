/**
 * The favicon chosen in the setup form. Unlike the logo it is not part of
 * the provisioning request: once the Academy is ready it is saved with the
 * ordinary branding update (`PATCH /academies/:id/branding`, which accepts a
 * PNG/ICO data URL), the same call the Brand settings page makes.
 *
 * Kept in memory only, like the logo file. If the page is closed before the
 * Academy is ready, nothing is saved and the owner can add the favicon later
 * in Brand settings; nothing pretends it was saved.
 */
export type PendingFaviconState = 'waiting' | 'saving' | 'failed' | 'saved';

interface Entry {
  readonly file: File;
  state: PendingFaviconState;
}

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
let version = 0;

function emit(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

export const pendingFaviconStore = {
  set(requestId: string, file: File): void {
    entries.set(requestId, { file, state: 'waiting' });
    emit();
  },
  get(
    requestId: string
  ): { readonly file: File; readonly state: PendingFaviconState } | undefined {
    return entries.get(requestId);
  },
  transition(requestId: string, state: PendingFaviconState): void {
    const entry = entries.get(requestId);
    if (!entry) return;
    entry.state = state;
    emit();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  version(): number {
    return version;
  },
};
