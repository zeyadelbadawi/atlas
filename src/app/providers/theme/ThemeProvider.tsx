/**
 * Theme Provider.
 *
 * Owns theme preference, persistence and the document side effects that apply
 * a theme. Light Mode and Dark Mode are both primary experiences; `system`
 * follows the operating system and keeps following it while the app is open.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { APP_CONFIG } from "@config";
import { STORAGE_KEYS } from "@constants";
import { THEME_PREFERENCES } from "@types";
import type { ResolvedTheme, ThemePreference } from "@types";
import { readStoredValue, writeStoredValue } from "@utils";
import { ThemeContext } from "./theme.context";
import type { ThemeContextValue } from "./theme.context";

/** Class applied to the document root when Dark Mode is active. */
const DARK_MODE_CLASS = "dark";

/** Media query used to resolve the `system` preference. */
const DARK_MODE_QUERY = "(prefers-color-scheme: dark)";

function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === "string" &&
    (THEME_PREFERENCES as readonly string[]).includes(value)
  );
}

/** Reads the persisted preference, falling back to the configured default. */
function readStoredPreference(): ThemePreference {
  const stored = readStoredValue<unknown>(
    STORAGE_KEYS.theme,
    APP_CONFIG.defaultTheme,
  );
  return isThemePreference(stored) ? stored : APP_CONFIG.defaultTheme;
}

/** Reads the operating system colour scheme. */
function readSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia(DARK_MODE_QUERY).matches ? "dark" : "light";
}

/** Resolves a preference into the theme actually applied. */
function resolveTheme(
  preference: ThemePreference,
  systemTheme: ResolvedTheme,
): ResolvedTheme {
  return preference === "system" ? systemTheme : preference;
}

export interface AtlasThemeProviderProps {
  readonly children: ReactNode;
}

export function AtlasThemeProvider({
  children,
}: AtlasThemeProviderProps): JSX.Element {
  const [preference, setPreferenceState] =
    useState<ThemePreference>(readStoredPreference);
  const [systemTheme, setSystemTheme] =
    useState<ResolvedTheme>(readSystemTheme);

  const resolvedTheme = resolveTheme(preference, systemTheme);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    // Tracked continuously so `system` stays correct without a reload.
    const mediaQueryList = window.matchMedia(DARK_MODE_QUERY);
    const handleChange = (event: MediaQueryListEvent): void =>
      setSystemTheme(event.matches ? "dark" : "light");

    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle(DARK_MODE_CLASS, resolvedTheme === "dark");
    // Lets the browser theme native controls such as scrollbars and inputs.
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    writeStoredValue(STORAGE_KEYS.theme, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolvedTheme, setPreference, toggleTheme }),
    [preference, resolvedTheme, setPreference, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
