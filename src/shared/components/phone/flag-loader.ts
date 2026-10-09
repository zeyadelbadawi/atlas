/**
 * Loads every flag SVG (as strings) in ONE lazy chunk, once, the first time
 * any flag is needed. See `CountryFlag.tsx` for why.
 */
export type FlagStrings = Readonly<Record<string, string>>;

let flagsPromise: Promise<FlagStrings> | null = null;
let loadedFlags: FlagStrings | null = null;

export function loadFlags(): Promise<FlagStrings> {
  if (!flagsPromise) {
    flagsPromise = import('country-flag-icons/string/3x2')
      .then((module) => {
        loadedFlags = module as unknown as FlagStrings;
        return loadedFlags;
      })
      .catch((error: unknown) => {
        // Let a later render try again (e.g. after a flaky connection).
        flagsPromise = null;
        throw error;
      });
  }
  return flagsPromise;
}

export function getLoadedFlags(): FlagStrings | null {
  return loadedFlags;
}

/** Starts loading the flags early (e.g. when a phone field mounts), without rendering any. */
export function preloadCountryFlags(): void {
  void loadFlags().catch(() => undefined);
}
