/**
 * Renders a theme only once its pack (code and stylesheet) is available
 * (`theme-pack.loader.ts`), and starts loading it otherwise.
 *
 * On the public site the pack is loaded before the first render — by the
 * server renderer, and by `main.tsx` before it hydrates — so the gate
 * passes straight through and server and browser render the same markup.
 * It only shows its fallback where nothing preloaded the theme: dashboard
 * previews, and a public page the server did not render.
 *
 * A pack that fails to load is thrown during render, to the nearest error
 * boundary, as `React.lazy` does.
 */
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { WebsiteThemeKey } from '@types';
import {
  getLoadedThemePack,
  loadThemePack,
  resolveThemePackKey,
  subscribeToThemePacks,
  themePackLoadError,
} from './theme-pack.loader';
import type { ThemePack } from './theme-pack.types';

/**
 * Collects the themes a render used — the server renderer provides one per
 * page, links their stylesheets in the head and tells the browser which
 * packs to load before hydrating. Absent (null) in the browser.
 */
export const ThemePackUsageContext = createContext<Set<WebsiteThemeKey> | null>(
  null
);

/**
 * The theme's pack if it has loaded; re-renders when it does. Never starts
 * a load. Records the theme as used by this render (server renderer).
 */
export function useLoadedThemePack(
  themeKey: string | undefined
): ThemePack | undefined {
  const key =
    themeKey === undefined ? undefined : resolveThemePackKey(themeKey);
  const usage = useContext(ThemePackUsageContext);
  if (key) usage?.add(key);
  const read = () => (key ? getLoadedThemePack(key) : undefined);
  return useSyncExternalStore(subscribeToThemePacks, read, read);
}

/** The theme's pack once it has loaded (`undefined` until then); starts the load. */
export function useThemePackLoader(themeKey: string): ThemePack | undefined {
  const key = resolveThemePackKey(themeKey);
  const pack = useLoadedThemePack(key);
  const readError = () => themePackLoadError(key);
  const error = useSyncExternalStore(
    subscribeToThemePacks,
    readError,
    readError
  );
  const failed = error !== undefined;
  useEffect(() => {
    if (!pack && !failed) loadThemePack(key).catch(() => undefined);
  }, [key, pack, failed]);
  if (failed) throw error;
  return pack;
}

export interface ThemePackGateProps {
  readonly themeKey: string;
  /** Shown while the pack loads. */
  readonly fallback?: ReactNode;
  readonly children: ReactNode;
}

export function ThemePackGate({
  themeKey,
  fallback = null,
  children,
}: ThemePackGateProps): JSX.Element {
  const pack = useThemePackLoader(themeKey);
  return <>{pack ? children : fallback}</>;
}
